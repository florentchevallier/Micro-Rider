# Retouche du raccord de boucle

Retouche de la planche féminine complète avec l’outil intégré de génération d’images, puis recalage global des huit poses (jamais de découpe haut/bas). La première tentative est écartée : elle modifiait trop les jambes. La seconde est retenue comme amélioration, sans promesse d’immobilité parfaite du haut du corps.

La comparaison de la région haut du corps après recalage montre une somme des écarts moyens absolus sur 8→1 et 1→2 de 0,1171, contre 0,1341 avant. Il s’agit d’un indicateur de variation d’image, pas d’une mesure perceptuelle de qualité de l’animation. De petites variations de dessin restent visibles.

Livrables : pedalage-femme-v3.png (planche), pedalage-femme-retouche.png (aperçu APNG 8 images). Scene.js utilise la nouvelle planche et les nouveaux offsets ; index.html incrémente la version du script. Les autres éléments de la promenade ne sont pas modifiés.

Prompt retenu : Retouch ONLY the upper body consistency of this existing female cycling animation atlas. Preserve every leg, shoe, crank, wheel and bicycle in its original position. Use cell 3 as reference for the upper-body silhouette and registration across all eight complete frames, especially 8→1→2. Keep identity, colors, hairstyle, rear-pocket pump, 4×2 layout and alpha transparency. No horizontal waist seam. Minimal careful correction, no redesign.
