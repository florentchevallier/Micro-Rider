# Cyclistes et voiture — 28 octobre 2026

- Menu : garçon, femme, les deux. Le garçon reste le choix initial.
- Duo légèrement décalé en profondeur et en phase de pédalage.
- Nouvelle planche féminine complète : aucune découpe du torse, petit recalage global de chaque image.
- Voiture : bouton de passage droite → gauche, voie éloignée, roues au-dessus de la ligne médiane sur l’asphalte. Pause et recommencer agissent aussi sur le véhicule.
- Atlas voiture : 16 images, 4 colonnes × 4 lignes, cases 640 × 256. Seules les surfaces intérieures des roues tournent ; carrosserie, conducteur et pneus extérieurs sont fixes.
- Le décor, les revêtements et le profil d’entraînement sont conservés.

Vérifications : exécution hors navigateur avec Canvas, rendu des deux surfaces, apparition/déplacement/pause/sortie/remise à zéro de la voiture, trois choix de cycliste. Comparaison pixel à pixel des 16 images : aucun changement hors des zones des roues. La vérification interactive du fichier local dans le navigateur est bloquée par la politique d’accès de l’outil.

La planche féminine reste un asset de test généré : petites variations de dessin possibles entre les poses, sans l’assemblage haut/bas de l’essai rejeté. Les séquences de pédalage ne sont pas une référence biomécanique.

## Génération de la cycliste

Outil intégré de génération d’images ; références : planche masculine d’origine et premier design féminin. Prompt final :

+Edit the first reference sprite atlas into a female cyclist matching the second reference's character design. Create ONE complete transparent sprite sheet, exactly 4 columns and 2 rows of 8 FULL BODY cyclist+bicycle frames. Full characters in EVERY cell, no segmented bodies. First image is the strict geometry/pose template, second is appearance only. Blonde ponytail, black helmet, yellow fitted short-sleeved jersey, navy shorts, white socks, mini-pump projecting from jersey rear pocket, NO backpack, red bicycle. Same friendly hand-drawn cartoon visual style.
CRITICAL ANIMATION REGISTRATION: use exactly the SAME head, face, shoulders, chest, arms, hands, saddle, bicycle and wheel positions at exactly the SAME pixel coordinates relative to EACH cell. NO upper-body rocking, NO rescaling, NO changing facial proportions, no shifting head forward/backward. The head profile and face must be an exact repeated stamp in all eight cells. Helmet, shoulders, hands and wheel hubs must line up when all 8 cells are superposed. Only legs and crank/pedals change between frames; ponytail remains almost identical. All torsos must have identical outline and inclination, not a new redraw each frame.
Use the first reference's eight leg poses in the same reading order, make the sequence continuous. Keep far and near feet opposed around crank. Continuous whole silhouette in every frame, no horizontal seam, no pasted upper-half strip. Bike rigid unchanged.
Transparent alpha, clear space between cells, no cropped tires/hair. All eight cells equal square size, wide canvas ratio 2:1. No text/grid/scenery. Favor exact stable animation registration over embellishment.
