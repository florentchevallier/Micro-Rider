# Micro Rider — Rue horizontale illustrée

Ouvrir index.html directement dans le navigateur. Aucun serveur ni réseau nécessaire.

## Version actuelle
Bâtiments rigides : chaque plan illustré défile horizontalement d’un seul bloc, à hauteur constante et en conservant ses proportions. Aucun découpage vertical, rotation ou déformation des maisons. Pente, bosses et sauts retirés de cette itération.

Rue plus largement visible du dessus, déplacement horizontal de profil. Sélecteur Asphalte / Pavés ; réglage Place de la rue de 25 à 48 % de la scène. Vitesse et cadence indépendantes, pause et recommencer. Le cycliste utilise toujours la planche de test acceptée.

Le relief ne doit jamais déformer ou incliner les bâtiments. Si des bosses reviennent, elles appartiendront à la chaussée et n’affecteront que le cycliste.

## Entraînement
Hauteur = puissance cible, largeur = durée, couleur = zone (gris, bleu, vert, jaune, orange, rouge). Séance accélérée cinq fois pour ce test.

## Images
Paysage et village issus de la version précédente. Deux chaussées créées avec ImageGen intégré, dans le même style illustré.
Prompt commun : « Wide 3:1 seamless horizontally tiling road-surface game layer matching the detailed pixel-painted adventure-game style of the reference. Elevated side view like a classic belt-scrolling beat-em-up, substantial ground visible from above, horizontal left-to-right travel, no vanishing point or diagonal road. Surface fills the entire rectangle; no sky, buildings, people, bikes, grass, curb, gutters, objects, text or UI. Natural rich hand-painted texture, matching left/right edges. »
Asphalte : « Blue-gray asphalt, fine irregular mineral aggregate, subtle wear, hairline cracks, repaired patches, warm sunlit highlights; no lane markings. »
Pavés : « Provencal gray-blue limestone setts, ochre highlights, rounded irregular edges, fine dark mortar, staggered rows, restrained contrast. »

## Vérification
Aperçus asphalte/pavés rendus et inspectés. Simulation JavaScript vérifiée : plans rigides non découpés et non tournés, proportions d’image conservées, hauteur des maisons constante pendant le défilement, pause, vitesse zéro, cadence indépendante, changement de revêtement et extrêmes du réglage de proportion. Moins de 20 appels d’image par frame au lieu des centaines de bandes de la version précédente. Pas de vérification interactive navigateur.
