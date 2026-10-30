# Instruments intégrés — Micro Rider

Ouvrir index.html dans un navigateur. Aucun serveur nécessaire.

## Fonctionnement

Les cinq bornes possèdent désormais une base illustrée propre pour chaque format (menu / jeu). Les indications variables sont dessinées directement dans les vitres et cadrans de l’illustration : aucun panneau opaque ne recouvre les commandes.

- `Aperçu fixe` : valeurs de démonstration constantes, dessinées sur la même base propre.
- `Éteint` : toutes les indications variables sont retirées ; restent matières, graduations, segments éteints et éclairage décoratif de la borne.
- `0 %`, `50 %`, `100 %` : contrôle explicite de toutes les mesures. À zéro, aucune barre ni trace lumineuse ; les aiguilles mécaniques se placent au début de leur course.
- Les curseurs repassent en mode manuel ; l’animation suit les mêmes instruments.

`instruments.js` contient la géométrie des indications dans le repère 1024 × 1536 de chaque artwork. Les deux formats sont calibrés séparément. La borne années 90 projette ses instruments sur le quadrilatère de la vitre inclinée.

## Visuels

`assets/bornes-propres/` contient dix retouches réalisées avec imagegen intégré. Les originaux restent dans `assets/bornes/` et `assets/bornes-jeu/` et peuvent servir de référence artistique.

Prompts de retouche : conserver exactement la géométrie, la perspective, les matériaux, l’éclairage, l’écran et les commandes ; supprimer uniquement les indications variables des instruments, en gardant verre, cadres, graduations et segments éteints. Années 90 : logement vitré encastré à la place de la grille et des deux voyants, vis restaurées sur montants longs. Néon : retirer les remplissages, aiguilles et traces, garder les néons décoratifs. Cassette : éteindre l’oscilloscope, les barres et les trois colonnes VFD. Steampunk : retirer toutes les aiguilles peintes des trois cadrans. Giscard : retirer aiguilles et remplissages ; clavier de menu repris selon la photo fournie, uniquement la partie entourée en rouge (disposition alphabétique, grandes touches de fonction taupe et ENVOI verte, ponctuation et longue barre Espace), sans pavé numérique.

La disposition demandée par la photo prime sur les recherches antérieures concernant les claviers AZERTY. Références historiques consultées pendant l’exploration : https://db.aconit.org/dbaconit/consulter.php?db=0&idcollection=9385 et https://www.histelfrance.fr/minitelteletelvideotex/ ; la photo utilisateur constitue la référence graphique finale.

## Vérification

40 vérifications des instruments (5 styles × 2 formats × zéro / moitié / maximum / extinction), avec inspection de planches de rendu SVG sur les artworks. 70 combinaisons borne × monde × format et les contrôles de l’interface exécutés dans un environnement DOM de test. Le rendu a été contrôlé par composition SVG ; aucune vérification dans le navigateur local n’est revendiquée.

## Deux nouveaux mondes

Le studio propose désormais neuf univers. Les deux nouveaux visuels sont créés avec imagegen intégré :

- `assets/jeux/ile-dinosaures.png` : prompt de direction — écran portrait 2:3, parc d’attractions tropical dont les dinosaures se sont échappés, clôtures éventrées, véhicule abandonné, jungle, lagon et volcan. Route cyclable large et lisible, cycliste turquoise à casque orange de trois quarts, bonus. Rendu 3D réaliste/cartoon cohérent avec la ville miniature ; sans interface ni texte.
- `assets/jeux/aventures-spatiales.png` : prompt de direction — écran portrait 2:3 en pixel art de jeu d’aventure PC des années 1990, caméra haute de trois quarts inspirée des captures Yoda Stories fournies. Planète turquoise avec chemins sable orange, base, navette et robot originaux, grotte et cellules d’énergie. Cycliste en combinaison, casque orange et vélo turquoise lisible. Sans fenêtre de bureau, inventaire, interface ni texte.

Les images restent fixes ; les mesures, instruments et sélections de bornes conservent leur fonctionnement.

## Retouches des pièces et des inscriptions

Retouches via imagegen intégré : remplacer uniquement les emblèmes des pièces de l’île aux dinosaures par une empreinte unique à trois griffes, en conservant les pièces, leurs positions, reflets et le reste du décor. Sur les deux artworks steampunk, remplacer les quatre inscriptions par PULSATIONS (gauche), CADENCE (centre), ALLURE (droite), RÉGULATEUR (plaque), sans modifier la géométrie des cadrans ni ajouter d’aiguilles. Les anciens visuels sont conservés dans ../archive/avant-empreintes-libelles.
