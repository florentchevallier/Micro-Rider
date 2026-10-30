# Cycliste 2D — étude de sprites 01

Ouvrir `index.html` dans un navigateur, directement depuis ce dossier. Aucun serveur ni dépendance requis.

## Livrables

- `pedalage.png` : huit poses complètes sur alpha transparent, grille 4 × 2 (1774 × 887 pixels).
- `attitudes.png` : quatre attitudes sur alpha transparent, grille 4 × 1 (2172 × 724 pixels) : roue libre, tranquille, effort, descente.
- `atlas.json` : rectangles source et limites opaques de chaque pose. Les cellules ont des tailles légèrement différentes du fait des dimensions du fichier : utiliser les coordonnées de l’atlas.
- `atlas.js` : même atlas chargé sans requête réseau pour fonctionner en fichier local.
- `index.html` : prévisualisation animée avec cadence, vitesse du défilement, taille, lecture/pause, poses une par une, attitudes et fonds de contraste.

La cadence commande la phase du cycle ; la vitesse commande le décor indépendamment. À cadence nulle, la lecture utilise la pose de roue libre. Les attitudes sont des poses fixes. L’animation est un premier essai graphique, pas une simulation biomécanique. Le vélo, les roues, le cycliste et les accessoires sont encore dessinés ensemble. Les variations résiduelles de géométrie et les angles du pédalier doivent être corrigés avant une utilisation en production. Le redimensionnement s’appuie sur les limites du dessin afin de stabiliser le sol et la largeur apparente.

## Création

Images créées avec l’outil imagegen intégré à partir du concept `art/concepts-2d/aventure-parallaxe.png`. Aucun fond du concept n’est utilisé dans la planche.

Prompt de direction pédalage : sprite sheet transparente 4 colonnes × 2 lignes, même cycliste humain expressif à casque orange, maillot turquoise/magenta, petit sac, cuissard marine et vélo turquoise, strict profil vers la droite, pixel art 16 bits soigné, deux roues visibles et cadrage identique, huit phases distinctes de pédalage ; correction ciblée des jambes et des pieds pour parcourir le cercle du pédalier, pied opposé décalé de 180 degrés, aucun texte, grille, décor ou ombre au sol.

Prompt de direction attitudes : bande transparente 4 colonnes × 1 ligne, même identité, vélo entier de profil et axes constants ; roue libre, allure tranquille, effort avec expression déterminée et quelques gouttes de transpiration, descente avec corps ramassé et expression enthousiaste/surprise. Aucun texte ou décor.

Les décors très simples de la page sont des repères de contrôle dessinés dans le canvas, pas une nouvelle proposition de direction artistique. Le paramètre vitesse règle un défilement illustratif, sans modèle physique. Aucun capteur n’est connecté.

## Contrôles réalisés

Alpha présent sur les deux PNG. Huit poses et quatre attitudes indexées. Vérification de syntaxe et exécution de la lecture, des poses, des attitudes, des fonds et des commandes dans un environnement DOM/canvas de test. Pas de validation visuelle dans un navigateur revendiquée.
