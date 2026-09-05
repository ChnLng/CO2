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
    id: "jasper-clair",
    name: "Jasper Clair",
    audience: "Pour la maison",
    price: 89,
    compareAt: 99,
    weight_grams: 220,
    tagline: "Le signal simple qui vous rappelle d’aérer.",
    copy:
      "Un écran lisible, un halo de couleur et aucune application à installer : Jasper Clair aide toute la famille à savoir quand renouveler l’air.",
    features: [
      "Lecture du CO₂, de la température et de l’humidité",
      "Grand affichage lisible d’un coup d’œil",
      "Signal vert, ambre ou rouge, sans alarme agressive",
      "Utilisable sans compte ni téléphone",
    ],
    safety:
      "Les caractéristiques finales et les conformités seront publiées après validation produit.",
    theme: "clair",
  },
];
