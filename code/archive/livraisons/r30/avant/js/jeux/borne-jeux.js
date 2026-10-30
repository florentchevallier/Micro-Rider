"use strict";
/* =====================================================================
   BORNE DE JEUX : ce qui se passe à l'écran de la borne d'arcade.
   - un MENU des jeux (croix : choisir, A : lancer) ;
   - le jeu choisi, ajusté à l'écran de la borne (bandes sombres si les proportions diffèrent) ;
   - une VEILLE : après un moment sans action dans le menu, l'écran laisse la place au diaporama des « mondes » (images conceptuelles) ;
     la première action réveille la borne.
   Les commandes arrivent sous forme d'actions abstraites (haut, bas, gauche, droite, a, b, menu, quitter) : clavier (entrees.js),
   boutons dessinés de la console portable ou de la borne Années 90 (voir pupitre.js, mode-arcade.js).
   « quitter » (touche Select de la console, bouton « ↩ Jeux ») ramène du jeu au menu.
   ===================================================================== */
(function (scope) {

const L = 520, H = 626;                                          // taille logique du menu (même rapport que le petit écran de la console)
const JEUX = [
  { id: "chain4", nom: "CHAIN FOUR", sous: "Puissance 4 contre l'ordinateur", vue: "menu", creer: (c, o) => scope.Chain4Ecran.creer(c, o), icone: "chain4" },
  { id: "bataille", nom: "BATAILLE NAVALE", sous: "Terrain 6 × 8 · 4 bateaux", vue: "jeu", creer: (c, o) => scope.BatailleEcran.creer(c, o), icone: "bataille" },
  { id: "veille", nom: "MONDES", sous: "Le diaporama des images de la borne", vue: null, icone: "veille" }
];
const COUL = { fond: "#06122b", fond2: "#0b2147", carte: "#0e2a55", carteSel: "#14407a", bord: "#2c5a98", texte: "#eaf3ff", doux: "#8ea6c8", accent: "#6fe8df", chaud: "#ffd24a" };

function creer(zone, opts) {
  opts = opts || {};
  const inactiviteMs = opts.inactiviteMs == null ? 45000 : opts.inactiviteMs, diapoMs = opts.diapoMs == null ? 9000 : opts.diapoMs, langue = opts.langue || "fr";
  const menu = document.createElement("canvas"); menu.width = L; menu.height = H;
  const g = menu.getContext("2d");
  let etat = "menu", ouvert = false, sel = 0, jeu = null, jeuCanvas = null, jeuId = null, dernierGeste = performance.now(), tDiapo = 0, raf = 0, chrono = null;

  // ---- ajustement à l'écran de la borne ----
  function ajuster() {
    const c = jeuCanvas && etat === "jeu" ? jeuCanvas : menu, lw = c === menu ? L : jeu.L, lh = c === menu ? H : jeu.H;
    const w = zone.clientWidth, h = zone.clientHeight; if (!w || !h) return;
    const k = Math.min(w / lw, h / lh);
    c.style.width = Math.floor(lw * k) + "px"; c.style.height = Math.floor(lh * k) + "px";
  }
  if (window.ResizeObserver) new ResizeObserver(ajuster).observe(zone);
  window.addEventListener("resize", ajuster);

  // ---- menu ----
  const texte = (t, x, y, taille, c, align) => { g.fillStyle = c || COUL.texte; g.font = "bold " + taille + "px monospace"; g.textAlign = align || "left"; g.fillText(t, x, y); g.textAlign = "left"; };
  function icone(id, x, y, s) {
    g.save(); g.translate(x, y);
    if (id === "chain4") {
      g.fillStyle = "#1d3f8f"; g.fillRect(0, 0, s, s * 0.86);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = (r + c) % 3 === 0 ? "#c2305a" : (r * 2 + c) % 3 === 1 ? "#ffd24a" : "#07102a"; g.beginPath(); g.arc(s * (0.14 + c * 0.24), s * (0.13 + r * 0.2), s * 0.085, 0, 7); g.fill(); }
    } else if (id === "bataille") {
      g.fillStyle = "#0f3a6e"; g.fillRect(0, 0, s, s); g.strokeStyle = "#1d5a98"; g.lineWidth = 1;
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * s / 4, 0); g.lineTo(i * s / 4, s); g.moveTo(0, i * s / 4); g.lineTo(s, i * s / 4); g.stroke(); }
      g.fillStyle = "#8fa3bd"; g.beginPath(); g.roundRect(s * 0.06, s * 0.31, s * 0.62, s * 0.18, s * 0.09); g.fill();
      g.fillStyle = "#ff5a3c"; g.beginPath(); g.arc(s * 0.8, s * 0.7, s * 0.1, 0, 7); g.fill();
    } else {
      g.fillStyle = "#6fb4ff"; g.fillRect(0, 0, s, s * 0.7); g.fillStyle = "#3d8f5a"; g.beginPath(); g.moveTo(0, s * 0.7); g.lineTo(s * 0.35, s * 0.25); g.lineTo(s * 0.6, s * 0.55); g.lineTo(s * 0.8, s * 0.35); g.lineTo(s, s * 0.7); g.closePath(); g.fill();
      g.fillStyle = "#ffd24a"; g.beginPath(); g.arc(s * 0.8, s * 0.17, s * 0.09, 0, 7); g.fill();
    }
    g.strokeStyle = COUL.bord; g.lineWidth = 2; g.strokeRect(0, 0, s, id === "chain4" ? s * 0.86 : (id === "veille" ? s * 0.7 : s)); g.restore();
  }
  function dessinerMenu(t) {
    const fond = g.createLinearGradient(0, 0, 0, H); fond.addColorStop(0, COUL.fond2); fond.addColorStop(1, COUL.fond); g.fillStyle = fond; g.fillRect(0, 0, L, H);
    texte("MICRO RIDER", L / 2, 66, 34, COUL.accent, "center"); texte("A R C A D E", L / 2, 96, 16, COUL.chaud, "center");
    JEUX.forEach((j, i) => {
      const y = 140 + i * 118, actif = i === sel;
      g.fillStyle = actif ? COUL.carteSel : COUL.carte; g.fillRect(24, y, L - 48, 104);
      g.strokeStyle = actif ? COUL.accent : COUL.bord; g.lineWidth = actif ? 3 : 1.5; g.strokeRect(24, y, L - 48, 104);
      icone(j.icone, 44, y + 14, 76);
      texte(j.nom, 140, y + 46, 24, actif ? COUL.texte : COUL.doux); texte(j.sous, 140, y + 74, 13, COUL.doux);
      if (actif && Math.floor(t / 400) % 2 === 0) texte("▶", 34, y + 60, 16, COUL.chaud, "left");
    });
    texte("▲▼ choisir    A jouer", L / 2, 560, 14, COUL.doux, "center");
    texte("Select : retour à ce menu", L / 2, 586, 11, COUL.doux, "center");
  }
  function boucle(t) { raf = 0; if (ouvert && etat === "menu") { dessinerMenu(t); raf = requestAnimationFrame(boucle); } }
  function demarrerBoucle() { if (!raf && ouvert && etat === "menu") raf = requestAnimationFrame(boucle); }

  // ---- états ----
  function montrerMenu() {
    if (jeu) { jeu.arreter(); jeu = null; jeuId = null; }
    jeuCanvas = null; etat = "menu"; zone.replaceChildren(menu); zone.hidden = false; opts.surVeille && opts.surVeille(false); ajuster(); demarrerBoucle();
  }
  function lancer(id) {
    const j = JEUX.find((x) => x.id === id); if (!j) return;
    if (j.id === "veille") { entrerVeille(); return; }
    jeuCanvas = document.createElement("canvas");
    jeu = j.creer(jeuCanvas, { langue }); jeuId = j.id; etat = "jeu";
    zone.replaceChildren(jeuCanvas); ajuster();
    if (j.vue && opts.surVue) opts.surVue(j.vue);                    // la borne prend le format d'écran qui convient au jeu
  }
  function entrerVeille() { etat = "veille"; tDiapo = performance.now(); zone.hidden = true; opts.surVeille && opts.surVeille(true); }
  function reveiller() { dernierGeste = performance.now(); montrerMenu(); }

  function action(a) {
    if (!ouvert) return;
    dernierGeste = performance.now();
    if (etat === "veille") { reveiller(); return; }                    // le réveil ne fait rien d'autre
    if (etat === "menu") {
      if (a === "haut") sel = (sel + JEUX.length - 1) % JEUX.length;
      else if (a === "bas") sel = (sel + 1) % JEUX.length;
      else if (a === "a") lancer(JEUX[sel].id);
      return;
    }
    if (a === "quitter") { montrerMenu(); return; }
    if (jeu) jeu.action(a);
  }
  function quitter() { if (ouvert && etat === "jeu") { dernierGeste = performance.now(); montrerMenu(); } }
  function activer(oui) {
    ouvert = !!oui;
    clearInterval(chrono);
    if (!ouvert) { if (raf) cancelAnimationFrame(raf); raf = 0; return; }
    dernierGeste = performance.now();
    if (etat === "veille") reveiller(); else if (etat === "menu") montrerMenu(); else ajuster();
    chrono = setInterval(() => {
      const t = performance.now();
      if (etat === "menu" && t - dernierGeste > inactiviteMs) entrerVeille();
      else if (etat === "veille" && t - tDiapo > diapoMs) { tDiapo = t; opts.suivant && opts.suivant(); }
    }, 500);
  }
  zone.replaceChildren(menu);

  return { action, activer, quitter, lancer, etat: () => etat, selection: () => JEUX[sel].id, jeuId: () => jeuId, jeu: () => jeu, ouvert: () => ouvert, jeux: () => JEUX.map((j) => j.id),
           reveil: () => { if (etat === "veille") reveiller(); }, ajuster };
}

scope.BorneJeux = { creer, JEUX };
if (typeof module !== "undefined") module.exports = scope.BorneJeux;
})(typeof window === "undefined" ? globalThis : window);
