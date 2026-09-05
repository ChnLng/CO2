export type Edition = {
  id: string;
  name: string;
  audience: string;
  price: number;
  weight_grams?: number;
  compareAt?: number;
  tagline: string;
  copy: string;
  features: string[];
  safety: string;
  theme: "clair";
};

/** A deliberate single-SKU launch: easier to manufacture, explain and support. */
export const EDITIONS: Edition[] = [
  {
    id: "jasper-signal",
    name: "Jasper Signal",
    audience: "Pour la maison",
    price: 59,
    compareAt: 69,
    weight_grams: 180,
    tagline: "Un anneau de lumière pour savoir quand aérer.",
    copy:
      "Un grand anneau de lumière, un vrai capteur de CO₂ et aucune application à installer : Jasper Signal aide toute la famille à savoir quand renouveler l’air.",
    features: [
      "Anneau lumineux vert, ambre ou rouge, sans alarme agressive",
      "Capteur de CO₂ dédié, à valider avant production",
      "Alimentation USB-C, sans Wi-Fi ni compte",
      "Utilisable sans compte ni téléphone",
    ],
    safety:
      "Les caractéristiques finales et les conformités seront publiées après validation produit.",
    theme: "clair",
  },
];
