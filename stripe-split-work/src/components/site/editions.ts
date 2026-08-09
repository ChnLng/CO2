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
  theme: "kids" | "grand-air" | "perchoir";
};

export const EDITIONS: Edition[] = [
  {
    id: "petits-curieux",
    name: "Édition Petits Curieux",
    audience: "Enfants",
    price: 129,
    compareAt: 149,
    tagline: "Un compagnon rondouillard pour la chambre d'enfant.",
    copy: "Coque en silicone souple, formes tout en rondeur et couleurs pastel : Jasper devient une veilleuse rassurante autant qu'un capteur sérieux.",
    features: [
      "Coque silicone souple, sans arêtes",
      "Résiste aux chutes jusqu'à 1,5 m",
      "Veilleuse douce le soir, sans écran ni bip strident",
      "Nettoyable, lavable au chiffon humide",
    ],
    safety: "Aucune petite pièce détachable — conforme aux normes jouets EN 71",
    theme: "kids",
  },
  {
    id: "grand-air",
    name: "Édition Grand Air",
    audience: "Adultes & aînés",
    price: 129,
    compareAt: 149,
    tagline: "De grands chiffres, un ton posé, une lecture immédiate.",
    copy: "Affichage grossi, annonce vocale claire en français et carte du monde illustrée : pensé pour rester lisible et rassurant à tout âge.",
    features: [
      "Mode « gros caractères » activable d'un geste",
      "Annonce vocale douce, sans jargon technique",
      "Pied stable, pas de manipulation fine requise",
      "Alerte visuelle progressive, jamais brutale",
    ],
    safety:
      "Aucune application obligatoire — fonctionne seul, sans compte ni smartphone",
    theme: "grand-air",
  },
  {
    id: "perchoir",
    name: "Édition Perchoir",
    audience: "Compagnons à quatre pattes",
    price: 139,
    compareAt: 159,
    tagline: "Élégant, discret, hors de portée des griffes et des dents.",
    copy: "Une cordelette tressée et un socle aimanté haute-fixation : Jasper se perche en hauteur, loin des zones de jeu, dans une finition mate raffinée.",
    features: [
      "Kit de fixation murale haute inclus",
      "Cordelette tressée résistante à la mastication",
      "Finition mate premium, sans petites pièces exposées",
      "Mode silencieux — aucun bip, uniquement la couleur",
    ],
    safety: "Prévu pour un montage en hauteur, hors d'atteinte des animaux",
    theme: "perchoir",
  },
];
