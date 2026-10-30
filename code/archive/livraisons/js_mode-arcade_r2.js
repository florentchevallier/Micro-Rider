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
// Chaque borne a deux vues : « menu » (borne entière et détaillée, petit écran, pour choisir et naviguer)
// et « jeu » (grand écran, pour regarder une vidéo pendant l'effort). Position de l'écran dans l'image,
// en % [gauche, haut, largeur, hauteur].
const BORNES = [
  { id: "steampunk", nom: "Steampunk", cle: "steampunk", accent: "#ffe2a3", debloque: true,
    vues: { menu: [24.5, 12.8, 51.3, 33.8], jeu: [24.5, 12.8, 51.3, 64.3] } },
  { id: "original", nom: "Années 90", cle: "annees-90", accent: "#ffe36b", debloque: true,
    vues: { menu: [24.2, 15.7, 52.7, 47.6], jeu: [24.2, 15.7, 52.7, 65.5] } },
  { id: "neon", nom: "Néon", cle: "neon", accent: "#60ecff", debloque: true,
    vues: { menu: [27, 12.8, 46.2, 33.6], jeu: [27, 12.8, 46.2, 60.2] } },
  { id: "cassette", nom: "Cassette", cle: "cassette", accent: "#78ffd0", debloque: true,
    vues: { menu: [20.8, 10.9, 58.3, 31.3], jeu: [20.8, 10.9, 58.3, 63.4] } },
  { id: "giscard", nom: "Giscard-punk", cle: "giscard", accent: "#ffc366", debloque: true,
    vues: { menu: [24.1, 14.5, 51.7, 26.2], jeu: [24.1, 14.5, 51.7, 57.5] } }
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
    <div class="msg" role="alert"></div></div>`;
  const $ = (s) => conteneur.querySelector(s);
  const machine = $(".machine"), cab = $(".cab"), ecran = $(".screen"), scene = $(".scene"), svg = $(".panel svg"), msg = $(".msg");
  let borne = BORNES[0], monde = MONDES[0], vue = "menu", rendu = 0, tAnim = 0, premier = true;
  const aff = { hr: 0, watts: 0, rpm: 0, speed: 0 };      // valeurs affichées (lissées pour des aiguilles fluides)
  const textes = {};

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
      machine.style.setProperty("--accent", b.accent); placer(b.vues[v]); msg.textContent = ""; rendu = 0;
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
    choisirBorne, choisirVue, vue: () => vue, choisirMonde, borneId: () => borne.id, mondeId: () => monde.id,
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
      const us = $('[data-u="speed"]'), vit = "KM/H · R " + S.rapport;
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
