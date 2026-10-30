# Micro-Rider : décisions et état d'avancement

Dernière mise à jour : 2026-10-26. Ce fichier résume ce qui a été décidé ou validé avec Claude. À corriger librement.

## Vision
- Plateforme de home trainer originale, avec des défis permanents jouables quand on veut : pas d'événements à durée limitée, pas de séries à ne pas casser, pas de classement qui crée la peur de rater quelque chose.
- Routes et pentes du monde réel, avec un habillage fantaisie ou dessin animé (briques, pixel art, style cartoon). Univers inspirés de genres de fiction, sans reprendre les noms, personnages, logos, musiques ou images des franchises.
- Usage principal : un panneau de jeu léger à faible demande d'attention, à côté d'une page de navigateur (YouTube, Spotify, vidéos, etc.).
- Solo uniquement pour l'instant.

## Orientation du produit (décidée le 2026-10-26)
- Le Bluetooth et la commande du trainer existent déjà partout (Zwift, compteurs Garmin ou Wahoo) : ce n'est pas ce qui différencie. Ce qu'on apporte, c'est le **visuel** : de jolis graphiques à regarder pendant l'effort, pas forcément un jeu.
- Deux modes d'affichage, avec les graphismes produits par Florent avec ChatGPT (dossier `art`) :
  1. **Promenade** : paysage, grand écran, interface relaxante avec la séance en bandes de couleur sous l'animation. Pas de pente, on abandonne l'idée de suivre un vrai col dans ce mode.
  2. **Arcade** : écran portrait dans une borne d'arcade (5 bornes, 9 mondes). Image fixe pour la preuve de concept ; à terme un petit cycliste animé qui monte (comme dans un jeu d'arcade des années 80). Laisse l'essentiel de l'écran libre pour un navigateur, une vidéo ou un livre.
- Répartition du travail : ChatGPT produit les images, Claude écrit le code et le branche au matériel réel (ChatGPT ne peut pas l'essayer avec le Hub). Les assets restent dans `art`, lus en place par le code (`../art/`), sans copie.
- Bornes et mondes sont des données (champ `debloque`) : l'utilisateur pourra choisir, puis débloquer (gagner, acheter) sans toucher au code.
- Le travail graphique du mode col (cycliste animé, tracé) viendra après la validation de la preuve de concept.

## Matériel
- Trainer : Zwift Hub (FTMS en Bluetooth).
- Fréquence cardiaque : Coospo HW9 (source par défaut) ou Garmin Forerunner 955 en mode diffusion de la fréquence cardiaque.
- Ordinateur : iMac, écran 27 pouces, Chrome.

## Choix techniques
- Pages web en HTML et JavaScript, sans outil de construction. Navigateur : Chrome (Web Bluetooth). Safari et Firefox ne le gèrent pas.
- Le calcul (profil du col, physique, état de la course) est séparé de l'affichage et des entrées. Le Bluetooth remplira l'objet `entree` à la place des curseurs de simulation.
- Plus tard : application de bureau (Electron) avec deux volets redimensionnables, le jeu à gauche et un navigateur classique à droite. À vérifier à ce moment-là : DRM et conditions d'utilisation de Disney+ et Netflix.
- Une bibliothèque de jeu 2D (Phaser ou PixiJS) ne sera envisagée qu'au mode arcade vertical.

## Modes d'affichage
Prototypes du mode col (`index.html`, jalon 2, validé avec le Hub) :
1. Profil à plat : fait.
2. Relief 3D, dalle isométrique à profil droit : fait. La route est colorée selon la pente de chaque tranche d'un kilomètre.
3. Plus tard : vrai tracé avec ses lacets (GPX et modèle de terrain), route colorée selon la pente moyenne par section (50, 100 ou 250 m, à définir).
Application `micro-rider.html` (jalon 3) : modes Promenade et Arcade, voir la section dédiée plus bas.

## Physique (noyau)
- Bilan des forces : gravité, roulement, air, inertie.
- Paramètres : masse cycliste + vélo 80 kg, coefficient de roulement 0,005, CdA 0,32, densité de l'air 1,2, rendement de transmission 0,975.
- Ordre de grandeur sur l'Alpe d'Huez : environ 66 min à 250 W et 80 kg.

## Comportement du jeu avec le Bluetooth (jalon 2, `index.html`)
- Boutons « Connecter le trainer » et « Connecter le cardio » : chaque source connectée remplace les curseurs de simulation correspondants. Les curseurs restent utilisables pour une source non connectée.
- Pente du col lissée : transition de 200 m centrée sur chaque frontière entre tranches, avec le dénivelé total conservé. La même pente sert à la physique, à l'affichage et à la commande envoyée au Hub (au plus une fois par seconde, si elle change d'au moins 0,2 point, et renvoyée toutes les 30 s).
- La puissance utilisée par la physique est lissée (constante de temps de 2 s). La vitesse vient de notre physique, pas du Hub.
- À la première connexion du trainer, la montée repart du bas. Après une déconnexion en cours de route, la partie se met en pause et reprend là où elle s'était arrêtée à la reconnexion.
- Sans nouveau paquet pendant plus de 4 s, la puissance et la cadence retombent à 0.
- Au sommet, une pente de 0 % est envoyée au Hub.
- Avec un trainer connecté, l'accélération du temps est désactivée.
- Le journal Bluetooth (panneau replié en bas de page) se copie pour le diagnostic.
- Limite connue, à vérifier : si la fenêtre du jeu est entièrement masquée par une autre, Chrome peut geler l'animation et la montée s'arrête. Deux fenêtres côte à côte ne devraient pas poser de problème. À traiter dans l'application de bureau.
- Les conversions d'octets Bluetooth existent dans `ble-diagnostic.html` et dans `index.html` : à factoriser quand le code passera sur plusieurs fichiers.

## Jalon 3 : `micro-rider.html` (2026-10-26)
- Nouvelle page à côté de `index.html` (qu'on ne touche pas : elle est validée avec le Hub). Fichiers dans `code/js/` : `parseurs.js` (identique à ble-diagnostic.html et index.html), `ble.js`, `noyau.js` (physique, séances, zones), `seances.js` (séances intégrées, lecture .zwo et .json), `mode-promenade.js`, `mode-arcade.js`, `assets.js` (chemin du dossier art), `app.js`. Scripts classiques (les modules ES ne marchent pas en `file://`).
- Séances : étapes en secondes avec un palier (watts ou % de la FTP), une rampe, ou une étape libre (sans cible). Format JSON simple et fichiers .zwo (Warmup, Cooldown, Ramp, SteadyState, IntervalsT, FreeRide ; un élément inconnu provoque une erreur plutôt qu'une séance tronquée en silence). Le .fit n'est pas encore lu (binaire : un analyseur sera nécessaire). Deux séances intégrées : « Essai ERG (3 min 30) » à faibles puissances pour le premier test, et une séance de démonstration de 38 min (celle du prototype de la promenade, FTP 250 W).
- Zones de puissance à 6 niveaux (limites 55, 75, 90, 105, 120 % de la FTP) ; FTP modifiable dans la page (250 W par défaut).
- Pendant une séance, la cible est envoyée au Hub en puissance cible (ERG) : à chaque changement de palier, et pendant une rampe tous les 2 W au plus une fois par seconde, renvoyée toutes les 30 s. Hors séance (avant, en pause, après, étape libre), le Hub reçoit une pente de 0 % : résistance libre.
- L'horloge de la séance continue même si on ne pédale pas (comme Zwift), sauf pause manuelle. Si le trainer se déconnecte, la séance se met en pause et reprend à la reconnexion.
- Pas de pente dans les deux modes : la vitesse vient de notre physique à 0 % (environ 30 km/h à 200 W, 34 km/h à 250 W) et non de la vitesse du Hub.
- Le calcul tourne dans un tick cadencé par un Worker (non ralenti quand la fenêtre est masquée) ; le dessin suit requestAnimationFrame. À vérifier sur le Mac : la limite « fenêtre entièrement masquée » devrait être levée pour le calcul et les commandes.
- Promenade : couches de `promenade-relief/scene.js`, branchées sur la distance (défilement), la cadence (sprite) et la séance (bande du bas avec la cible, le temps restant et un trait blanc pour la puissance réelle). Trois revêtements au choix. Le défilement est 14,4 px par mètre, à ajuster au ressenti.
- Arcade : borne et monde au choix, valeurs (cœur, puissance, cadence, vitesse) sur l'écran et dans les instruments de la borne (`instruments.js` du dossier art, rafraîchi 10 fois par seconde). La cible de la séance s'affiche sous la puissance.
- Tests : 32 sur le noyau (node) et 49 sur la page avec un faux Bluetooth (connexion, ERG, rampes, pause, déconnexion, fin de séance, fichiers .zwo/.json, modes). Pas encore essayée avec le vrai Hub.

## Données du col
- Les pentes par kilomètre de l'Alpe d'Huez ont été recopiées à la main depuis l'image du profil officiel. À vérifier. Elles donnent 8,2 % de moyenne contre 8,1 % annoncé. Les pentes sont mises à l'échelle pour arriver à 1850 m.
- Pour un produit, ne pas utiliser l'image de l'organisateur du Tour : générer ses propres profils à partir de données ouvertes (OSM, modèle de terrain, GPX).

## Pistes commerciales (non engagées)
- Bandeau publicitaire sous le jeu : consentement (RGPD) et mentions légales à prévoir en Allemagne et dans l'UE.
- Micropaiements cosmétiques (vélos, tenues) : comptes, serveur, prestataire de paiement, TVA et droit de la consommation. À vérifier avec un statut d'activité clair.
- Garder les cols, vélos et tenues dans des fichiers de données plutôt que dans le code.

## État des tests
- Fait : conversions d'octets testées sur des paquets fabriqués d'après la norme ; flux complet testé avec un faux Bluetooth.
- Fait le 2026-10-25 sur le matériel réel (`ble-diagnostic.html`, Chrome, iMac) : voir la section suivante.
- Fait le 2026-10-25 : le jeu (`index.html`) avec le Bluetooth intégré a passé un scénario complet avec un faux Bluetooth (connexion, pente envoyée, valeurs périmées, déconnexion et reprise, refus de contrôle), plus des tests du noyau (pente lissée, dénivelé conservé, temps de montée inchangé).
- Pas encore fait : essai du jeu avec le vrai matériel, en conditions de jeu et sur une longue durée (déconnexions, dérive).

## Ce que le matériel a montré (essai du 2026-10-25)
- Chrome garde le Zwift Hub et le HW9 connectés en même temps. Le HW9 s'appelle « HW9 20937 » et apparaît dans la liste de Chrome, même quand Zwift Companion le montre connecté au Hub.
- Fréquence cardiaque : le HW9 envoie environ 1 paquet par seconde, avec des intervalles RR dans certains paquets et sans indicateur de contact. Le champ cardio du Hub vaut 0 : il ne relaie pas le bracelet vers Chrome, donc connexion directe au HW9.
- Le Hub accepte toutes les commandes essayées : prise de contrôle, démarrage, simulation de pente, puissance cible, arrêt. Réponse « succès » en 0,2 à 1 s, puis écho dans le Status FTMS (la pente envoyée y revient, par exemple 14 %).
- Puissance cible (ERG) : tenue autour de 100 W (97 à 104 W), puis de 250 W (242 à 257 W), avec une cadence de 66 à 84 tr/min. La puissance converge en moins de 4 s après la commande.
- Pente : le Hub l'accepte et l'écho est correct. Les valeurs de puissance suivent, mais seul le ressenti de Florent confirme que la résistance change.
- Puissance : mêmes valeurs par FTMS et par Cycling Power. Cadence : disponible en pédalant par FTMS, et aussi par les données de manivelle du Cycling Power (écart d'au plus 4 tr/min). Après l'arrêt, la cadence calculée par la manivelle reste figée sur la dernière valeur : prévoir un délai d'expiration. À privilégier : la cadence FTMS.
- Cadence d'envoi : environ 1 paquet par seconde par source. Prévoir un lissage de la puissance pour le jeu.
- Vitesse du Hub : non cohérente avec la pente (par exemple environ 28 km/h à 4 % avec 50 à 75 W, alors qu'il faudrait plus de 350 W en régime établi avec 80 kg). Elle n'est pas utilisée : la vitesse vient de notre propre physique.
- Un paquet FTMS reçu à la connexion contenait des moyennes (puissance, cadence, vitesse) qui datent d'avant la connexion : à ignorer.
- Plages annoncées par le Hub : puissance cible de 0 à 1000 W, résistance de 0 à 100 (unité 0,1).

## Prochaines étapes
1. Essayer `micro-rider.html` avec le Hub et le HW9 : d'abord la séance « Essai ERG », puis la séance de démonstration. Ajuster selon le ressenti (défilement, lissage de la puissance) et rapporter le journal Bluetooth en cas de souci.
2. Essayer `index.html` (col) sur un bon bout de col, si pas déjà fait (transition de pente, lissage).
3. Signaux sonores avant les changements d'intensité ; lecture des fichiers .fit.
4. Mode arcade animé (cycliste qui monte la route de l'image : tracé de la route à valider à l'œil).
5. Mode compact ou fenêtre flottante à côté d'un navigateur ; application de bureau à deux volets.
6. Reprise des graphismes avec ChatGPT après la preuve de concept (poids des fichiers, raccords, sprite de pédalage cohérent d'une image à l'autre).

## Questions ouvertes
- Poids des images du dossier art (20 à 30 Mo par scène) : à réduire (WebP) avant tout produit en ligne. Droits d'auteur des images générées par IA à vérifier (Allemagne, UE) avant un usage commercial.
- Format de séance de référence : .zwo et .json pour commencer, .fit à étudier.
- Longueur des sections de couleur pour le vrai tracé : 50, 100 ou 250 m.
- Forerunner 955 comme source cardio alternative : non testée (le HW9 en direct fonctionne).
- À régler au ressenti : largeur de la transition de pente (200 m pour l'instant) et lissage de la puissance (constante de temps de 2 s). Avec les données SRTM, la pente sera de toute façon plus fine.
- Intérêt réel des cols d'une heure : défis de régularité, zones de puissance ou mini-événements en chemin.
