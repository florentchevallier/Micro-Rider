# Micro Rider — Promenade avec relief

Ouvrir index.html directement dans un navigateur. Tous les fichiers sont locaux.

Deux plans illustrés distincts : paysage lointain et village transparent. Défilement horizontal à vitesses différentes ; mouvement vertical du lointain lié à l’altitude simulée. Route de profil, légère pente réglable, ondulations et bosses périodiques. Le vélo suit les deux points de contact des roues et effectue un petit saut au passage du sommet d’une bosse à partir de 20 km/h. Le cycliste est la séquence de pédalage de test déjà acceptée, sans régénération.

## Commandes
Vitesse, cadence et pente indépendantes ; activation des bosses, pause et recommencer. Le premier dos-d’âne arrive après environ trois secondes à la vitesse initiale. Les sauts sont une animation stylisée, sans simulation physique complète. La pente est visuelle et ne commande aucun home trainer.

## Entraînement
La hauteur de chaque bloc représente sa puissance cible en watts ; la largeur sa durée. Couleurs Z1 gris, Z2 bleu, Z3 vert, Z4 jaune, Z5 orange, Z6 rouge. La cible et la zone affichées suivent le curseur. Le temps de séance avance cinq fois plus vite pour ce test.

## Images
Images créées avec l’outil ImageGen intégré, d’après la promenade illustrée précédente. Les prompts utilisés :
- Paysage : wide horizontal seamless game background layer; rich beautiful pixel-painted Mediterranean coast; ONLY distant blue sky, cream cumulus, layered Provencal mountains, tiny distant warm villages, turquoise sea in bottom third; level horizontal horizon; no road, foreground buildings, cyclist, people, UI or text; saturated sunny colors; matching left/right edges; 3:1 strip.
- Village : wide horizontal side-scrolling layer on true transparent background; honey-stone Provencal cafes and houses, teal shutters, coral awnings, bougainvillea, plane trees, stone wall; front elevations and horizontal pavement baseline; transparent above roofs and in gaps; no sky, mountains, sea, road, cyclist or UI; rich intricate illustration, 3:1 strip.

Les images sont répétées pour cet essai. Les raccords et le revêtement de la route pourront encore être affinés. Les bâtiments suivent localement le relief par bandes ; une production finale pourra utiliser des éléments indépendants.

## Vérification
Aperçu de composition rendu par SVG natif et inspecté. Contrôles JavaScript : pause, indépendance vitesse/cadence, déclenchement du saut et réception, sens de la pente, puissance/durée du profil. Aucune vérification interactive navigateur effectuée.
