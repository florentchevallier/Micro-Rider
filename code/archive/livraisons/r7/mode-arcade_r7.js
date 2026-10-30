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
  { id: "original", nom: "Années 90", cle: "annees-90", accent: "#ffe36b", debloque: true,
    vues: { menu: [24.2, 15.7, 52.7, 47.6], jeu: [24.2, 15.7, 52.7, 65.5] },
    cmd: { menu: { joy: [31.4, 66.3, 3.4], moins: [62.5, 69.0, 3.8], plus: [71.8, 69.0, 3.8] },
           jeu: { joy: [31.4, 84.4, 3.4], moins: [62.5, 86.8, 3.8], plus: [71.8, 86.8, 3.8] } } },
  { id: "neon", nom: "Néon", cle: "neon", accent: "#60ecff", debloque: true,
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
           jeu: { joy: [23.2, 79.4, 3.9], moins: [77.6, 85.9, 3.7], plus: [76.7, 80.4, 3.7] } } }
];
const imageBorne = (b, vue) => "assets/bornes-propres/" + b.cle + "-" + vue + ".png";
const MONDES = [
  { id: "col-alpin", nom: "Col alpin", image: "assets/jeux/col-alpin.png", debloque: true },
  { id: "montagne-briques", nom: "Montagne en briques", image: "assets/jeux/montagne-briques.png", debloque: true },
  { id: "ville-miniature", nom: "Ville miniature", image: "assets/jeux/ville-miniature.png", debloque: true },
  { id: "ville-dessus", nom: "Ville · vue du dessus", image: "assets/jeux/ville-dessus.png", debloque: true },
  { id: "ville-3d", nom: "Ville · 3D urbaine", image: "assets/jeux/ville-3d.png", debloque: true },
  { id: "parc-isometrique", nom: "Parc · isométrique", image: "assets/jeux/parc-isometrique.png", debloque: true },
  { id: "table-miniature", nom: "Table · course miniature", image: "assets/jeux/table-miniature.png", debloque: true },
  { id: "ile-dinosaures", nom: "L'île aux dinosaures", image: "assets/jeux/ile-dinosaures.png", debloque: true },
  { id: "aventures-spatiales", nom: "Aventures spatiales", image: "assets/jeux/aventures-spatiales.png", debloque: true }
];

const CSS = `
.machine{position:relative;height:calc(100svh - 190px);min-height:420px;aspect-ratio:2/3;max-width:100%;margin:0 auto;container-type:inline-size;overflow:hidden}
.machine .cab{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;border-radius:12px}
.machine .screen{position:absolute;overflow:hidden;background:#020c17;border-radius:2.5%;box-shadow:inset 0 0 10px #000}
.machine[data-vue=menu] .screen{border-radius:5%}.machine[data-vue=menu] .hud{padding-top:5%}
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
.machine .msg{position:absolute;inset:auto 8% 6% 8%;color:#ffb4b4;font:12px monospace;text-align:center}
`;

function pre(url) {
  return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(url); im.onerror = () => no(new Error("image introuvable : " + url)); im.src = url; });
}
function chargerScript(url) {
  return new Promise((ok, no) => { const s = document.createElement("script"); s.src = url; s.onload = ok; s.onerror = () => no(new Error("fichier introuvable : " + url)); document.head.append(s); });
}

function creerArcade(conteneur) {
  const st = document.createElement("style"); st.textContent = CSS; document.head.append(st);
  conteneur.innerHTML = `<div class="machine" data-style="steampunk" data-vue="menu">
    <img class="cab" alt="Borne d'arcade">
    <div class="screen"><img class="scene" alt="Monde"><div class="hud" aria-label="Mesures">
      <div><small>CŒUR</small><strong data-v="hr">--</strong><em>BPM</em></div>
      <div><small>POWER</small><strong data-v="watts">0</strong><em data-u="watts">W</em></div>
      <div><small>CADENCE</small><strong data-v="rpm">0</strong><em>RPM</em></div>
      <div><small>SPEED</small><strong data-v="speed">0,0</strong><em data-u="speed">KM/H</em></div></div></div>
    <div class="panel"><svg aria-label="Instruments de la borne" role="img"></svg></div>
    <div class="cmd" aria-hidden="true"><i class="halo joy"></i><i class="halo moins"></i><i class="halo plus"></i></div>
    <div class="msg" role="alert"></div></div>`;
  const $ = (s) => conteneur.querySelector(s);
  const machine = $(".machine"), cab = $(".cab"), ecran = $(".screen"), scene = $(".scene"), svg = $(".panel svg"), msg = $(".msg");
  let borne = BORNES[0], monde = MONDES[0], vue = "menu", rendu = 0, tAnim = 0, premier = true;
  const aff = { hr: 0, watts: 0, rpm: 0, speed: 0 };      // valeurs affichées (lissées pour des aiguilles fluides)
  const textes = {};
  const halos = { joy: $(".halo.joy"), moins: $(".halo.moins"), plus: $(".halo.plus") };
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
  // Un changement de rapport allume le bouton correspondant et incline un instant le halo du joystick.
  function signal(nom) {
    const h = halos[nom]; if (!h) return;
    h.classList.add("on"); clearTimeout(minuteurs[nom]); minuteurs[nom] = setTimeout(() => h.classList.remove("on"), 220);
    dirJoy = nom === "plus" ? 1 : -1; majJoy(true);
    clearTimeout(minuteurs.joy); minuteurs.joy = setTimeout(() => { dirJoy = 0; majJoy(); }, 220);
  }
  // Joystick : gauche/droite = rapport (flash), haut = boost (tant qu'il dure), bas = frein (tant qu'il est tenu).
  let boostActif = false, freinTenu = false;
  function majJoy(force) {
    const h = halos.joy;
    const etat = freinTenu ? "frein" : boostActif ? "boost" : dirJoy ? "rapport" : "";
    const cle = etat + dirJoy;
    if (cle === etatJoy && !force) return;
    etatJoy = cle;
    h.classList.toggle("frein", etat === "frein"); h.classList.toggle("boost", etat === "boost");
    h.classList.toggle("on", etat !== "");
    const dx = etat === "frein" || etat === "boost" ? 0 : dirJoy * 0.9, dy = etat === "frein" ? 0.9 : etat === "boost" ? -0.9 : 0;
    h.style.transform = "translate(-50%,-50%) translate(" + dx + "cqw," + dy + "cqw)";
  }

  const erreur = (e) => { msg.textContent = "⚠ " + e.message; };
  function placer(r) { ["left", "top", "width", "height"].forEach((k, i) => { ecran.style[k] = r[i] + "%"; }); }
  // La borne et la vue voulues sont notées tout de suite ; l'affichage change une fois l'image chargée.
  // Si un autre choix est arrivé entre-temps, la réponse périmée est ignorée.
  const voulu = { b: BORNES[0], v: "menu" };
  async function appliquer() {
    const b = voulu.b, v = voulu.v;
    try {
      const src = await pre(DOSSIER + imageBorne(b, v));
      if (b !== voulu.b || v !== voulu.v) return;
      cab.src = src; borne = b; vue = v; machine.dataset.style = b.id; machine.dataset.vue = v;
      machine.style.setProperty("--accent", b.accent); placer(b.vues[v]); placerCmd(b, v); msg.textContent = ""; rendu = 0;
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
    signal, choisirBorne, choisirVue, vue: () => vue, choisirMonde, borneId: () => borne.id, mondeId: () => monde.id,
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
      ecrire("speed", aff.speed.toFixed(1).replace(".", ","));
      const u = $('[data-u="watts"]'), cible = S.cible ? "W · cible " + S.cible : "W";
      if (textes.u !== cible) { textes.u = cible; u.textContent = cible; }
      if (S.boost) { boostActif = S.boost.actif; freinTenu = !!S.frein; majJoy(); }
      const us = $('[data-u="speed"]'), vit = "KM/H · " + (S.rapportActif ? "R " + S.rapport : "ERG " + (S.ajustErg > 0 ? "+" : S.ajustErg < 0 ? "−" : "") + Math.abs(S.ajustErg) + "%") + (S.boost && S.boost.actif ? " · BOOST" : "");
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
