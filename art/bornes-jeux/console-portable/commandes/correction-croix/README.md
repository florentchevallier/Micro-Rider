# Correction de la croix

Le socle et le capot sont désormais deux couches indépendantes, générées depuis le sprite neutre avec l’outil intégré de génération d’images. Le fichier planche-croix-couches.png et les deux sprites croix-socle-v2.png / croix-capot-v2.png conservent les sources détourées.

La scène affiche toujours le même socle, au même emplacement et à la même échelle. Seul le capot entier subit une légère transformation autour de son centre : hauteur à 94 % pour haut, 106 % pour bas, et cisaillement vertical symétrique de 0,055 pour gauche/droite. Il s’agit d’une bascule visuelle 2D, pas d’une simulation mécanique en 3D. Aucun changement des boutons ni des coques.

Les cinq états recomposés sont aussi exportés en PNG individuels et dans planche-croix-v2.png (cinq cases 256 × 256). Atlas.json pointe sur ces versions. Les anciens dessins restent disponibles pour référence.

Vérifications : paramètres d’affichage du socle strictement identiques dans les cinq états ; amplitude haut/bas symétrique ; rendus des deux coques inspectés ; logique des entrées déjà vérifiée. Les versions statiques originales restent intactes.

Prompt : Precisely decompose the supplied black arcade directional cross into two separate transparent production sprite layers in equal side-by-side cells: left, only the complete unobstructed fixed circular mounting socket; right, only the complete one-piece cross cap with embossed arrows and central pivot, without the ring or socket. Same scale and perspective, mounting centers aligned, preserve original black plastic design. Transparent padding, no text, cabinet or scene. The cap will tilt independently above the fixed socket.
