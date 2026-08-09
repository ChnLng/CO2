// site/src/lib/api.ts
import { supabase } from "./supabase";

// 1. Récupérer tous les produits (lecture publique).
export const fetchProducts = async () => {
  const { data, error } = await supabase.from("products").select("*");
  if (error) throw error;
  return data;
};

// 2. Récupérer les garanties de l’utilisateur connecté (lecture protégée).
export const getMyWarranties = async () => {
  const { data, error } = await supabase.from("warranties").select("*");
  if (error) throw error;
  return data;
};
