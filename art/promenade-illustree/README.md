# Promenade illustrée

Ouvrir index.html. Le cycliste animé utilise la planche source de pedalage-anime.png. Fond fixe, sprite indépendant, cadence réglable et pause. Le décor n’est pas encore découpé en couches de parallaxe. Les données du HUD sont celles de l’illustration et restent fixes.

Décor source : exec-6a7860ad-3f9e-4ec1-a567-44715dc842cf.png.
Retouche avec le tool ImageGen intégré : « Remove ONLY the cyclist and his entire bicycle and their cast shadow in the left lower road area. Reconstruct the road, small stone wall and background naturally behind him. Keep the rest of this image unchanged: exact framing, pixel art style, buildings, people at cafe, sea, mountains, coins, ramp, flowers, all HUD text and bottom training panel. Do not add any character or vehicle. The lower road must remain clear, ready for a separate animated sprite overlay. »

Position et angle du sprite gérés par la page, sans régénération du cycliste. Aperçu vérifié par rendu SVG ; syntaxe JavaScript contrôlée. Pas de contrôle interactif navigateur.

## Essai de mouvement
Ajout de fines traces de chaussée en déplacement, suivi de caméra discret et reflets animés sur la mer. Vitesse et cadence indépendantes. Ce sont des effets de mouvement sur un fond unique, sans défilement continu du paysage ni vraie séparation en parallaxe. Pause et vitesse zéro vérifiées en simulation JavaScript.
