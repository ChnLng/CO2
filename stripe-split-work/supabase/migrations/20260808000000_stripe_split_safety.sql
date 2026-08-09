-- Stripe Checkout + reprise sûre des répartitions 50/50.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_checkout_session_id_key
  ON orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

ALTER TABLE dividend_distributions
  ADD COLUMN IF NOT EXISTS fund_ids BIGINT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS net_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Une seule répartition peut être en cours. En cas de coupure après le premier
-- transfert, la prochaine tentative reprend le même lot et la même clé Stripe.
CREATE UNIQUE INDEX IF NOT EXISTS dividend_one_processing_batch
  ON dividend_distributions ((status))
  WHERE status = 'processing';

COMMENT ON COLUMN dividend_distributions.net_breakdown IS
  'Net Stripe par commande au moment de la répartition, en centimes.';

COMMENT ON COLUMN dividend_distributions.fund_ids IS
  'Entrées fund_pool incluses dans cette répartition.';

-- Le webhook peut être livré plusieurs fois ou en parallèle. Cette fonction
-- applique toutes les écritures d'un paiement dans une seule transaction :
-- commande payée, fonds gelés 14 jours et compteur du code promotionnel.
CREATE OR REPLACE FUNCTION record_paid_stripe_checkout(
  p_order_id BIGINT,
  p_payment_intent_id TEXT,
  p_session_id TEXT,
  p_paid_amount NUMERIC,
  p_paid_at TIMESTAMPTZ,
  p_frozen_until TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo_code_id BIGINT;
BEGIN
  UPDATE orders
  SET status = 'paid',
      stripe_payment_intent_id = p_payment_intent_id,
      stripe_checkout_session_id = p_session_id,
      paid_at = p_paid_at
  WHERE id = p_order_id
    AND stripe_payment_intent_id IS NULL
  RETURNING promo_code_id INTO v_promo_code_id;

  -- Un autre envoi du même événement a déjà effectué toutes les écritures.
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO fund_pool (order_id, amount, status, frozen_until)
  VALUES (p_order_id, p_paid_amount, 'frozen', p_frozen_until);

  IF v_promo_code_id IS NOT NULL THEN
    UPDATE promo_codes
    SET times_used = COALESCE(times_used, 0) + 1
    WHERE id = v_promo_code_id;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION record_paid_stripe_checkout(
  BIGINT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_paid_stripe_checkout(
  BIGINT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ
) TO service_role;
