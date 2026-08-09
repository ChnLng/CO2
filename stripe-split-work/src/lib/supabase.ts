// site/src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "请在 .env 文件中检查 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY",
  );
}

// database.types.ts ne reflète pas encore le schéma e-commerce complet.
// Laisser l'inférence ouverte évite des types trompeurs jusqu'à la prochaine
// génération depuis le projet Supabase déployé.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
