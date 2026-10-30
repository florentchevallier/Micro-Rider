# Commandes séparées et essai

La galerie index.html propose désormais « Commandes animées », « Sans commandes » et « Avec commandes · statique ». Les deux originaux et les deux coques nettoyées restent inchangés.

## Assets

commandes/ contient neuf PNG détourés : croix neutre/haut/bas/gauche/droite, bouton bordeaux relâché/enfoncé, touche centrale relâchée/enfoncée. Les boutons A et B utilisent le même couple de sprites, chacun à son ancrage ; Start et Select utilisent chacun le couple de touches. Les deux planches source sont conservées.

atlas.json décrit les ancrages, largeurs visibles et rectangles source. dessin-commandes.js décrit séparément les placements sur les deux coques. Les états sont recalés sur leur logement ; de légères variations de dessin généré peuvent subsister à l’appui. Les directions de la croix sont vues depuis le joueur : haut = vers l’écran.

## Essai

- Flèches : croix.
- Z : B ; X : A.
- Entrée : Start ; Maj : Select.
- Clic ou pression tactile sur les commandes ; relâchement et perte de focus remettent les commandes au repos.
- Manette à mapping standard : croix ou stick gauche, boutons 0/1, Start 9, Select 8. Support ajouté, essai sur matériel réel non effectué.

Ces commandes sont une démonstration visuelle ; elles ne déclenchent pas encore de jeu ou de séance.

Vérifications : rendu Canvas des cinq directions sur les deux coques, images neutre et appuyée inspectées, logique clavier/relâchement/perte de focus, zones de clic. Contrôle interactif du navigateur local indisponible dans cette session. Les originaux statiques sont vérifiés par leurs empreintes SHA-256.

Génération : outil intégré de génération d’images, référence classique.png. Découpe et métadonnées des sprites sans modification créative des pixels. Les prompts complets sont dans commandes/prompts.txt.
