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
- Trainer précis : Zwift Hub One version 1, firmware 5.2.2 (un seul pignon). Contrôleur : Zwift Click B381, matériel A.0, firmware 1.1.0.
- Pédales de puissance : Favero Assioma Duo (Florent). Le produit devra gérer une liste de modèles (Duo, Uno, etc.), pas seulement le Duo.

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
- Arcade, deux vues par borne, avec un bouton à bascule (comme dans le studio de `art/arcade-velo`) : « Vue entière » (borne détaillée, petit écran, pour choisir et naviguer, vue par défaut) et « Mode jeu » (grand écran, pour regarder une vidéo). Le choix est mémorisé.
- Fluidité de la promenade (corrigée le 2026-10-26) : le calcul ne tournant que 5 fois par seconde, le décor avançait par à-coups (84 % des images sans avance mesurées). La distance affichée est maintenant prolongée avec la vitesse entre deux calculs (0 % d'images sans avance, jamais de retour en arrière).
- Tests : 32 sur le noyau (node) et 64 sur la page avec un faux Bluetooth (connexion, ERG, rampes, pause, déconnexion, fin de séance, fichiers .zwo/.json, modes, vues des bornes, fluidité du défilement). Pas encore essayée avec le vrai Hub.

## Rapports virtuels (2026-10-26, `micro-rider.html`)
- Voie (b) retenue : le Hub n'a qu'un pignon, donc un « rapport » est une pente simulée envoyée au Hub (la voie (a), protocole Zwift, est laissée de côté : propriétaire, non vérifiée sur le Hub One).
- Échelle de 1 à 24, 10 par défaut (milieu bas), affichée comme « 10/24 » (pas de pente à l'écran ; la pente est dans l'infobulle). Rapport 10 = 0 %. Au-dessus : +0,8 % par cran (24 → +11,2 %). En dessous : −0,5 % par cran (1 → −4,5 %). Les deux pas sont `RAPPORTS.pasHaut/pasBas` dans `noyau.js`, à régler au ressenti.
- En résistance libre (pas de séance, séance en pause ou finie, étape « libre »), − et + changent le rapport. Pendant un palier ERG (changé le 2026-10-26), − et + ajustent la cible de la séance de 5 % par cran, de −50 % à +50 %, sans toucher au rapport ; l'affichage passe de « 10/24 » à « ERG +10 % » (orange) ; l'ajustement revient à 0 au démarrage, à l'arrêt ou au chargement d'une séance. Avant, les boutons n'avaient aucun effet en ERG. La vitesse affichée suit la pente du rapport (physique du noyau).
- Retour au rapport 10 au démarrage de chaque séance.
- Commandes : boutons − / + à l'écran (surbrillance brève au clic, à la touche et plus tard au bouton du Click), touches réglables dans « Options : touches du clavier » (voir « Joystick, frein et boost » pour les valeurs par défaut ; mémorisées dans le navigateur ; refus de Tab, Entrée, Espace, et d'une touche déjà prise ; Échap annule). Les flèches ne sont pas volées quand le focus est dans un champ (FTP, curseurs, listes).
- Un changement de pente part au Hub tout de suite (sans attendre la seconde entre deux envois) et se journalise (« Consigne envoyée : Libre, pente … % »).
- Affichage : « R 13/24 » dans la barre du haut de la promenade, « KM/H · R 13 » dans la borne d'arcade.
- Zwift Click (confirmé le 2026-10-26) : bouton 1 = « + », bouton 2 = « − » ; les deux ensemble donnent `37 08 00 10 00`. Branché dans `micro-rider.html` (`js/click.js`) : bouton « Connecter le Click » dans l'en-tête (liste Chrome filtrée sur les noms commençant par « Zwift »), échange « RideOn » à la connexion, un rapport par appui (pas au relâchement, pas de répétition si on maintient), batterie dans l'infobulle, trois tentatives de reconnexion automatique si le Click se met en veille. Le décodage est dupliqué dans `ble-click.html` (page de diagnostic, à garder séparée).

## Sortie enregistrée et export .tcx (2026-10-26)
- `js/sortie.js` : une mesure par seconde (puissance, cadence, FC, distance et vitesse du noyau), seulement avec un vrai trainer connecté et quand on pédale ou que la séance tourne. Sauvegarde automatique dans le navigateur toutes les 30 s (récupérée au rechargement). Boutons « Télécharger .tcx » et « Nouvelle sortie » (avec confirmation).
- Format .tcx (Garmin Training Center) sans position GPS : Strava classe l'activité en salle. Les calories sont approximées par l'énergie produite (1 kJ ≈ 1 kcal). Le format .fit n'est pas nécessaire pour l'export.
- Envoi automatique vers Strava, pour tout le monde, comme GPX Combiner mobile : à faire. Constats après lecture du dépôt `GPX-Combiner` : `core/strava_client.py` demande déjà `activity:read_all,activity:write` (donc pas de nouvelle autorisation) ; `upload_gpx` impose `data_type=gpx` (à généraliser : `tcx`, `trainer=1`, `sport_type`) ; le serveur Flask `mobile-app/` a déjà la connexion OAuth, les jetons par utilisateur (SQLite) et une route `/upload` qui attend la fin du traitement. Limites : hébergement gratuit à disque effacé à chaque mise en veille (jetons perdus), limite de nombre d'athlètes de l'application Strava, appels depuis une page web à vérifier (CORS) : le plus simple est de servir Micro-Rider depuis le même serveur Flask.
- Séances : les exports de TrainingPeaks sont en .zwo ou .erg/.mrc pour les séances en puissance ; le .fit n'est la seule option que pour les séances à la fréquence cardiaque ou à l'allure. Lire d'abord .mrc/.erg (texte) avant le .fit (binaire).

## Arrêt sans pédalage (2026-10-26)
- Sans pédaler (puissance et cadence < 5), le vélo virtuel décélère de 2 m/s² en plus de la physique (de 30 km/h à l'arrêt en ~4 s), sauf si la pente est inférieure à −1 % (rapports 7 et moins : vraie descente, on roule en roue libre). Avant : à −1 %, il roulait à ~16 km/h sans pédaler.

## Joystick, frein et boost (2026-10-26)
- Commandes de la borne (corrigé le 2026-10-26, Florent s'était trompé au départ) : les rapports sont uniquement sur les deux boutons pressoirs (« − » et « + », comme le Zwift Click, touches **−** et **+** par défaut). Le joystick : haut = boost, bas = frein ; gauche/droite (« changer de file », à développer) n'ont aucune action pour l'instant, seul le halo du joystick penche tant que la flèche est tenue. Touches par défaut − + ↑ ↓ ← →, six réglages dans les options, mémorisés. Un changement de rapport allume le bouton pressoir correspondant mais n'incline plus le joystick. Avant : gauche/droite changeaient les rapports.
- Frein : ralentit le vélo virtuel de 3 m/s² (valeurs ramenées de 6 à 3 et de 4 à 2 le 2026-10-26 : « trop brusque ») tant que la touche (ou le bouton « Frein » à l'écran) est tenue ; jamais de résistance ajoutée au Hub. La vitesse enregistrée dans la sortie en tient compte.
- Boost : +20 % de vitesse affichée (et de défilement du décor) pendant 5 s, avec ramp d'entrée et de sortie douces, puis pause de 10 s (valeur provisoire de développement ; valeurs « vraies » à décider). Refusé à l'arrêt. Le bonus n'entre pas dans la distance ni la vitesse enregistrées dans la sortie ; aucun effet sur le Hub. Constantes : `FREIN` et `BOOST` dans `noyau.js`.
- Halos sur la borne (sans nouvelle image) : un halo lumineux sur le joystick et les deux boutons de chaque borne, dans les deux vues. Les boutons s'allument au changement de rapport (quelle que soit la source : clavier, écran, Click), le joystick penche d'un cran à gauche ou à droite, devient doré pendant le boost et rouge pendant le frein. Les positions sont dans `BORNES[].cmd` de `mode-arcade.js` (mesurées à l'œil sur les images, ±1 %). Si on passe plus tard à de vrais sprites (borne sans ses commandes + joystick 5 positions + boutons 2 états), seules les images changent.
- Séances : `.mrc` (puissance en % de la FTP) et `.erg` (en watts) sont lus ; le `.fit` n'est pas prévu.

## Physique « dessin animé » (2026-10-26)
- Demande de Florent : en mode arcade, beaucoup de réactivité, accélérer et freiner plus vite que dans la réalité est accepté.
- `PHYS.inertie` = 25 kg : masse utilisée seulement pour accélérer/ralentir ; les forces (pente, roulement) gardent les 80 kg. La vitesse en régime stable est donc inchangée (200 W à plat ≈ 34 km/h), mais on y arrive vite : à plat, 300 W donnent 25 km/h en 3 s, 600 W donnent 35 km/h en 3 s. Lissage de la puissance : 2 s → 0,6 s.
- Au rapport 14 ou plus (pente ≥ 3 %), la vitesse en régime stable reste basse (300 W ≈ 27 km/h au rapport 14) : c'est la pente simulée, pas l'accélération.

- Freinage : revenu aux valeurs d'avant (frein 3 m/s², arrêt sans pédalage 2 m/s²), l'inertie réduite (25 kg) et le lissage (0,6 s) restent.

## Défilement du décor (2026-10-26)
- Mise à jour 2026-10-26 (après essai) : « environ 50 % moins rapide que dans la réalité ». Vérifié : pas de pente cachée en promenade (rapport 10 = 0 %, 100 W = 22 km/h, 200 W = 33 km/h) ; c'est l'échelle visuelle du décor (14,4 px par mètre, sprite de 260 px pour un vélo de ~1,7 m) qui est trop faible. Décision de Florent : doubler la vitesse du décor. `ECHELLE_DECOR = 2` dans `mode-promenade.js` (14,4 → 28,8 px par mètre) ; ce facteur est réglable plus tard (1,75 ? 1,5 ?). Le réglage « Défilement » de l'écran (base, +20 % … +100 %) s'applique par-dessus cette base ; l'ancienne extension à +200 % est retirée.
- Constat de Florent : le vélo virtuel paraît trop lent par rapport à la vitesse affichée. Réglage « Défilement » dans la barre d'options du mode promenade : réel (0, défaut), +20 %, +40 %, +60 %, +80 %, +100 %. Purement visuel : multiplie la distance de défilement (monotone, jamais en arrière) ; ni la vitesse affichée, ni la distance enregistrée, ni le Hub ne changent. Mémorisé (clé `defilement`). Le mode arcade en tiendra compte quand le cycliste sera animé.
- À confirmer à l'usage : le numéro de rapport pendant les essais « trop lent » n'a pas été relevé ; si la lenteur persiste, regarder la pente simulée (rapports 11 et plus = montée).

## Mémoire des appareils Bluetooth (2026-10-26)
- Le dernier appareil de chaque type (trainer, cardio, Click) est mémorisé (identifiant et nom, `micro-rider.bt.*`). Un clic sur « Connecter » s'y reconnecte directement sans rouvrir la liste de Chrome (`navigator.bluetooth.getDevices()`), avec un délai de 15 s ; en cas d'échec, message clair et le clic suivant rouvre la liste.
- Reconnexion automatique 0,6 s après le chargement de la page (case à cocher dans « Options : appareils Bluetooth mémorisés », activée par défaut) ; boutons « Oublier » par appareil.
- À vérifier avec le vrai matériel : Chrome conserve-t-il l'autorisation des appareils d'une session à l'autre pour une page ouverte en `file://` ? Le journal l'indique : « Appareils Bluetooth déjà autorisés pour cette page : N ». Sinon, servir la page en http (localhost ou serveur Flask) règle le plus souvent le problème. Si `getDevices` n'existe pas, le comportement est celui d'avant (liste de choix) avec un message d'information.

## Jambes au démarrage (2026-10-26)
- Le Hub met plusieurs tours de pédale à détecter la cadence. Dès que la puissance dépasse 5 W et tant que la cadence reste sous 5 tr/min, le cycliste dessiné pédale à la cadence d'animation minimale (30 tr/min, `CADENCE_ANIM_MINI` dans `app.js`, valeur `cadenceAnim` de `valeurs()`) ; la cadence affichée et enregistrée reste celle du capteur (0). Dès que la cadence est détectée, l'animation suit la vraie cadence. À 0 W et 0 tr/min : jambes immobiles.

## Capteur de cadence séparé (2026-10-26)
- Florent possède un capteur de cadence seul Garmin, un Wahoo et deux autres marques chinoises : tous passent par le service standard Cycling Speed and Cadence (0x1816, mesure 0x2A5B).
- Bouton « Connecter la cadence » à côté du cardio ; mémoire de l'appareil, reconnexion automatique et bouton « Oublier » comme pour les autres. La cadence (tours de manivelle cumulés et heure du dernier tour, compteurs 16 bits qui bouclent) est calculée par différence ; sans nouveau tour pendant 2,5 s, elle retombe à 0.
- Priorité : tant que le capteur est connecté, sa cadence remplace celle du Hub (qui met plusieurs tours à la détecter) ; à sa déconnexion, la cadence du Hub reprend. La puissance reste celle du Hub. Le curseur de cadence simulée est grisé pendant que le capteur est connecté.
- Un capteur qui ne mesure que la vitesse de roue est refusé (lecture de CSC Feature, bit manivelle), avec un message clair.
- Le Garmin ou autre capteur ANT+ seulement ne fonctionnerait pas : Web Bluetooth ne lit que le Bluetooth Low Energy. À vérifier sur le vrai matériel (Garmin Cadence Sensor 2 : double ANT+/BLE, à ne connecter qu'à un appareil à la fois).
- Pas fait : capteur de vitesse de roue, fusion de plusieurs sources de cadence.

## Fichiers du projet et archives (2026-10-26)
- Pages (dossier `code/`) : `index.html` = le col en fausse 3D avec les pentes réelles et le Bluetooth (« jalon 2 », validé avec le Hub, intacte depuis le 25 octobre, on n'y touche pas) ; `micro-rider.html` = l'application actuelle (promenade, arcade, séances, sortie .tcx, Click, capteur de cadence) ; `ble-diagnostic.html` et `ble-click.html` = pages de diagnostic Bluetooth ; `js/` = modules de `micro-rider.html` ; `tests/` = tests automatiques ; `docs/decisions.md` = ce document.
- Règle demandée par Florent : on garde tout ce qu'on fait et on range l'ancien dans des dossiers d'archives, on ne supprime rien. Application : avant d'écraser un fichier du projet, son ancienne version est copiée dans `code/archive/livraisons/rN/` (N = numéro de la livraison qui remplace). Les anciennes livraisons r2 à r9 et leurs notes y sont déjà (instantanés des seuls fichiers modifiés à chaque étape ; `code/archive/livraisons/LISEZMOI.md` explique). Les images ont leur archive à part dans `art/archive/`.
- Les tests (`code/tests/`) ont été copiés sur le Mac le 2026-10-26 ; leurs chemins sont ceux de l'environnement de Claude, à adapter.

## Commandes de borne en vrais sprites (étude du 2026-10-26)
- Florent a fait préparer (ImageGen) des sprites pour la borne années 90, vue menu : `art/commandes-arcade-90/` (joystick 5 positions `joystick.png`, boutons jaune/orange relâchés/enfoncés `boutons.png`, panneau nettoyé `borne-sans-commandes.png`, ancrages `anchors.json`, essai interactif `essai.html`).
- Décisions : commencer avec cette seule borne pour valider le concept (halos conservés sur les autres) ; pouvoir comparer le rendu avec et sans les sprites (réglage, pour voir les deux) ; les commandes de la borne doivent être cliquables (boutons jaune = rapport −, orange = rapport +, joystick haut = boost, bas = frein, gauche/droite sans action).
- Réalisé (livraison r12) : dans `mode-arcade.js`, la borne Années 90 (vue entière) a une entrée `commandes` (dossier des sprites, points d'ancrage, zone de recouvrement du panneau nettoyé, zones cliquables). Un canevas 1024×1536 posé sur l'image de la borne dessine le panneau nettoyé (recouvre les commandes d'origine) puis le joystick (5 positions) et les deux boutons (relâché / enfoncé), avec les ancrages de `anchors.js`. Le canevas n'est redessiné qu'au changement d'état.
- Poses : joystick vers le joueur = frein tenu, vers l'écran = boost en cours, gauche/droite = flèche tenue (ou glissement) sans action, sinon centre. Bouton jaune (gauche) = rapport −, orange (droite) = rapport + : il s'enfonce 0,22 s à chaque changement de rapport (clavier, Click, écran, souris) et reste enfoncé tant qu'on le maintient à la souris.
- Cliquable : clic sur le jaune ou l'orange = rapport − / + ; glisser le joystick vers le haut = boost, vers le bas = frein tenu jusqu'au relâchement, gauche/droite = penche sans action. Mêmes effets que les touches (`actions` branchées dans `app.js`).
- Réglage « Commandes » dans la barre d'options arcade : sprites + halos (défaut), sprites seuls, halos seuls (ancien rendu). Mémorisé (clé `commandes`). Les autres bornes et la vue « jeu » gardent les halos.
- Les images viennent de `art/commandes-arcade-90/` (chargées à la demande : `joystick.png`, `boutons.png`, `borne-sans-commandes.png`, `anchors.js`). Les dessins d'ensemble de la borne (`annees-90-menu.png`) et `borne-reference.png` sont le même fichier.
- Restera à faire pour les autres bornes et pour la vue « jeu » : un panneau nettoyé et des sprites calibrés par borne et par vue.

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
6. Export des sorties vers Strava (feuille de route, ajouté le 2026-10-26) : enregistrer la sortie (puissance, cadence, cœur, durée) puis produire un fichier .fit ou .tcx à envoyer à Strava, d'abord à la main, puis par l'API Strava (autorisation OAuth, application Strava à déclarer) si le projet devient un produit.
7. Zwift Click pour changer de « vitesse » virtuelle (hors ERG) : boutons identifiés (1 = +, 2 = −) et rapports virtuels prêts à l'écran et au clavier (voir « Rapports virtuels ») ; Click branché (à valider avec le vrai matériel). Idées ensuite : répétition à l'appui long, signal sonore, Click non Zwift ou autres boutons.
8. Reprise des graphismes avec ChatGPT après la preuve de concept (poids des fichiers, raccords, sprite de pédalage cohérent d'une image à l'autre).

## Questions ouvertes
- Poids des images du dossier art (20 à 30 Mo par scène) : à réduire (WebP) avant tout produit en ligne. Droits d'auteur des images générées par IA à vérifier (Allemagne, UE) avant un usage commercial.
- Zwift Click (changement de vitesse virtuel hors ERG) : le protocole des boutons est propriétaire (Zwift) et seulement en partie décrit par des projets non officiels ; l'accès par Web Bluetooth n'est pas vérifié. Deux voies : (a) protocole de « virtual shifting » de Zwift avec le Hub (calcul fait par le firmware du Hub, protocole non publié, rétro-ingénierie par d'autres applications) ; (b) émuler nous-mêmes les rapports en modifiant la consigne de résistance envoyée au Hub (pente simulée ou coefficient d'air). Première étape : `ble-click.html` (page de diagnostic, ne commande rien sur le Hub) pour voir si Chrome se connecte au Click et lit ses boutons ; les UUID Zwift qu'elle déclare viennent de projets non officiels et ne sont pas vérifiés pour ce modèle. Matériel de Florent : Zwift Hub One version 1, firmware 5.2.2 (un seul pignon Zwift) ; Zwift Click identifiant B381, matériel A.0, firmware 1.1.0.
- Résultats de l'essai `ble-click.html` (2026-10-26) : Chrome voit le Click et le service `00000001-19ca-4651-86e5-fa29dcdd09d1` (caractéristiques 00000002 notification, 00000003 écriture sans réponse, 00000004 lecture/indication, 00000005 notification, 00000006 lecture/écriture/indication). Rien n'arrive avant l'« échange de départ » : il faut écrire `52 69 64 65 4f 6e` (« RideOn ») dans 00000003 ; le Click le répète sur 00000004, puis 00000002 envoie environ 9 messages par seconde `37 08 a 10 b` (a et b valent 0 ou 1) et, toutes les 5 s, `19 10 5d` (5d = 93 % : batterie). Sur 196 messages, au repos `01 10 01` (118), `00 10 01` (42), `01 10 00` (36), jamais les deux à 0. a et b sont l'état des deux boutons, 0 = enfoncé. Confirmé : bouton 1 (premier octet) = « + », bouton 2 = « − », 0 = enfoncé. La page affiche maintenant l'état de chaque bouton en direct et ne journalise que les changements.
- Puissance et pédales (idées de Florent, non prioritaires) : (1) accepter un capteur de puissance séparé (Assioma Duo, Uno, autres modèles) pour un trainer dont le capteur est peu précis ou défectueux ; (2) option de puissance lissée = moyenne (Hub + pédales) / 2 ; (3) repli sur l'une des sources quand l'autre se déconnecte. À traiter après la preuve de concept.
- Fréquence cardiaque relayée par le Hub : le Hub envoie toujours 0, même avec le HW9 lié au Hub. Abandonné pour l'instant ; on garde la connexion directe au HW9.
- Format de séance de référence : .zwo et .json pour commencer, .fit à étudier.
- Longueur des sections de couleur pour le vrai tracé : 50, 100 ou 250 m.
- Forerunner 955 comme source cardio alternative : non testée (le HW9 en direct fonctionne).
- À régler au ressenti : largeur de la transition de pente (200 m pour l'instant) et lissage de la puissance (constante de temps de 2 s). Avec les données SRTM, la pente sera de toute façon plus fine.
- Intérêt réel des cols d'une heure : défis de régularité, zones de puissance ou mini-événements en chemin.
