// Service de gestion des codes promotionnels.
import { supabase } from "./supabase";

export type PromoCode = {
  id: number;
  code: string;
  discount_percent: number;
  valid_from: string;
  valid_until?: string;
  max_uses?: number;
  times_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Vérifie qu’un code promotionnel peut être appliqué.
export async function validatePromoCode(code: string): Promise<{
  valid: boolean;
  message: string;
  percentOff?: number;
  id?: number;
}> {
  const cleanCode = code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", cleanCode)
    .single();

  if (error || !data) {
    return { valid: false, message: "Code promotionnel introuvable." };
  }

  const promo = data as PromoCode;

  // Vérifie si le code est actif.
  if (!promo.is_active) {
    return { valid: false, message: "Ce code promotionnel est désactivé." };
  }

  // Vérifie la période de validité.
  const now = new Date();
  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return {
      valid: false,
      message: "Ce code promotionnel n’est pas encore valide.",
    };
  }
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return { valid: false, message: "Ce code promotionnel a expiré." };
  }

  // Vérifie le nombre maximal d’utilisations.
  if (promo.max_uses && promo.times_used >= promo.max_uses) {
    return {
      valid: false,
      message: "Ce code promotionnel a atteint sa limite d’utilisation.",
    };
  }

  return {
    valid: true,
    message: `Code promotionnel appliqué : -${promo.discount_percent} %`,
    percentOff: promo.discount_percent,
    id: promo.id,
  };
}

// Récupère tous les codes promotionnels pour l’administration.
export async function getAllPromoCodes(): Promise<PromoCode[]> {
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as PromoCode[];
}

// Crée un code promotionnel depuis l’administration.
export async function createPromoCode(
  promo: Omit<PromoCode, "id" | "times_used" | "created_at" | "updated_at">,
) {
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      ...promo,
      code: promo.code.toUpperCase(),
      times_used: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Met à jour un code promotionnel depuis l’administration.
export async function updatePromoCode(
  id: number,
  updates: Partial<Omit<PromoCode, "id" | "created_at" | "updated_at">>,
) {
  const { data, error } = await supabase
    .from("promo_codes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Supprime un code promotionnel depuis l’administration.
export async function deletePromoCode(id: number) {
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);

  if (error) throw error;
}
