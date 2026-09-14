# Jasper Signal — brief de fabrication interne

Ce document est destiné à la fabrication et au contrôle qualité. Il ne doit pas être recopié tel quel sur la page de vente.

## Produit de départ

- Une seule référence, alimentée en USB-C.
- Capteur CO₂ réel de type SCD40/SCD41 ou équivalent, à sélectionner puis tester avant achat en volume.
- Anneau LED 12–16 pixels derrière un diffuseur opalin. Transitions lentes : vert, ambre, rouge.
- Carte contrôleur séparée de la zone de mesure pour limiter la chaleur.
- Coque intérieure rigide en ABS ou PC, avec ouvertures d’air sans arêtes.
- Dos et angles : enveloppe TPU souple indépendante, cible 85A–90A, démontable et remplaçable.

## Estimation de coût (petite série de 100, hors TVA)

| Poste | Fourchette / unité |
|---|---:|
| Capteur CO₂ | 15–19 € |
| PCB, microcontrôleur, composants | 5–8 € |
| LED + diffuseur | 2–4 € |
| USB-C et alimentation | 2–3 € |
| Coque rigide | 2–4 € |
| Dos TPU | 3–7 € |
| Assemblage, test, rebut | 7–12 € |
| Emballage | 1,50–3 € |
| **Total de travail** | **38–60 €** |

Cette estimation exclut TVA, paiement, livraison, retours, support, conformité CE/EMC, DEEE, responsabilité produit et outillage. Obtenir au moins trois devis avant de fixer une promesse de prix.

## Ordre de fabrication

1. Valider une unité fonctionnelle avec carte de développement.
2. Faire fonctionner l’anneau et vérifier les seuils dans une pièce réelle pendant 14 jours.
3. Concevoir le PCB et la séparation thermique capteur/contrôleur.
4. Prototyper cinq coques : aucune arête coupante, aucun TPU collé sur l’électronique.
5. Tester le vieillissement du TPU, la chaleur, la lumière et le nettoyage.
6. Fabriquer 20 unités pilotes et documenter chaque mesure avant une série de 100.
7. Finaliser notices, conformité, garantie et conditions de livraison avant toute vente grand public.

## Ce que le client doit entendre

« Un anneau de lumière vous indique quand aérer. Il reste discret, fonctionne sans application et son dos doux protège vos meubles. »

Ne pas publier de référence de capteur, coût matière, précision, conformité ou délai tant que ces éléments ne sont pas mesurés et validés.
