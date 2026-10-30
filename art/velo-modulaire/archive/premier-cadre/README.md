# Micro Rider — Vélo modulaire

Ouvrir index.html dans un navigateur. Aucun serveur ni téléchargement nécessaire.

Le cadre est fixe et transparent. Une même image de roue à six bâtons est utilisée deux fois derrière le cadre. La rotation dépend de la vitesse ; le cycliste, les jambes et les manivelles ne sont pas encore inclus.

## Réglages
Vitesse, taille, ralenti, pause, avance de 15°, fonds de contrôle, visibilité des éléments et repères des axes.

## Assemblage
Les coordonnées originales et la découpe de la roue sont dans ancrages.json et ancrages.js. Le cadre est légèrement tourné pour aligner les deux axes horizontalement. La roue est affichée dans un carré, autour de son centre. La circonférence illustrative de 2,105 m détermine sa vitesse de rotation, indépendamment de la future cadence du cycliste.

## Création des images
Images créées avec ImageGen, conservées en PNG avec transparence.
Cadre : vélo turquoise strictement de profil, selle, guidon, transmission et fourche ; sans roues, cycliste, manivelles ni pédales ; contours nets, sans fond ni ombre extérieure.
Roue : strictement de profil, six bâtons épais espacés de 60°, pneu noir et accents turquoise ; espaces transparents, aucun texte ni logo.

## Contrôles
Composition inspectée sur fonds blanc et sombre avec rendu SVG natif. La page est autonome ; sa syntaxe JavaScript et les transformations des axes ont été vérifiées. Pas de vérification interactive dans un navigateur à cette étape.
