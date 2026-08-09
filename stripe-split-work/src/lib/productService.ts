// Service de produits.
import { supabase } from "./supabase";

// Récupère tous les produits.
export async function getProducts() {
  const { data, error } = await supabase.from("products").select("*");
  if (error) {
    console.error("Récupération des produits impossible :", error);
    return [];
  }
  return data || [];
}

// Ajoute un produit.
export async function addProduct(name: string, price: number) {
  const { data, error } = await supabase
    .from("products")
    .insert([{ name, price }])
    .select();

  if (error) {
    console.error("Ajout du produit impossible :", error);
    throw error;
  }
  return data;
}

// Met à jour le prix d’un produit.
export async function updateProductPrice(id: number, price: number) {
  const { error } = await supabase
    .from("products")
    .update({ price: price })
    .eq("id", id);

  if (error) {
    console.error("Mise à jour du prix impossible :", error);
    throw error;
  }
  return true;
}

// Supprime un produit.
export async function deleteProduct(id: number) {
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    console.error("Suppression du produit impossible :", error);
    throw error;
  }
  return true;
}

// Récupère les informations de garantie de l’utilisateur connecté.
// Les règles RLS rendent cette fonction disponible uniquement après connexion.
export async function getMyWarranties() {
  const { data, error } = await supabase.from("warranties").select("*");

  if (error) {
    console.error("Récupération de la garantie impossible :", error);
    throw error; // L’erreur est propagée pour être gérée par l’interface.
  }

  return data || [];
}
