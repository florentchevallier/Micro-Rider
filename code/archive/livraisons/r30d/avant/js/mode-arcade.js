"use strict";
/* =====================================================================
   MODE ARCADE : écran portrait dans une borne. Image fixe pour l'instant (le cycliste animé viendra) ;
   ce qui vit, ce sont les valeurs à l'écran (cœur, puissance, cadence, vitesse) et les instruments
   de la borne, dessinés par instruments.js (dossier art) avec les vraies mesures.
   Bornes et mondes sont des DONNÉES : l'utilisateur pourra en choisir, puis les débloquer
   (champ "debloque") sans toucher au code.
   ===================================================================== */
(function (scope) {

const DOSSIER = ART + "arcade-velo/";
// « cmd » : position du joystick (joy) et des deux boutons (moins, plus) dans chaque vue, en % de l'image :
// [centre x, centre y, rayon en % de la largeur]. Mesurés à l'œil sur les images ; le halo s'y allume.
// Chaque borne a deux vues : « menu » (borne entière et détaillée, petit écran, pour choisir et naviguer)
// et « jeu » (grand écran, pour regarder une vidéo pendant l'effort). Position de l'écran dans l'image,
// en % [gauche, haut, largeur, hauteur].
const BORNES = [
  { id: "steampunk", nom: "Steampunk", cle: "steampunk", accent: "#ffe2a3", debloque: true,
    vues: { menu: [24.5, 12.8, 51.3, 33.8], jeu: [24.5, 12.8, 51.3, 64.3] },
    cmd: { menu: { joy: [27.4, 50.4, 3.5], moins: [67.3, 56.2, 4.0], plus: [75.8, 56.2, 4.0] },
           jeu: { joy: [27.4, 80.9, 3.5], moins: [66.3, 86.7, 4.0], plus: [76.0, 86.7, 4.0] } } },
  { id: "original", nom: "90s", cle: "annees-90", accent: "#ffe36b", debloque: true,
    vues: { menu: [24.2, 15.7, 52.7, 47.6], jeu: [24.2, 15.7, 52.7, 65.5] },
    cmd: { menu: { joy: [31.4, 66.3, 3.4], moins: [62.5, 69.0, 3.8], plus: [71.8, 69.0, 3.8] },
           jeu: { joy: [31.4, 84.4, 3.4], moins: [62.5, 86.8, 3.8], plus: [71.8, 86.8, 3.8] } },
    // Vrais sprites des commandes (étude art/commandes-arcade-90) : seulement la vue « menu » pour l'instant.
    // Coordonnées en pixels de l'image 1024×1536. « patch » = zone du panneau nettoyé qui recouvre les commandes d'origine,
    // « joy » et « jaune »/« orange » = points d'ancrage des sprites (le bouton jaune est le « − », l'orange le « + »),
    // « zones » = rectangles cliquables [x0, x1] sur la bande verticale [y0, y1].
    commandes: { dossier: "commandes-arcade-90/", vue: "menu", joy: [322, 1080], jaune: [640, 1098], orange: [736, 1098],
                 patch: { polygone: [[190, 994], [833, 994], [850, 1113], [175, 1113]], rect: [282, 975, 82, 20] },
                 zones: { y: [975, 1110], joy: [260, 385], jaune: [594, 686], orange: [690, 784] },
                 // Vue « jeu » (grand écran) : même panneau, décalé vers le bas (le panneau nettoyé de la vue menu sert aussi ici, par zones).
                 jeu: { dyJoy: 278, dyBtn: 274, rects: [[250, 985, 150, 135], [585, 985, 205, 135]] } } },
  { id: "neon", nom: "Neon", cle: "neon", accent: "#60ecff", debloque: true,
    vues: { menu: [27, 12.8, 46.2, 33.6], jeu: [27, 12.8, 46.2, 60.2] },
    cmd: { menu: { joy: [28.8, 49.1, 3.5], moins: [67.9, 53.9, 3.4], plus: [75.5, 53.9, 3.4] },
           jeu: { joy: [27.4, 76.4, 3.5], moins: [68.2, 81.4, 3.4], plus: [76.6, 81.4, 3.4] } } },
  { id: "cassette", nom: "Cassette", cle: "cassette", accent: "#78ffd0", debloque: true,
    vues: { menu: [20.8, 10.9, 58.3, 31.3], jeu: [20.8, 10.9, 58.3, 63.4] },
    cmd: { menu: { joy: [21.8, 50.4, 3.9], moins: [65.8, 54.9, 4.4], plus: [78.4, 54.9, 4.4] },
           jeu: { joy: [21.1, 82.4, 3.9], moins: [65.8, 85.8, 4.4], plus: [79.2, 85.8, 4.4] } } },
  { id: "giscard", nom: "Giscard-punk", cle: "giscard", accent: "#ffc366", debloque: true,
    vues: { menu: [24.1, 14.5, 51.7, 26.2], jeu: [24.1, 14.5, 51.7, 57.5] },
    cmd: { menu: { joy: [23.9, 48.4, 3.9], moins: [76.5, 53.8, 3.8], plus: [75.8, 48.0, 3.8] },
           jeu: { joy: [23.2, 79.4, 3.9], moins: [77.6, 85.9, 3.7], plus: [76.7, 80.4, 3.7] } } },
  // Console portable (art/bornes-jeux/console-portable) : dessinée par Pupitre (commandes animées et cliquables) ; petit écran = « classique »,
  // grand écran = « grand ». Pas de HUD ni d'instruments propres : l'écran sert aux jeux.
  { id: "portable", nom: "Handheld console", cle: null, accent: "#f1e5cd", debloque: true, pupitre: { menu: "classique", jeu: "grand" },
    vues: { menu: [26.4, 18, 47.2, 38.1], jeu: [23.9, 15.3, 52.2, 48.2] }, cmd: { menu: null, jeu: null } }
];
// Couleur de la pastille qui choisit la borne.
// Ordre des pastilles (et borne par défaut) : Années 90, puis console portable.
const ORDRE_BORNES = ["original", "portable", "steampunk", "neon", "cassette", "giscard"];
BORNES.sort((a, b) => ORDRE_BORNES.indexOf(a.id) - ORDRE_BORNES.indexOf(b.id));
const PASTILLES = { steampunk: "#c8833a", original: "#e8c53a", neon: "#35d0ff", cassette: "#3fd9a0", giscard: "#ff9a3c", portable: "#f1e5cd" };
const imageBorne = (b, vue) => "assets/bornes-propres/" + b.cle + "-" + vue + ".png";
const MONDES = [
  { id: "col-alpin", nom: "Alpine pass", image: "assets/jeux/col-alpin.png", debloque: true },
  { id: "montagne-briques", nom: "Brick mountain", image: "assets/jeux/montagne-briques.png", debloque: true },
  { id: "ville-miniature", nom: "Miniature city", image: "assets/jeux/ville-miniature.png", debloque: true },
  { id: "ville-dessus", nom: "City · top view", image: "assets/jeux/ville-dessus.png", debloque: true },
  { id: "ville-3d", nom: "City · urban 3D", image: "assets/jeux/ville-3d.png", debloque: true },
  { id: "parc-isometrique", nom: "Park · isometric", image: "assets/jeux/parc-isometrique.png", debloque: true },
  { id: "table-miniature", nom: "Tabletop · miniature race", image: "assets/jeux/table-miniature.png", debloque: true },
  { id: "ile-dinosaures", nom: "Dinosaur island", image: "assets/jeux/ile-dinosaures.png", debloque: true },
  { id: "aventures-spatiales", nom: "Space adventures", image: "assets/jeux/aventures-spatiales.png", debloque: true }
];

const CSS = `
.machine{position:relative;height:var(--hm, calc(100svh - var(--haut, 210px) - 46px));min-height:300px;aspect-ratio:2/3;max-width:100%;margin:0;container-type:inline-size;overflow:hidden}
.machine .cab{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;border-radius:12px}
.machine .screen{position:absolute;overflow:hidden;background:#020c17;border-radius:2.5%;box-shadow:inset 0 0 10px #000}
.machine[data-vue=menu] .screen{border-radius:5%}.machine[data-vue=menu] .hud{padding-top:5%}
.machine .pup{position:absolute;inset:0;width:100%;height:100%;border-radius:12px;touch-action:none}
.machine .jeux{position:absolute;inset:0;z-index:3;background:#06122b;display:flex;align-items:center;justify-content:center;overflow:hidden}
.machine .jeux canvas{display:block}
.machine .scene{width:100%;height:100%;object-fit:cover;display:block}
.machine .hud{position:absolute;inset:0 0 auto;display:grid;grid-template-columns:repeat(4,1fr);padding:4% 3% 10%;gap:3%;background:linear-gradient(#04111fea,transparent);text-align:center;font-family:monospace;text-shadow:0 0 4px #000}
.machine .hud small{display:block;font-size:1.05cqw;color:#e6f1ec}
.machine .hud strong{font-size:2.9cqw;color:var(--accent,#ffdf70);white-space:nowrap}
.machine .hud em{display:block;font-size:1cqw;font-style:normal;color:#fff;white-space:nowrap}
.machine[data-style=original] [data-v=hr]{color:#ffad73}.machine[data-style=original] [data-v=watts]{color:#ffe875}.machine[data-style=original] [data-v=rpm]{color:#ffb451}.machine[data-style=original] [data-v=speed]{color:#d494ff}
.machine .panel{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.machine .panel svg{display:block;width:100%;height:100%}
.machine .cmd{position:absolute;inset:0;pointer-events:none}
.machine .halo{position:absolute;border-radius:50%;transform:translate(-50%,-50%);opacity:0;mix-blend-mode:screen;transition:opacity .45s ease-out,transform .18s ease-out;background:radial-gradient(circle,rgba(255,255,255,.9) 0%,var(--h) 36%,transparent 70%)}
.machine .halo.on{opacity:1;transition:opacity .04s,transform .08s}
.machine .halo.plus{--h:rgba(110,255,150,.9)}.machine .halo.moins{--h:rgba(255,170,70,.9)}
.machine .halo.joy{--h:rgba(120,200,255,.9)}.machine .halo.joy.boost{--h:rgba(255,200,40,.95)}.machine .halo.joy.frein{--h:rgba(255,60,60,.95)}
.machine .ctl{position:absolute;inset:0;width:100%;height:100%;display:none;touch-action:none}.machine .ctl.actif{display:block}
.machine .msg{position:absolute;inset:auto 8% 6% 8%;color:#ffb4b4;font:12px monospace;text-align:center}
`;

function pre(url) {
  return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(url); im.onerror = () => no(new Error("image not found: " + url)); im.src = url; });
}
function chargerImage(url) {
  return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error("image not found: " + url)); im.src = url; });
}
function chargerScript(url) {
  return new Promise((ok, no) => { const s = document.createElement("script"); s.src = url; s.onload = ok; s.onerror = () => no(new Error("file not found: " + url)); document.head.append(s); });
}

function creerArcade(conteneur) {
  const st = document.createElement("style"); st.textContent = CSS; document.head.append(st);
  conteneur.innerHTML = `<div class="machine" data-style="steampunk" data-vue="menu">
    <img class="cab" alt="Arcade cabinet">
    <canvas class="pup" data-p="classique" width="1024" height="1536" hidden aria-label="Handheld console: d-pad, A, B, Start, Select"></canvas><canvas class="pup" data-p="grand" width="1024" height="1536" hidden aria-label="Handheld console, large screen: d-pad, A, B, Start, Select"></canvas>
    <canvas class="ctl" width="1024" height="1536" aria-label="Cabinet controls: joystick and two buttons"></canvas>
    <div class="screen"><img class="scene" alt="World"><div class="jeux" hidden></div><div class="hud" aria-label="Readings">
      <div><small>HEART</small><strong data-v="hr">--</strong><em>BPM</em></div>
      <div><small>POWER</small><strong data-v="watts">0</strong><em data-u="watts">W</em></div>
      <div><small>CADENCE</small><strong data-v="rpm">0</strong><em>RPM</em></div>
      <div><small>SPEED</small><strong data-v="speed">0,0</strong><em data-u="speed">KM/H</em></div></div></div>
    <div class="panel"><svg aria-label="Cabinet instruments" role="img"></svg></div>
    <div class="cmd" aria-hidden="true"><i class="halo joy"></i><i class="halo moins"></i><i class="halo plus"></i></div>
    <div class="msg" role="alert"></div></div>`;
  const $ = (s) => conteneur.querySelector(s);
  const machine = $(".machine"), cab = $(".cab"), ecran = $(".screen"), scene = $(".scene"), svg = $(".panel svg"), msg = $(".msg");
  let borne = BORNES[0], monde = MONDES[0], vue = "menu", rendu = 0, tAnim = 0, premier = true;
  const aff = { hr: 0, watts: 0, rpm: 0, speed: 0 };      // valeurs affichées (lissées pour des aiguilles fluides)
  const textes = {};
  const halos = { joy: $(".halo.joy"), moins: $(".halo.moins"), plus: $(".halo.plus") };
  const ctl = $(".ctl"), cmdBloc = $(".cmd");
  const minuteurs = {}; let dirJoy = 0, etatJoy = "";
  // Les halos se placent sur les vrais boutons de l'image ; leur diamètre dépasse un peu le bouton.
  function placerCmd(b, v) {
    const c = b.cmd && b.cmd[v];
    for (const k in halos) {
      const h = halos[k];
      if (!c) { h.style.display = "none"; continue; }
      h.style.display = ""; h.style.left = c[k][0] + "%"; h.style.top = c[k][1] + "%";
      h.style.width = h.style.height = (c[k][2] * 2.7).toFixed(2) + "cqw";
    }
  }
  // Un changement de rapport allume le bouton pressoir correspondant (le joystick ne sert pas aux rapports).
  function signal(nom) {
    if (nom === "boost") {                 // le joystick a été poussé vers l'écran : bref passage de la manette (pas pendant tout le boost)
      clearTimeout(minuteurs.haut); flash.haut = true; majCommandes();
      minuteurs.haut = setTimeout(() => { flash.haut = false; majCommandes(); }, 220); return;
    }
    const h = halos[nom]; if (!h) return;
    h.classList.add("on"); clearTimeout(minuteurs[nom]); minuteurs[nom] = setTimeout(() => { h.classList.remove("on"); flash[nom] = false; majCommandes(); }, 220);
    flash[nom] = true; majCommandes();
  }
  // Joystick à gauche / à droite (dir = −1, +1, ou 0 au relâchement) : pas encore d'action, seulement le halo.
  function joystick(dir) { dirJoy = dir; majJoy(true); majCommandes(); }
  function joystickHaut(v) { tenuHaut = v; majCommandes(); }
  // Joystick : gauche/droite = pas encore d'action (le halo penche), haut = boost (tant qu'il dure), bas = frein (tant qu'il est tenu).
  let boostActif = false, freinTenu = false;
  function majJoy(force) {
    const h = halos.joy;
    const etat = freinTenu || flashBas ? "frein" : boostActif ? "boost" : dirJoy ? "rapport" : "";
    const cle = etat + dirJoy;
    if (cle === etatJoy && !force) return;
    etatJoy = cle;
    h.classList.toggle("frein", etat === "frein"); h.classList.toggle("boost", etat === "boost");
    h.classList.toggle("on", etat !== "");
    const dx = etat === "frein" || etat === "boost" ? 0 : dirJoy * 0.9, dy = etat === "frein" ? 0.9 : etat === "boost" ? -0.9 : 0;
    h.style.transform = "translate(-50%,-50%) translate(" + dx + "cqw," + dy + "cqw)";
    majCommandes();
  }

  // ---- vrais sprites des commandes (borne années 90, vue menu) : dessinés sur un canevas posé sur l'image de la borne ----
  // Trois présentations, au choix : sprites + halos, sprites seuls, halos seuls (l'ancien rendu).
  const flash = { moins: false, plus: false, haut: false }, tenu = { moins: false, plus: false };
  let tenuHaut = false;                                        // touche de boost maintenue      // bouton enfoncé : changement de rapport récent / pointeur maintenu
  let flashDir = null, flashBas = false;                       // actions de jeu venues du clavier : le joystick s'incline un instant
  let modeCmd = "sprites", cmdEtat = "non", cmdImgs = null, dragPose = "center", cleCmd = "";
  const spritesActifs = () => !!(cmdEtat === "pret" && modeCmd !== "halos" && borne.commandes && (vue === borne.commandes.vue || (vue === "jeu" && borne.commandes.jeu)));
  const poseJoy = () => freinTenu ? "down" : (flash.haut || tenuHaut) ? "up" : flashDir ? flashDir : dragPose !== "center" ? dragPose : dirJoy < 0 ? "left" : dirJoy > 0 ? "right" : "center";
  async function chargerCommandes() {
    const c = borne.commandes;
    if (!c || cmdEtat === "charge" || cmdEtat === "pret" || modeCmd === "halos") return;
    cmdEtat = "charge";
    try {
      const d = ART + c.dossier;
      if (!scope.CONTROL_ANCHORS) await chargerScript(d + "anchors.js");
      const [joystick, boutons, propre] = await Promise.all(["joystick.png", "boutons.png", "borne-sans-commandes.png"].map((f) => chargerImage(d + f)));
      cmdImgs = { joystick, boutons, propre }; cmdEtat = "pret";
    } catch (e) { cmdEtat = "echec"; erreur(e); }
    majCommandes(true);
  }
  function dessinerSprite(g, planche, a, x, y) {
    const [sx, sy, sw, sh] = a.crop, k = a.scale;
    g.drawImage(planche, sx, sy, sw, sh, x + (sx - a.anchor[0]) * k, y + (sy - a.anchor[1]) * k, sw * k, sh * k);
  }
  function majCommandes(force) {
    const actif = spritesActifs();
    ctl.classList.toggle("actif", actif);
    cmdBloc.style.display = actif && modeCmd === "sprites" ? "none" : "";
    if (!actif) { cleCmd = ""; return; }
    const pose = poseJoy(), jaune = flash.moins || tenu.moins, orange = flash.plus || tenu.plus;
    const cle = pose + "|" + jaune + "|" + orange;
    if (cle === cleCmd && !force) return;
    cleCmd = cle;
    const c = borne.commandes, A = scope.CONTROL_ANCHORS, g = ctl.getContext("2d");
    g.clearRect(0, 0, 1024, 1536);
    if (vue === "jeu") {                                        // grand écran : panneau décalé, seules les zones des commandes sont recouvertes
      const J = c.jeu;
      for (const [rx, ry, rw, rh] of J.rects) g.drawImage(cmdImgs.propre, rx, ry - J.dyBtn, rw, rh, rx, ry, rw, rh);
      dessinerSprite(g, cmdImgs.joystick, A.joystick[pose], c.joy[0], c.joy[1] + J.dyJoy);
      dessinerSprite(g, cmdImgs.boutons, A.buttons["yellow-" + (jaune ? "down" : "up")], c.jaune[0], c.jaune[1] + J.dyBtn);
      dessinerSprite(g, cmdImgs.boutons, A.buttons["orange-" + (orange ? "down" : "up")], c.orange[0], c.orange[1] + J.dyBtn);
      return;
    }
    g.save(); g.beginPath(); c.patch.polygone.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    g.drawImage(cmdImgs.propre, 175, 975, 675, 138, 175, 975, 675, 138); g.restore();
    const [rx, ry, rw, rh] = c.patch.rect; g.drawImage(cmdImgs.propre, rx, ry, rw, rh, rx, ry, rw, rh);
    dessinerSprite(g, cmdImgs.joystick, A.joystick[pose], c.joy[0], c.joy[1]);
    dessinerSprite(g, cmdImgs.boutons, A.buttons["yellow-" + (jaune ? "down" : "up")], c.jaune[0], c.jaune[1]);
    dessinerSprite(g, cmdImgs.boutons, A.buttons["orange-" + (orange ? "down" : "up")], c.orange[0], c.orange[1]);
  }
  function reglerCommandes(m) {
    if (!["sprites-halos", "sprites", "halos"].includes(m)) return;
    modeCmd = m; if (m !== "halos") chargerCommandes();
    majCommandes(true);
  }
  // Souris / doigt sur la borne : jaune = rapport −, orange = rapport +, joystick vers l'écran = boost, vers le joueur = frein tenu,
  // gauche/droite = pas encore d'action. « actions » est branché par l'application (rapport, boost, frein).
  const actions = { moins() {}, plus() {}, boost() {}, frein() {}, gauche() {}, droite() {}, jeu() {} };      // jeu(action) : commandes de la console portable
  let glisse = null;
  const pointeur = (e) => { const r = ctl.getBoundingClientRect(); return { x: (e.clientX - r.left) * 1024 / r.width, y: (e.clientY - r.top) * 1536 / r.height }; };
  const zoneDe = (p) => {
    const z = borne.commandes && borne.commandes.zones; if (!z) return null;
    const dy = vue === "jeu" && borne.commandes.jeu ? borne.commandes.jeu.dyBtn : 0; if (p.y < z.y[0] + dy || p.y > z.y[1] + dy) return null;
    return p.x >= z.joy[0] && p.x <= z.joy[1] ? "joy" : p.x >= z.jaune[0] && p.x <= z.jaune[1] ? "jaune" : p.x >= z.orange[0] && p.x <= z.orange[1] ? "orange" : null;
  };
  function lacher() {
    if (!glisse) return;
    if (glisse.type === "jaune") tenu.moins = false; else if (glisse.type === "orange") tenu.plus = false;
    else if (glisse.type === "joy") { if (glisse.frein) actions.frein(false); dragPose = "center"; }
    glisse = null; majCommandes();
  }
  ctl.addEventListener("pointerdown", (e) => {
    if (!spritesActifs()) return;
    const z = zoneDe(pointeur(e)); if (!z) return;
    e.preventDefault(); ctl.setPointerCapture(e.pointerId);
    const p = pointeur(e);
    if (z === "jaune") { glisse = { type: "jaune" }; tenu.moins = true; actions.moins(); }
    else if (z === "orange") { glisse = { type: "orange" }; tenu.plus = true; actions.plus(); }
    else glisse = { type: "joy", x: p.x, y: p.y, frein: false, boost: false };
    majCommandes();
  });
  ctl.addEventListener("pointermove", (e) => {
    const p = pointeur(e);
    if (!glisse) { ctl.style.cursor = spritesActifs() && zoneDe(p) ? "pointer" : "default"; return; }
    if (glisse.type !== "joy") return;
    const dx = p.x - glisse.x, dy = p.y - glisse.y;
    const pose = Math.max(Math.abs(dx), Math.abs(dy)) < 8 ? "center" : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
    if (pose === "up" && !glisse.boost) { glisse.boost = true; actions.boost(); }
    if (pose === "down" && !glisse.frein) { glisse.frein = true; actions.frein(true); }
    if (pose !== "down" && glisse.frein) { glisse.frein = false; actions.frein(false); }
    if (pose !== "up") glisse.boost = false;
    if (pose !== glisse.pose) { if (pose === "left") actions.gauche(); else if (pose === "right") actions.droite(); glisse.pose = pose; }
    dragPose = pose;
    majCommandes();
  });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) ctl.addEventListener(ev, lacher);

  // Action de jeu venue du clavier : le joystick et les boutons de la borne s'animent un instant (sprites ou halos).
  function animerAction(a) {
    if (a === "a") signal("plus"); else if (a === "b") signal("moins"); else if (a === "haut") signal("boost");
    else if (a === "gauche" || a === "droite" || a === "bas") {
      clearTimeout(minuteurs.dir); flashDir = a === "gauche" ? "left" : a === "droite" ? "right" : "down";
      if (a === "bas") flashBas = true; else joystick(a === "gauche" ? -1 : 1);
      majJoy(true); majCommandes();
      minuteurs.dir = setTimeout(() => { flashDir = null; flashBas = false; joystick(0); majJoy(true); majCommandes(); }, 180);
    }
  }
  const erreur = (e) => { msg.textContent = "⚠ " + e.message; };
  function placer(r) { ["left", "top", "width", "height"].forEach((k, i) => { ecran.style[k] = r[i] + "%"; }); }
  // La borne et la vue voulues sont notées tout de suite ; l'affichage change une fois l'image chargée.
  // Si un autre choix est arrivé entre-temps, la réponse périmée est ignorée.
  const voulu = { b: BORNES[0], v: "menu" }, pupitres = {}, ecouteursBorne = [];
  // Console portable : un canevas par format d'écran, créé à la demande (Pupitre charge ses images).
  async function preparerPupitre(modele) {
    if (!pupitres[modele]) {
      if (!scope.Pupitre || !scope.POCKET_ATLAS) throw new Error("handheld console scripts not found (art/bornes-jeux/console-portable)");
      pupitres[modele] = scope.Pupitre.creer($('.pup[data-p="' + modele + '"]'), { modele, base: ART + "bornes-jeux/console-portable/", surAction: (a) => actions.jeu(a) });
    }
    await pupitres[modele];
  }
  async function appliquer() {
    const b = voulu.b, v = voulu.v;
    try {
      let src = null;
      if (b.pupitre) await preparerPupitre(b.pupitre[v]); else src = await pre(DOSSIER + imageBorne(b, v));
      if (b !== voulu.b || v !== voulu.v) return;
      if (src) cab.src = src;
      cab.hidden = !!b.pupitre; machine.querySelectorAll(".pup").forEach((c) => { c.hidden = !(b.pupitre && c.dataset.p === b.pupitre[v]); });
      borne = b; vue = v; machine.dataset.style = b.id; machine.dataset.vue = v;
      machine.style.setProperty("--accent", b.accent); placer(b.vues[v]); placerCmd(b, v); msg.textContent = ""; rendu = 0;
      if (b.commandes && modeCmd !== "halos") chargerCommandes(); majCommandes(true);
      for (const f of ecouteursBorne) f(b.id, v);
    } catch (e) { erreur(e); }
  }
  async function choisirBorne(id) { const b = BORNES.find((x) => x.id === id && x.debloque); if (b) { voulu.b = b; await appliquer(); } }
  async function choisirVue(v) { if (v === "menu" || v === "jeu") { voulu.v = v; await appliquer(); } }
  async function choisirMonde(id) {
    const m = MONDES.find((x) => x.id === id && x.debloque); if (!m) return;
    try { scene.src = await pre(DOSSIER + m.image); monde = m; scene.alt = m.nom; msg.textContent = ""; }
    catch (e) { erreur(e); }
  }
  function ecrire(cle, valeur) { if (textes[cle] !== valeur) { textes[cle] = valeur; const el = $('[data-v="' + cle + '"]'); if (el) el.textContent = valeur; } }

  return {
    bornes: () => BORNES.filter((b) => b.debloque), mondes: () => MONDES.filter((m) => m.debloque),
    pastilles: () => BORNES.filter((b) => b.debloque).map((b) => ({ id: b.id, nom: b.nom, couleur: PASTILLES[b.id] || b.accent })),
    zoneJeux: () => $(".jeux"), afficherJeux(oui) { $(".jeux").hidden = !oui; }, surChangement(f) { ecouteursBorne.push(f); },
    signal, joystick, joystickHaut, animerAction, reglerCommandes, commandes: () => modeCmd, actions, choisirBorne, choisirVue, vue: () => vue, choisirMonde, borneId: () => borne.id, mondeId: () => monde.id,
    async charger() {
      await chargerScript(DOSSIER + "instruments.js");
      await appliquer(); await choisirMonde(monde.id);
    },
    maj(dt, S) {
      const k = premier ? 1 : 1 - Math.exp(-dt / 0.8);      // au tout premier affichage, pas de glissement depuis 0
      premier = false;
      aff.watts += (S.puissance - aff.watts) * k; aff.rpm += (S.cadence - aff.rpm) * k;
      aff.speed += (S.vitesseKmh - aff.speed) * k; aff.hr = S.fc;
      tAnim += dt * 0.75;
    },
    dessiner(S) {
      ecrire("hr", aff.hr > 0 ? String(Math.round(aff.hr)) : "--");
      ecrire("watts", String(Math.round(aff.watts)));
      ecrire("rpm", String(Math.round(aff.rpm)));
      ecrire("speed", aff.speed.toFixed(1));
      const u = $('[data-u="watts"]'), cible = S.cible ? "W · cible " + S.cible : "W";
      if (textes.u !== cible) { textes.u = cible; u.textContent = cible; }
      if (S.boost) { boostActif = S.boost.actif; freinTenu = !!S.frein; majJoy(); }
      const us = $('[data-u="speed"]'), vit = "KM/H · " + (S.rapportActif ? "R " + S.rapport : "ERG " + (100 + S.ajustErg) + "%") + (S.boost && S.boost.actif ? " · BOOST" : "");
      if (textes.us !== vit) { textes.us = vit; us.textContent = vit; }
      const maintenant = performance.now();
      if (scope.MicroInstruments && maintenant - rendu > 100) {      // les instruments se redessinent à 10 images par seconde
        rendu = maintenant;
        scope.MicroInstruments.render(svg, borne.id, vue, { hr: aff.hr, watts: aff.watts, rpm: aff.rpm, speed: aff.speed }, tAnim, true);
      }
    }
  };
}

scope.ModeArcade = { creer: creerArcade, BORNES, MONDES };
})(window);
