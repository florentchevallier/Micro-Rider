# Micro Rider — Projection parallèle et plans séparés

Ouvrir index.html. Sélecteur asphalte/pavés, vitesse, cadence, pause, recommencer. Tous les fichiers sont locaux.

## Configuration finale retenue
Pavés comprimés verticalement à 37,5 % de la hauteur du premier essai, largeur et cisaillement horizontal inchangés. Angle des joints : environ 50,2° depuis la verticale. La projection et le facteur sont ceux de la maquette validée.

La chaussée commence douze pixels source sous la bordure pour recouvrir le vide entre le trottoir et la route : plus de bande de ciel bleue au raccord.

Trois surfaces : Pavés 37,5 %, Asphalte illustration validée (chaussée reprise directement du visuel approuvé), Asphalte sombre (ancienne texture conservée en option). Aucun nouvel artwork créé pour cette finalisation. L’asphalte illustré conserve son éclairage peint ; aucune deuxième couche d’ombres n’est ajoutée par-dessus.

## Corrections
- Sol préparé en texture orthographique, puis projeté par une seule transformation affine parallèle (cisaillement horizontal 0,45, compression 0,375 pour les pavés). Les joints restent orientés haut-gauche / bas-droite partout ; aucune convergence vers un point central. Le sol n’est jamais répété en miroir.
- Route, peinture, trottoir, façades et ombres utilisent le même déplacement horizontal. Les textures et les façades ont des largeurs de répétition différentes, mais la même vitesse en pixels par seconde.
- Les ombres sont projetées à partir de la silhouette des façades ; leur direction reste constante, y compris quand la façade est en miroir. C’est une approximation de silhouette, sans simulation d’éclairage 3D.
- Ciel fixe ; nuages séparés (facteur 0,045), lac/montagnes séparés (0,15), plan proche (1). Les façades ont une transparence réelle derrière elles. Le lac peut donc défiler derrière les maisons.
- Les raccords en miroir des maisons restent ceux du prototype, à reprendre plus tard comme convenu. Les deux pixels de recouvrement empêchent les fines bandes d’échantillonnage.

## Art et génération
Six images préparées avec ImageGen intégré, d’après les deux illustrations validées :
- facades-asphalte.png et facades-paves.png : extraction enregistrée en 1536×1024 ; conserver maisons proches, végétation, pots, parapet et trottoir à leurs positions ; rendre transparents ciel, nuages, lointain et chaussée ; ne pas déplacer les éléments.
- sol-paves.png : petits pavés gris-bleu usés, lumière chaude modérée, style pixel peint ; motif strictement orthographique, taille égale partout, rangées horizontales et joints verticaux ; sans convergence, ombre, trottoir ou autre objet ; texture répétable.
- sol-asphalte.png : asphalte bleu ardoise en aplats calmes, usure discrète et texture fine ; orthographique et répétable ; sans marquage, ombre ou objet ; conserver le style illustré.
- lointain.png : montagnes et villages lointains méditerranéens, lac turquoise et voiliers minuscules ; pas de premier plan, ciel ou nuage ; transparence au-dessus de la silhouette des montagnes, eau jusqu’en bas.
- nuages.png : groupes de cumulus crème, ombres lavande et petites touches pixel peintes sur fond réellement transparent ; aucun paysage ni ciel coloré.

La projection parallèle des sols et des ombres est réalisée dans la page, sans perspective variable. La planche de pédalage de test est conservée.

## Entraînement
Hauteur = puissance, largeur = durée, couleur = zone. Séance accélérée ×5 pour le test.

## Vérifications
Transparence des façades contrôlée. Aperçus SVG natifs rendus et inspectés. Tests JavaScript : projection affine constante, défilement sol/façades identique, plans lointain et nuages séparés et plus lents, pause, cadence indépendante et changement de revêtement. Pas de vérification interactive dans un navigateur.

## Oiseaux
Petite envolée indépendante de sept oiseaux clairs au-dessus du port, battements d’ailes et trajectoire ascendante. Premier départ après quatre secondes, puis toutes les vingt-huit secondes ; vol d’environ treize secondes. Dessin animé dans le canvas, placé derrière les façades et devant le lointain. La pause fige aussi les oiseaux.

## Raccord de l’asphalte illustré et des fleurs
Bords repris avec ImageGen intégré à partir de l’asphalte validé. Prompt : réparer uniquement les régions gauche/droite de la bande inférieure sous y600 pour une répétition sans miroir ; préserver la composition, le style, le centre, la lumière, les marquages et la plaque d’égout ; faire correspondre couleurs de l’asphalte, hauteurs et silhouettes des ombres, muret et fleurs.

La composition asphalte-raccord.svg conserve le visuel d’origine au centre, ajoute les retouches près des extrémités avec une transition locale, puis rend progressivement transparent le bord gauche sur 200 pixels source. Deux copies sont superposées sur cette largeur ; la précédente reste opaque sous la suivante. Période 1043,75 pixels à l’écran pour une largeur dessinée de 1200 pixels. La vitesse horizontale reste identique à celle des façades ; seuls la longueur du motif et le raccord changent.

Contrôle natif de plusieurs répétitions : raccord-controle.png. Le fondu peut adoucir légèrement la végétation au raccord ; il évite le saut vertical de forme/couleur. L’original reste conservé dans asphalte-classique.png.
