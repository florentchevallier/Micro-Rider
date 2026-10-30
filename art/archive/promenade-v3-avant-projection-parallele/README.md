# Animation des rues validées

Ouvrir index.html. Aucune dépendance réseau. Asphalte ou pavés, vitesse et cadence indépendantes, pause et recommencer.

Les deux images sont exactement les aperçus validés par l’utilisateur, sans nouvelle génération ni retouche. Leurs proportions 1536×1024 sont conservées dans une scène 1200×800, avec les panneaux de données ajoutés en dehors du dessin.

Le cycliste provient de la séquence de test pedalage-anime.png et reste une couche indépendante. Le haut de l’illustration et la chaussée défilent à deux vitesses, à partir de bandes horizontales des mêmes images, séparées à la bordure du trottoir. Les maisons ne sont pas découpées en bandes verticales, déformées ou inclinées. Cette première version ne sépare pas encore les montagnes des façades.

## Raccords
Les tuiles sont alternées en miroir : deux copies adjacentes présentent ainsi le même bord à leur jonction. Le dessin est prolongé de deux pixels pour couvrir l’échantillonnage entre les copies. Cela évite une bande blanche ou un bord de contenu brutal sans régénérer les illustrations approuvées. La symétrie peut se remarquer sur les arbres ou les maisons en bordure ; un véritable jeu de raccords dessinés pourra remplacer cette solution de test.

## Entraînement
Hauteur = puissance cible, largeur = durée, couleur = zone. Le curseur avance en temps accéléré ×5.

## Vérification
Composition rendue par SVG natif et inspectée. Tests JavaScript : deux revêtements, conservation du rapport de l’illustration, pause, vitesse zéro, cadence indépendante, boucles miroir autour des passages de tuile. Pas de vérification interactive navigateur.
