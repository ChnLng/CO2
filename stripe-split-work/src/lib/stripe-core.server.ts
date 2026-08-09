import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { EDITIONS } from "@/components/site/editions";

const STRIPE_API_VERSION = "2025-02-24.acacia" as const;
const DISTRIBUTION_CURRENCY = "eur";
const FUND_HOLD_DAYS = 14;

type CheckoutInput = {
  accessToken?: string;
  items: Array<{ editionId: string; quantity: number }>;
  promoCode?: string | null;
  shipping: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
};

type AdminInput = { accessToken: string };
type RefundInput = AdminInput & { refundId: number; approve: boolean };
type OnboardingInput = AdminInput;

type ConnectAccountStatus = {
  configured: boolean;
  account: string;
  transfersActive: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  error?: string;
};

type NetFund = {
  fundId: number;
  orderId: number;
  netCents: number;
  paymentIntentId: string;
};

type DistributionRow = {
  id: number;
  total_amount: number;
  admin1_share: number;
  admin2_share: number;
  admin1_stripe_transfer_id: string | null;
  admin2_stripe_transfer_id: string | null;
  status: string;
  fund_ids: number[];
  net_breakdown: NetFund[];
  error_message: string | null;
};

type FundRow = {
  id: number;
  order_id: number;
  amount: number;
  orders:
    | {
        id: number;
        status: string;
        stripe_payment_intent_id: string | null;
      }
    | Array<{
        id: number;
        status: string;
        stripe_payment_intent_id: string | null;
      }>
    | null;
};

function env(name: string): string {
  const value = process.env[name] ?? import.meta.env[name];
  if (!value || value.includes("placeholder")) {
    throw new Error(`Configuration manquante : ${name} 配置缺失`);
  }
  return value;
}

function optionalEnv(name: string): string | null {
  const value = process.env[name] ?? import.meta.env[name];
  return value && !value.includes("placeholder") ? value : null;
}

function getStripe(): Stripe {
  return new Stripe(env("STRIPE_SECRET_KEY"), {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function getServiceDatabase(): SupabaseClient {
  return createClient(
    env("VITE_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

function getAuthDatabase(accessToken: string): SupabaseClient {
  return createClient(env("VITE_SUPABASE_URL"), env("VITE_SUPABASE_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function requireAdmin({ accessToken }: AdminInput) {
  if (!accessToken)
    throw new Error("Session administrateur requise 需要管理员登录");

  const authDatabase = getAuthDatabase(accessToken);
  const { data: userData, error: userError } =
    await authDatabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    throw new Error("Session expirée 请重新登录");
  }

  const database = getServiceDatabase();
  const { data: profile, error: profileError } = await database
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    throw new Error("Accès administrateur refusé 管理员权限不足");
  }

  return { database, user: userData.user };
}

function stripeSlotForEmail(email: string | null | undefined): 1 | 2 | null {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === optionalEnv("STRIPE_ADMIN_1_EMAIL")?.toLowerCase())
    return 1;
  if (normalized === optionalEnv("STRIPE_ADMIN_2_EMAIL")?.toLowerCase())
    return 2;
  return null;
}

async function requireStripeSplitAdmin(input: AdminInput) {
  const auth = await requireAdmin(input);
  const slot = stripeSlotForEmail(auth.user.email);
  if (!slot) {
    throw new Error(
      "Aucun compte Stripe personnel attribué 此管理员尚未分配 Stripe 收款账户",
    );
  }
  return { ...auth, slot };
}

function centsToEuros(cents: number): number {
  return Math.round(cents) / 100;
}

function eurosToCents(euros: number): number {
  return Math.round(Number(euros) * 100);
}

function maskAccount(account: string | null): string {
  if (!account) return "Non configuré 未配置";
  return `${account.slice(0, 7)}…${account.slice(-4)}`;
}

function shippingCents(country: string): number {
  const rates: Record<string, number> = {
    France: 0,
    Belgique: 990,
    Belgium: 990,
    Luxembourg: 990,
    Allemagne: 1490,
    Deutschland: 1490,
    Germany: 1490,
    Suisse: 1990,
    Switzerland: 1990,
    Espagne: 1490,
    Spain: 1490,
    Italie: 1490,
    Italy: 1490,
    Portugal: 1490,
    "Royaume-Uni": 1990,
    UK: 1990,
    "United Kingdom": 1990,
  };
  return rates[country] ?? 2990;
}

function validateCheckout(input: CheckoutInput) {
  const shipping = input.shipping;
  if (
    !shipping?.name?.trim() ||
    !shipping.email?.trim() ||
    !shipping.phone?.trim() ||
    !shipping.address?.trim() ||
    !shipping.city?.trim() ||
    !shipping.postalCode?.trim() ||
    !shipping.country?.trim()
  ) {
    throw new Error(
      "Tous les champs de livraison sont obligatoires 所有配送信息均为必填",
    );
  }
  if (!/^\S+@\S+\.\S+$/.test(shipping.email)) {
    throw new Error("Adresse e-mail invalide 邮箱格式无效");
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Le panier est vide 购物车为空");
  }
  if (
    input.items.some(
      (item) =>
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 10 ||
        !EDITIONS.some((edition) => edition.id === item.editionId),
    )
  ) {
    throw new Error("Contenu du panier invalide 购物车内容无效");
  }
}

export async function createCheckoutSessionCore(
  input: CheckoutInput,
  origin: string,
) {
  validateCheckout(input);
  const stripe = getStripe();
  const database = getServiceDatabase();

  let userId: string | null = null;
  if (input.accessToken) {
    const authDatabase = getAuthDatabase(input.accessToken);
    const { data } = await authDatabase.auth.getUser(input.accessToken);
    userId = data.user?.id ?? null;
  }

  const trustedItems = input.items.map((item) => {
    const editionIndex = EDITIONS.findIndex(
      (edition) => edition.id === item.editionId,
    );
    const edition = EDITIONS[editionIndex];
    if (!edition) throw new Error("Produit introuvable 找不到产品");
    return {
      productId: editionIndex + 1,
      name: edition.name,
      unitCents: eurosToCents(edition.price),
      quantity: item.quantity,
    };
  });

  const subtotalCents = trustedItems.reduce(
    (sum, item) => sum + item.unitCents * item.quantity,
    0,
  );

  let promoId: number | null = null;
  let discountPercent = 0;
  const cleanPromo = input.promoCode?.trim().toUpperCase();
  if (cleanPromo) {
    const { data: promo } = await database
      .from("promo_codes")
      .select(
        "id, discount_percent, valid_from, valid_until, max_uses, times_used, is_active",
      )
      .eq("code", cleanPromo)
      .maybeSingle();
    const now = Date.now();
    const valid =
      promo?.is_active === true &&
      (!promo.valid_from || new Date(promo.valid_from).getTime() <= now) &&
      (!promo.valid_until || new Date(promo.valid_until).getTime() >= now) &&
      (!promo.max_uses ||
        Number(promo.times_used ?? 0) < Number(promo.max_uses));
    if (!valid)
      throw new Error(
        "Code promotionnel invalide ou expiré 优惠码无效或已过期",
      );
    promoId = Number(promo.id);
    discountPercent = Math.min(
      100,
      Math.max(0, Number(promo.discount_percent)),
    );
  }

  const discountCents = Math.round((subtotalCents * discountPercent) / 100);
  const deliveryCents = shippingCents(input.shipping.country);
  const totalCents = subtotalCents - discountCents + deliveryCents;
  if (totalCents < 50)
    throw new Error("Montant de commande invalide 订单金额无效");

  const { data: order, error: orderError } = await database
    .from("orders")
    .insert({
      user_id: userId,
      subtotal: centsToEuros(subtotalCents),
      shipping_cost: centsToEuros(deliveryCents),
      discount_amount: centsToEuros(discountCents),
      tax_amount: 0,
      total_amount: centsToEuros(totalCents),
      promo_code_id: promoId,
      status: "pending",
      shipping_name: input.shipping.name.trim(),
      shipping_email: input.shipping.email.trim(),
      shipping_phone: input.shipping.phone.trim(),
      shipping_address: input.shipping.address.trim(),
      shipping_city: input.shipping.city.trim(),
      shipping_postal_code: input.shipping.postalCode.trim(),
      shipping_country: input.shipping.country.trim(),
    })
    .select("id")
    .single();
  if (orderError || !order)
    throw new Error(
      orderError?.message ?? "Création de commande impossible 无法创建订单",
    );

  const orderItems = trustedItems.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: item.name,
    product_price: centsToEuros(item.unitCents),
    quantity: item.quantity,
  }));

  const { error: itemError } = await database
    .from("order_items")
    .insert(orderItems);
  if (itemError) throw new Error(itemError.message);

  const { error: shippingError } = await database
    .from("shipping_info")
    .insert({ order_id: order.id, status: "preparing" });
  if (shippingError) throw new Error(shippingError.message);

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      locale: "fr",
      customer_email: input.shipping.email.trim(),
      client_reference_id: String(order.id),
      metadata: { order_id: String(order.id) },
      payment_intent_data: {
        metadata: { order_id: String(order.id) },
        transfer_group: `order_${order.id}`,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: DISTRIBUTION_CURRENCY,
            unit_amount: totalCents,
            product_data: {
              name: `Commande Jasper #${order.id}`,
              description: trustedItems
                .map((item) => `${item.name} × ${item.quantity}`)
                .join(", "),
            },
          },
        },
      ],
      success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { idempotencyKey: `checkout_order_${order.id}` },
  );

  await database
    .from("orders")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", order.id);

  if (!session.url)
    throw new Error(
      "URL de paiement Stripe indisponible Stripe 支付链接不可用",
    );
  return { url: session.url, orderId: Number(order.id) };
}

async function accountStatus(
  stripe: Stripe,
  accountId: string | null,
): Promise<ConnectAccountStatus> {
  if (!accountId) {
    return {
      configured: false,
      account: maskAccount(null),
      transfersActive: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    };
  }
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return {
      configured: true,
      account: maskAccount(accountId),
      transfersActive: account.capabilities?.transfers === "active",
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  } catch (error) {
    return {
      configured: true,
      account: maskAccount(accountId),
      transfersActive: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      error:
        error instanceof Error
          ? error.message
          : "Compte Stripe inaccessible Stripe 账号不可访问",
    };
  }
}

export async function getStripeConnectStatusCore(input: AdminInput) {
  const { slot } = await requireStripeSplitAdmin(input);
  const stripe = getStripe();
  const admin1 = optionalEnv("STRIPE_CONNECT_ACCOUNT_1");
  const admin2 = optionalEnv("STRIPE_CONNECT_ACCOUNT_2");
  const [account1, account2, balance] = await Promise.all([
    accountStatus(stripe, admin1),
    accountStatus(stripe, admin2),
    stripe.balance.retrieve(),
  ]);
  const availableCents = balance.available
    .filter((entry) => entry.currency === DISTRIBUTION_CURRENCY)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const secret = env("STRIPE_SECRET_KEY");
  const ownAccount = slot === 1 ? account1 : account2;
  const otherAccount = slot === 1 ? account2 : account1;
  return {
    mode: secret.startsWith("sk_live_") ? "live" : "test",
    ready:
      account1.configured &&
      account2.configured &&
      account1.transfersActive &&
      account2.transfersActive,
    availableBalance: centsToEuros(availableCents),
    slot,
    ownAccount,
    otherReady: otherAccount.configured && otherAccount.transfersActive,
  };
}

export async function createStripeConnectOnboardingLinkCore(
  input: OnboardingInput,
  origin: string,
) {
  const { slot } = await requireStripeSplitAdmin(input);
  const accountId = env(
    slot === 1 ? "STRIPE_CONNECT_ACCOUNT_1" : "STRIPE_CONNECT_ACCOUNT_2",
  );
  const stripe = getStripe();
  const status = await accountStatus(stripe, accountId);
  if (status.transfersActive) {
    throw new Error("Compte déjà activé 账号已经启用");
  }

  const query = `stripe_onboarding=return&account=${slot}`;
  const refreshQuery = `stripe_onboarding=refresh&account=${slot}`;
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: `${origin}/admin?${query}`,
    refresh_url: `${origin}/admin?${refreshQuery}`,
  });
  return { url: link.url };
}

async function resolveNetFunds(
  stripe: Stripe,
  funds: FundRow[],
): Promise<NetFund[]> {
  const results: NetFund[] = [];
  for (const fund of funds) {
    const order = Array.isArray(fund.orders) ? fund.orders[0] : fund.orders;
    const paymentIntentId = order?.stripe_payment_intent_id;
    if (
      !paymentIntentId ||
      !["paid", "shipped", "delivered"].includes(order?.status)
    ) {
      throw new Error(
        `Commande #${fund.order_id} non payée ou sans paiement Stripe 订单未完成 Stripe 支付`,
      );
    }
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      {
        expand: ["latest_charge.balance_transaction"],
      },
    );
    const charge = paymentIntent.latest_charge;
    if (
      !charge ||
      typeof charge === "string" ||
      charge.currency !== DISTRIBUTION_CURRENCY
    ) {
      throw new Error(
        `Paiement Stripe incomplet pour la commande #${fund.order_id} 订单支付信息不完整`,
      );
    }
    const balanceTransaction = charge.balance_transaction;
    if (!balanceTransaction || typeof balanceTransaction === "string") {
      throw new Error(
        `Montant net Stripe introuvable pour la commande #${fund.order_id} 找不到 Stripe 净额`,
      );
    }
    const refundedRatio =
      charge.amount > 0 ? charge.amount_refunded / charge.amount : 1;
    const remainingNet = Math.max(
      0,
      Math.round(balanceTransaction.net * (1 - refundedRatio)),
    );
    if (remainingNet === 0) continue;
    results.push({
      fundId: Number(fund.id),
      orderId: Number(fund.order_id),
      netCents: remainingNet,
      paymentIntentId,
    });
  }
  return results;
}

async function resumeOrCreateDistribution(
  database: SupabaseClient,
  stripe: Stripe,
) {
  const { data: existing, error: existingError } = await database
    .from("dividend_distributions")
    .select("*")
    .eq("status", "processing")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing as DistributionRow;

  const now = new Date().toISOString();
  await database
    .from("fund_pool")
    .update({ status: "available", released_at: now })
    .eq("status", "frozen")
    .lte("frozen_until", now);

  const { data: funds, error: fundsError } = await database
    .from("fund_pool")
    .select(
      "id, order_id, amount, orders (id, status, stripe_payment_intent_id)",
    )
    .eq("status", "available")
    .is("distributed_at", null)
    .order("id", { ascending: true });
  if (fundsError) throw new Error(fundsError.message);
  if (!funds?.length)
    throw new Error("Aucun fonds arrivé à échéance 暂无到期可分配资金");

  const netBreakdown = await resolveNetFunds(stripe, funds);
  const totalCents = netBreakdown.reduce((sum, fund) => sum + fund.netCents, 0);
  if (totalCents <= 0)
    throw new Error(
      "Aucun montant net Stripe distribuable 暂无可分配 Stripe 净额",
    );
  const admin1Cents = Math.floor(totalCents / 2);
  const admin2Cents = totalCents - admin1Cents;

  const { data: created, error: createError } = await database
    .from("dividend_distributions")
    .insert({
      total_amount: centsToEuros(totalCents),
      admin1_share: centsToEuros(admin1Cents),
      admin2_share: centsToEuros(admin2Cents),
      status: "processing",
      notes: "Répartition Stripe nette 50 % 50 %  Stripe 净入账五五分成",
      fund_ids: netBreakdown.map((fund) => fund.fundId),
      net_breakdown: netBreakdown,
      error_message: null,
    })
    .select("*")
    .single();

  if (createError) {
    const { data: concurrent } = await database
      .from("dividend_distributions")
      .select("*")
      .eq("status", "processing")
      .limit(1)
      .maybeSingle();
    if (concurrent) return concurrent as DistributionRow;
    throw new Error(createError.message);
  }
  return created as DistributionRow;
}

export async function distributeAvailableFundsCore(input: AdminInput) {
  const { database } = await requireStripeSplitAdmin(input);
  const stripe = getStripe();
  const admin1Account = env("STRIPE_CONNECT_ACCOUNT_1");
  const admin2Account = env("STRIPE_CONNECT_ACCOUNT_2");

  const [status1, status2] = await Promise.all([
    accountStatus(stripe, admin1Account),
    accountStatus(stripe, admin2Account),
  ]);
  if (!status1.transfersActive || !status2.transfersActive) {
    throw new Error(
      "Les deux comptes Stripe Connect doivent activer les transferts 两个 Stripe Connect 账号都必须启用转账",
    );
  }

  let distribution = await resumeOrCreateDistribution(database, stripe);
  const distributionId = Number(distribution.id);
  const admin1Cents = eurosToCents(distribution.admin1_share);
  const admin2Cents = eurosToCents(distribution.admin2_share);

  try {
    if (!distribution.admin1_stripe_transfer_id && admin1Cents > 0) {
      const transfer = await stripe.transfers.create(
        {
          amount: admin1Cents,
          currency: DISTRIBUTION_CURRENCY,
          destination: admin1Account,
          transfer_group: `distribution_${distributionId}`,
          metadata: { distribution_id: String(distributionId), admin: "1" },
        },
        { idempotencyKey: `distribution_${distributionId}_admin_1` },
      );
      const { data } = await database
        .from("dividend_distributions")
        .update({ admin1_stripe_transfer_id: transfer.id, error_message: null })
        .eq("id", distributionId)
        .select("*")
        .single();
      distribution = data as DistributionRow;
    }

    if (!distribution.admin2_stripe_transfer_id && admin2Cents > 0) {
      const transfer = await stripe.transfers.create(
        {
          amount: admin2Cents,
          currency: DISTRIBUTION_CURRENCY,
          destination: admin2Account,
          transfer_group: `distribution_${distributionId}`,
          metadata: { distribution_id: String(distributionId), admin: "2" },
        },
        { idempotencyKey: `distribution_${distributionId}_admin_2` },
      );
      const { data } = await database
        .from("dividend_distributions")
        .update({ admin2_stripe_transfer_id: transfer.id, error_message: null })
        .eq("id", distributionId)
        .select("*")
        .single();
      distribution = data as DistributionRow;
    }

    if (
      !distribution.admin1_stripe_transfer_id ||
      !distribution.admin2_stripe_transfer_id
    ) {
      throw new Error("Transfert Stripe incomplet Stripe 转账未完成");
    }

    const completedAt = new Date().toISOString();
    const { error: fundError } = await database
      .from("fund_pool")
      .update({ status: "distributed", distributed_at: completedAt })
      .in("id", distribution.fund_ids);
    if (fundError) throw new Error(fundError.message);

    const { error: distributionError } = await database
      .from("dividend_distributions")
      .update({
        status: "completed",
        distributed_at: completedAt,
        error_message: null,
      })
      .eq("id", distributionId);
    if (distributionError) throw new Error(distributionError.message);

    return {
      distributionId,
      total: Number(distribution.total_amount),
      admin1: Number(distribution.admin1_share),
      admin2: Number(distribution.admin2_share),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Échec du transfert Stripe Stripe 转账失败";
    await database
      .from("dividend_distributions")
      .update({ error_message: message })
      .eq("id", distributionId);
    throw new Error(message);
  }
}

export async function processStripeRefundCore(input: RefundInput) {
  const { database, user } = await requireStripeSplitAdmin(input);
  const { data: refund, error: refundError } = await database
    .from("refunds")
    .select("id, order_id, amount, status, orders (stripe_payment_intent_id)")
    .eq("id", input.refundId)
    .single();
  if (refundError || !refund)
    throw new Error("Demande de remboursement introuvable 找不到退款申请");
  if (refund.status !== "pending")
    throw new Error("Cette demande a déjà été traitée 此退款申请已处理");

  if (!input.approve) {
    const { error } = await database
      .from("refunds")
      .update({ status: "rejected", approved_by: null, approved_at: null })
      .eq("id", input.refundId);
    if (error) throw new Error(error.message);
    return { approved: false };
  }

  const { data: fund } = await database
    .from("fund_pool")
    .select("id, status")
    .eq("order_id", refund.order_id)
    .maybeSingle();
  if (fund?.status === "distributed") {
    throw new Error(
      "Fonds déjà distribués : inversez d’abord les transferts dans Stripe 资金已分配，请先在 Stripe 撤销转账",
    );
  }
  const order = Array.isArray(refund.orders) ? refund.orders[0] : refund.orders;
  if (!order?.stripe_payment_intent_id) {
    throw new Error("Paiement Stripe introuvable 找不到 Stripe 支付记录");
  }

  const stripe = getStripe();
  const stripeRefund = await stripe.refunds.create(
    {
      payment_intent: order.stripe_payment_intent_id,
      amount: eurosToCents(refund.amount),
      metadata: {
        refund_request_id: String(refund.id),
        order_id: String(refund.order_id),
      },
    },
    { idempotencyKey: `refund_request_${refund.id}` },
  );
  const completedAt = new Date().toISOString();
  const { error: updateError } = await database
    .from("refunds")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: completedAt,
      stripe_refund_id: stripeRefund.id,
    })
    .eq("id", refund.id);
  if (updateError) throw new Error(updateError.message);
  await database
    .from("orders")
    .update({ status: "refunded", refunded_at: completedAt })
    .eq("id", refund.order_id);
  if (fund) {
    await database
      .from("fund_pool")
      .update({ status: "refunded" })
      .eq("id", fund.id);
  }
  return { approved: true, stripeRefundId: stripeRefund.id };
}

export async function handleStripeWebhookCore(
  request: Request,
): Promise<Response> {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature)
    return new Response("Signature Stripe manquante", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      env("STRIPE_WEBHOOK_SECRET"),
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return new Response("Signature Stripe invalide", { status: 400 });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid")
    return Response.json({ received: true });
  const orderId = Number(
    session.metadata?.order_id ?? session.client_reference_id,
  );
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!Number.isInteger(orderId) || !paymentIntentId) {
    return new Response("Métadonnées de commande invalides", { status: 400 });
  }

  const database = getServiceDatabase();
  const { data: order, error: orderError } = await database
    .from("orders")
    .select("id, total_amount")
    .eq("id", orderId)
    .single();
  if (orderError || !order)
    return new Response("Commande introuvable", { status: 404 });

  const paidAt = new Date();
  const frozenUntil = new Date(paidAt);
  frozenUntil.setUTCDate(frozenUntil.getUTCDate() + FUND_HOLD_DAYS);
  const { error: recordError } = await database.rpc(
    "record_paid_stripe_checkout",
    {
      p_order_id: orderId,
      p_payment_intent_id: paymentIntentId,
      p_session_id: session.id,
      p_paid_amount: centsToEuros(
        session.amount_total ?? eurosToCents(order.total_amount),
      ),
      p_paid_at: paidAt.toISOString(),
      p_frozen_until: frozenUntil.toISOString(),
    },
  );
  if (recordError) throw new Error(recordError.message);

  return Response.json({ received: true });
}

export type { AdminInput, CheckoutInput, OnboardingInput, RefundInput };
