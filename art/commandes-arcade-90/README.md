# Commandes arcade années 90 — étude visuelle

Planche d’essai pour validation avant intégration. Ouvrir index.html. Aucune borne existante n’est modifiée.

joystick.png : centre, gauche, droite, haut (vers écran), bas (vers joueur), de gauche à droite.
boutons.png : 2×2, jaune en haut et orange en bas, relâché à gauche et enfoncé à droite.

Images générées avec ImageGen intégré, sur fond transparent, d’après assets/bornes-propres/annees-90-menu.png. Les formes et la lisibilité sont l’objet de ce premier essai. Les bases, dimensions et ancrages ne sont pas encore suffisamment identiques pour un atlas de production ; il faudra les calibrer après validation visuelle. Les tailles apparentes du joystick avant/arrière mériteront notamment un contrôle à l’échelle de la borne.

## Prompts utilisés

### Joystick
Use case: stylized-concept. Sprite study sheet for the RED BALL JOYSTICK of the supplied blue 1990s Micro Rider arcade cabinet. Closely match its exact glossy red spherical ball, black shaft and black circular mounting flange, semi-realistic richly illustrated finish, highlight upper-left, camera frontal with modest top view matching the slanted control deck in the reference. TRUE TRANSPARENT BACKGROUND. Draw exactly FIVE isolated joystick assemblies in ONE evenly spaced horizontal row, five identical sized cells, generous transparent padding, no touching. Reading LEFT TO RIGHT: 1 neutral upright CENTER; 2 stick tilted LEFT; 3 stick tilted RIGHT; 4 stick tilted AWAY from viewer toward the game screen (UP); 5 stick tilted TOWARD viewer (DOWN). Only ball/shaft pivot mechanically about the center of the SAME fixed black flange. All five flanges have IDENTICAL shape, size, position within cell, same ellipse perspective, same lighting, aligned exactly horizontally. Ball is same diameter/color throughout; different tilt must be visibly clear but moderate 18 degrees. Shaft remains attached to pivot, no floating parts. No blue deck, no cabinet, no labels, no text, no grid lines, no ground shadow or background. Wide 3:1 image.

### Boutons
Use case: stylized-concept. Sprite study sheet for the YELLOW AND ORANGE PUSHBUTTONS from supplied blue 1990s Micro Rider arcade cabinet. Match the glossy molded convex round caps, black stepped circular bezels, camera frontal and slightly above as on the slanted deck in reference, richly illustrated semi-realistic game-art finish and upper-left highlights. TRUE TRANSPARENT BACKGROUND. Exactly FOUR isolated buttons in a precise 2 COLUMN by 2 ROW layout of equal cells. TOP LEFT yellow released; TOP RIGHT the SAME yellow button pressed down; BOTTOM LEFT orange released; BOTTOM RIGHT SAME orange button pressed down. For each color the BLACK BEZEL must be perfectly identical in size, elliptical perspective, location within cell, and lighting. In pressed state ONLY cap moves DOWN into bezel, exposing much less vertical sidewall. Cap stays same diameter and same surface design, no glow and no new light source. Generous transparent space between all four objects. No blue deck, no cabinet, no labels or words, no grid, no cast floor shadow. Square sprite sheet.


## Essai en situation
Ouvrir essai.html : copie interactive de la borne avec panneau nettoyé, cinq positions du joystick et boutons jaune/orange à maintenir. Flèches au clavier, Z/X, pavé de commande ou action directe sur le canvas. Mode automatique et zoom de contrôle, comparaison avec l’artwork original et repères des socles.

Le panneau est extrait de borne-sans-commandes.png, créée avec ImageGen intégré. Prompt : effacer uniquement joystick rouge complet, tige, socle et boutons jaune/orange avec leurs bagues ; reconstituer la peinture bleue ; conserver vis, ailes, écran du dashboard, bandes et damier ; garder le cadrage 1024×1536 et tous les autres éléments inchangés. Le rendu reprend uniquement le panneau nettoyé sur la référence d’origine.

anchors.json / anchors.js décrivent les rectangles source, points d’ancrage et échelles. Le socle du joystick est normalisé à 82 pixels de large et ancré en (322,1080) ; boutons normalisés à 84 pixels, avec leur base au même niveau y=1098. Les sprites restent ceux validés, avec leurs variations de forme ; ce prototype permet de juger ces différences en situation.

Vérification : aperçu de six états rendu par SVG natif et inspecté. Tests des événements : cinq directions, appui/relâchement, clavier combiné, glissement, perte de focus et démo automatique. Pas de vérification interactive dans un navigateur. La borne arcade-velo existante n’a pas été modifiée.
