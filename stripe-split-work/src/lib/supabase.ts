// site/src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Configuration Supabase incomplète : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis.",
  );
}

// database.types.ts ne reflète pas encore le schéma e-commerce complet.
// Laisser l'inférence ouverte évite des types trompeurs jusqu'à la prochaine
// génération depuis le projet Supabase déployé.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
