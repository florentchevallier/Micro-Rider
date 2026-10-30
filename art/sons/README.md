# Sons Micro Rider — 29 octobre 2026

Quatre bruitages synthétiques originaux. Aucun échantillon de bibliothèque, enregistrement réel, voix ou musique. Ce sont des assets de travail raffinés, pas des restitutions authentiques d’un vélo, d’une espèce d’oiseau ou d’une Alfa Romeo spécifique.

Tous les fichiers : WAV PCM 16 bits, 48 000 Hz, stéréo. Aucun code d’intégration fourni ni modification de l’animation. `manifest.json` contient les durées exactes, niveaux mesurés et empreintes des fichiers.

| Fichier | Durée | Utilisation |
|---|---:|---|
| pedalage-boucle-85rpm.wav | 8,470583 s | Boucle continue, 12 tours de pédalier à 85 tr/min. Transmission, maillage de chaîne, roulement discret. |
| roue-libre-boucle.wav | 8 s | Boucle continue à vitesse stable de référence ; cliquetis et pneus. 96 impacts/s, vitesse indicative ~25 km/h. Aucun ralentissement imposé. |
| oiseaux-ambiance.wav | 22 s | Quatre groupes d’appels espacés, avec des silences. Déclenchement ponctuel ; éviter la répétition immédiate. |
| voiture-spider-passage-droite-gauche.wav | 10 s | Passage unique, approche à droite puis éloignement à gauche, croisement vers 5 s. Roadster classique évoqué, moteur, pneus et léger effet Doppler. |

## Changements par rapport aux premiers essais

- Pédalage : roulement plus doux, bruits de chaîne plus fins, variation de charge liée à la cadence ; véritable boucle sans fade d’entrée/sortie.
- Roue libre : cliquetis plus dense et moins uniforme, résonances amorties ; boucle à vitesse constante plutôt qu’une décélération enregistrée dans le son.
- Les niveaux sont volontairement modérés. Le niveau RMS global est de -27 dBFS pour chacun des sons de vélo, -31 dBFS pour les oiseaux (silences inclus) et -24 dBFS pour la voiture. Ces valeurs ne sont pas des mesures LUFS.

## Indications pour l’intégration ultérieure

- Les durées des boucles doivent être conservées à l’échantillon près. Ne pas ajouter de silence ou de fade au fichier lui-même.
- La boucle de pédalage a une cadence de référence ; le son de roue libre dépend de la vitesse et non de la cadence. Modifier simplement la vitesse de lecture change aussi la hauteur du son : ce comportement devra être évalué, surtout aux extrêmes.
- Prévoir des transitions douces entre les couches de pédalage et de roue libre. Le roulement est déjà présent dans les deux fichiers : éviter de cumuler les deux durablement au même volume.
- La voiture comporte déjà son déplacement stéréo : ne pas appliquer un second panoramique opposé.
- Les oiseaux sont espacés volontairement ; leur niveau ponctuel est supérieur à ce que suggère le RMS global.
- Musique et bruitages restent des volumes séparés ; conserver une commande qui coupe tout le son.

Contrôles réalisés : format, nombre de canaux, durées, absence de saturation et de valeurs invalides, niveau de crête, discontinuité aux raccords des boucles. Le jugement de réalisme reste à faire à l’écoute dans l’ambiance finale.
