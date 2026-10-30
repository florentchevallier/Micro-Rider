"use strict";
/* =====================================================================
   BATAILLE NAVALE : écran du jeu (format « haut » : 520 × 720, pour la borne grand écran) dessiné sur un canvas.
   Pilotage par actions (voir entrees.js) : la croix déplace le viseur sur la mer ennemie, a tire, b annule le dernier tour
   (au départ : b mélange ta flotte, a commence), menu propose une nouvelle partie. Aucune limite de temps ; partie sauvegardée.
   ===================================================================== */
(function (scope) {

const B = scope.Bataille;
const L = 520, H = 720;
const FORMAT = "haut";
const CLE_PARTIE = "micro-rider.jeu.bataille", CLE_SCORE = "micro-rider.jeu.bataille.score";
const TEXTES = {
  en: { titre: "BATTLESHIP", score: (v, d) => "You " + v + "  ·  CPU " + d, placement: "Your fleet", tien: "Your shot", ordi: "Computer is aiming", gagne: "You win!", perdu: "You lose…",
    eau: "Miss", touche: "Hit!", coule: (l) => "Sunk! (" + l + " cells)", deja: "Already fired there", annule: "Round undone", confirme: "New game?", mer: "ENEMY SEA", flotte: "YOUR FLEET", ennemis: "ENEMY SHIPS",
    toi: "You", ordiNom: "CPU", aidePlacement: "Enter: start   Back: shuffle fleet", aideJeu: "Arrows aim   Enter fire   Back undo   Esc new", aideConfirme: "Enter: yes     Back/Esc: no", aideFin: "Enter: play again     Back: undo" },
  fr: { titre: "BATAILLE NAVALE", score: (v, d) => "Toi " + v + "  ·  Ordi " + d, placement: "Ta flotte", tien: "À toi de tirer", ordi: "L'ordinateur vise", gagne: "Gagné !", perdu: "Perdu…",
    eau: "À l'eau", touche: "Touché !", coule: (l) => "Coulé ! (" + l + " cases)", deja: "Déjà tiré ici", annule: "Tour annulé", confirme: "Nouvelle partie ?", mer: "MER ENNEMIE", flotte: "TA FLOTTE", ennemis: "BATEAUX ENNEMIS",
    toi: "Toi", ordiNom: "Ordi", aidePlacement: "Entrée : commencer   Retour : mélanger", aideJeu: "Croix viser  Entrée tirer  Retour annuler  Échap nouvelle", aideConfirme: "Entrée : oui     Retour/Échap : non", aideFin: "Entrée : rejouer     Retour : annuler" }
};
const COUL = { fond: "#06122b", mer: "#0f3a6e", mer2: "#124479", ligne: "#1d5a98", bateau: "#8fa3bd", bateauBord: "#d5e1f0", touche: "#ff5a3c", eau: "#9fd6ff", texte: "#eaf3ff", doux: "#8ea6c8", accent: "#6fe8df", ordi: "#ffd24a", viseur: "#6fe8df" };
const X0 = 14, Y0 = 96, CASE = 64;                                  // mer principale : 6 × 64 = 384 de large, 8 × 64 = 512 de haut
const MX = 414, MY = 96, MC = 15;                                   // ta flotte en petit (colonne de droite)
const LETTRES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function creer(canvas, opts) {
  opts = opts || {};
  const T = TEXTES[opts.langue] || TEXTES.en, g = canvas.getContext("2d"), delaiIA = opts.delaiIA == null ? 800 : opts.delaiIA, hasard = opts.hasard || Math.random;
  const stock = {
    lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    ecrire(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible : sans conséquence */ } }
  };
  canvas.width = L; canvas.height = H;
  let e = B.restaurer(stock.lire(CLE_PARTIE) || "") || B.nouvelle(hasard);
  let score = { v: 0, d: 0 }; try { const s = JSON.parse(stock.lire(CLE_SCORE) || ""); if (s && [s.v, s.d].every(Number.isFinite)) score = s; } catch (err) { /* pas de score */ }
  let etat = e.tours.length ? "jeu" : "placement", curseur = [Math.floor(B.LIGNES / 2), Math.floor(B.COLS / 2)], minuteur = null, message = "", tMessage = 0, scoreCompte = false;
  let lastJ = "", lastO = "", flash = null;                          // flash : animation du dernier tir { camp, r, c, t0 }

  const sauver = () => stock.ecrire(CLE_PARTIE, B.serialiser(e));
  const sauverScore = () => stock.ecrire(CLE_SCORE, JSON.stringify(score));
  const dire = (txt, ms) => { message = txt; tMessage = performance.now() + (ms || 1800); };
  const nom = (r, c) => LETTRES[c] + (r + 1);
  const texteTir = (t) => (t.resultat === "eau" ? T.eau : t.resultat === "touche" ? T.touche : T.coule(t.bateau.l));

  function verifierFin() {
    if (!e.gagnant) return false;
    etat = "fin";
    if (!scoreCompte) { scoreCompte = e.gagnant === 1 ? "v" : "d"; score[scoreCompte]++; sauverScore(); }
    return true;
  }
  function tourOrdi() {
    etat = "ia"; clearTimeout(minuteur);
    minuteur = setTimeout(() => {
      if (etat !== "ia") return;
      const t = B.jouerOrdi(e, hasard); sauver();
      if (t) { lastO = T.ordiNom + " " + nom(t.r, t.c) + " : " + texteTir(t); flash = { camp: "o", r: t.r, c: t.c, t0: performance.now() }; }
      if (!verifierFin()) etat = "jeu";
    }, delaiIA);
  }
  function nouvellePartie() { clearTimeout(minuteur); e = B.nouvelle(hasard); etat = "placement"; scoreCompte = false; message = ""; lastJ = lastO = ""; flash = null; sauver(); }

  function action(a) {
    if (etat === "confirme") { if (a === "a") nouvellePartie(); else if (a === "b" || a === "menu") etat = "jeu"; return; }
    if (etat === "fin") {
      if (a === "a") nouvellePartie();
      else if (a === "b") { if (scoreCompte) { score[scoreCompte]--; scoreCompte = false; sauverScore(); } B.annulerTour(e); etat = "jeu"; lastJ = lastO = ""; sauver(); }
      return;
    }
    if (etat === "ia") return;                                         // l'ordinateur vise : on attend
    if (etat === "placement") {
      if (a === "a") { etat = "jeu"; dire(T.tien, 1200); }
      else if (a === "b") { B.melanger(e, hasard); sauver(); }
      return;
    }
    if (a === "gauche") curseur[1] = Math.max(0, curseur[1] - 1);
    else if (a === "droite") curseur[1] = Math.min(B.COLS - 1, curseur[1] + 1);
    else if (a === "haut") curseur[0] = Math.max(0, curseur[0] - 1);
    else if (a === "bas") curseur[0] = Math.min(B.LIGNES - 1, curseur[0] + 1);
    else if (a === "a") {
      const t = B.tirer(e, curseur[0], curseur[1]);
      if (!t) { dire(T.deja, 1200); return; }
      lastJ = T.toi + " " + nom(t.r, t.c) + " : " + texteTir(t); lastO = ""; flash = { camp: "j", r: t.r, c: t.c, t0: performance.now() }; sauver();
      if (!verifierFin()) tourOrdi();
    } else if (a === "b") { if (B.annulerTour(e)) { lastJ = lastO = ""; sauver(); dire(T.annule, 1000); } }
    else if (a === "menu") { if (e.tours.length) etat = "confirme"; }
  }
  // La partie reprise est peut-être à l'ordinateur de jouer (fermée en pleine « visée »).
  if (e.gagnant) { etat = "fin"; scoreCompte = e.gagnant === 1 ? "v" : "d"; }
  else if (e.tours.length && !e.tours[e.tours.length - 1].o) tourOrdi();

  // ---------------- dessin ----------------
  const texte = (t, x, y, taille, c, align) => { g.fillStyle = c || COUL.texte; g.font = "bold " + taille + "px monospace"; g.textAlign = align || "left"; g.fillText(t, x, y); g.textAlign = "left"; };
  const cx = (c) => X0 + c * CASE + CASE / 2, cy = (r) => Y0 + r * CASE + CASE / 2;

  function mer(x0, y0, cs, maintenant) {
    for (let r = 0; r < B.LIGNES; r++) for (let c = 0; c < B.COLS; c++) { g.fillStyle = (r + c) % 2 ? COUL.mer : COUL.mer2; g.fillRect(x0 + c * cs, y0 + r * cs, cs, cs); }
    g.strokeStyle = COUL.ligne; g.lineWidth = 1; g.beginPath();
    for (let r = 0; r <= B.LIGNES; r++) { g.moveTo(x0, y0 + r * cs + .5); g.lineTo(x0 + B.COLS * cs, y0 + r * cs + .5); }
    for (let c = 0; c <= B.COLS; c++) { g.moveTo(x0 + c * cs + .5, y0); g.lineTo(x0 + c * cs + .5, y0 + B.LIGNES * cs); }
    g.stroke();
  }
  // Un bateau : coque arrondie qui couvre ses cases.
  function coque(b, x0, y0, cs, remplissage, bord, marge) {
    const rs = b.cases.map((p) => p[0]), ccs = b.cases.map((p) => p[1]);
    const r0 = Math.min(...rs), r1 = Math.max(...rs), c0 = Math.min(...ccs), c1 = Math.max(...ccs), m = marge;
    const x = x0 + c0 * cs + m, y = y0 + r0 * cs + m, w = (c1 - c0 + 1) * cs - 2 * m, h = (r1 - r0 + 1) * cs - 2 * m, rad = Math.min(w, h) / 2;
    g.beginPath(); g.roundRect(x, y, w, h, rad); g.fillStyle = remplissage; g.fill(); g.strokeStyle = bord; g.lineWidth = Math.max(1, cs / 20); g.stroke();
  }
  function marque(camp, r, c, x0, y0, cs, touche, maintenant, anime) {
    const x = x0 + c * cs + cs / 2, y = y0 + r * cs + cs / 2;
    const k = anime && flash && flash.camp === camp && flash.r === r && flash.c === c ? Math.min(1, (maintenant - flash.t0) / 450) : 1;
    if (touche) {
      g.fillStyle = COUL.touche; g.beginPath(); g.arc(x, y, cs * 0.3 * (0.4 + 0.6 * k), 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#fff3c0"; g.lineWidth = Math.max(1, cs / 16); g.beginPath(); const d = cs * 0.2; g.moveTo(x - d, y - d); g.lineTo(x + d, y + d); g.moveTo(x + d, y - d); g.lineTo(x - d, y + d); g.stroke();
      if (k < 1) { g.strokeStyle = "rgba(255,200,120," + (1 - k) + ")"; g.lineWidth = 3; g.beginPath(); g.arc(x, y, cs * (0.3 + 0.5 * k), 0, Math.PI * 2); g.stroke(); }
    } else {
      g.fillStyle = COUL.eau; g.beginPath(); g.arc(x, y, cs * 0.1, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(159,214,255," + (0.9 - 0.6 * k) + ")"; g.lineWidth = Math.max(1, cs / 22); g.beginPath(); g.arc(x, y, cs * (0.16 + 0.26 * k), 0, Math.PI * 2); g.stroke();
    }
  }
  function dessiner(maintenant) {
    g.fillStyle = COUL.fond; g.fillRect(0, 0, L, H);
    texte(T.titre, 14, 36, 25, COUL.accent);
    texte(T.score(score.v, score.d), L - 14, 34, 14, COUL.doux, "right");
    // ligne d'état
    let statut = T.tien, coul = COUL.texte;
    if (etat === "placement") { statut = T.placement; coul = COUL.accent; }
    else if (etat === "ia") { statut = T.ordi + ".".repeat(1 + Math.floor(maintenant / 350) % 3); coul = COUL.ordi; }
    else if (etat === "fin") { statut = e.gagnant === 1 ? T.gagne : T.perdu; coul = e.gagnant === 1 ? COUL.accent : COUL.ordi; }
    else if (etat === "confirme") { statut = T.confirme; coul = COUL.ordi; }
    texte(statut, 14, 62, 17, coul);
    texte(etat === "placement" ? T.flotte : T.mer, 14, 88, 11, COUL.doux);
    if (message && maintenant < tMessage) texte(message, L - 14, 62, 15, COUL.ordi, "right");

    // grande mer : la mer ennemie (ta flotte pendant le placement)
    mer(X0, Y0, CASE, maintenant);
    if (etat === "placement") {
      for (const b of e.flotte.j) coque(b, X0, Y0, CASE, COUL.bateau, COUL.bateauBord, 7);
    } else {
      const gj = B.grilleTirs(e, "j"), ennemis = B.bateaux(e, "j");
      for (const b of ennemis) if (b.coule || e.gagnant === 2) coque(b, X0, Y0, CASE, b.coule ? "rgba(255,90,60,.35)" : "rgba(143,163,189,.35)", b.coule ? COUL.touche : COUL.bateauBord, 7);
      for (let r = 0; r < B.LIGNES; r++) for (let c = 0; c < B.COLS; c++) if (gj[r][c]) marque("j", r, c, X0, Y0, CASE, gj[r][c] === 2, maintenant, true);
      if (etat === "jeu" || etat === "ia") {                              // viseur
        const x = X0 + curseur[1] * CASE, y = Y0 + curseur[0] * CASE, k = 0.5 + 0.5 * Math.sin(maintenant / 160);
        g.strokeStyle = etat === "jeu" ? COUL.viseur : COUL.doux; g.lineWidth = 3 + k; g.strokeRect(x + 3, y + 3, CASE - 6, CASE - 6);
        g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + CASE / 2, y + 10); g.lineTo(x + CASE / 2, y + CASE - 10); g.moveTo(x + 10, y + CASE / 2); g.lineTo(x + CASE - 10, y + CASE / 2); g.stroke();
      }
    }
    // repères des lignes et colonnes
    for (let c = 0; c < B.COLS; c++) texte(LETTRES[c], cx(c), Y0 + B.LIGNES * CASE + 16, 11, COUL.doux, "center");
    // colonne de droite : ta flotte en petit, puis les bateaux ennemis
    texte(T.flotte, MX, MY - 8, 10, COUL.doux);
    mer(MX, MY, MC, maintenant);
    for (const b of e.flotte.j) coque(b, MX, MY, MC, COUL.bateau, COUL.bateauBord, 2);
    const go = B.grilleTirs(e, "o");
    for (let r = 0; r < B.LIGNES; r++) for (let c = 0; c < B.COLS; c++) if (go[r][c]) marque("o", r, c, MX, MY, MC, go[r][c] === 2, maintenant, true);
    texte(T.ennemis, MX, MY + B.LIGNES * MC + 26, 10, COUL.doux);
    const bat = B.bateaux(e, "j");
    bat.forEach((b, i) => { for (let k = 0; k < b.l; k++) { g.fillStyle = b.coule ? COUL.touche : COUL.bateau; g.fillRect(MX + k * 17, MY + B.LIGNES * MC + 36 + i * 20, 15, 12); } });
    // derniers tirs et aide
    texte(lastJ, 14, 668, 13, COUL.texte); texte(lastO, 14, 688, 13, COUL.ordi);
    const aide = etat === "confirme" ? T.aideConfirme : etat === "fin" ? T.aideFin : etat === "placement" ? T.aidePlacement : T.aideJeu;
    texte(aide, L / 2, 710, etat === "jeu" || etat === "ia" ? 10 : 12, COUL.doux, "center");
  }
  let actif = true;
  function boucle(t) { if (!actif) return; dessiner(t); requestAnimationFrame(boucle); }
  requestAnimationFrame(boucle);

  return {
    FORMAT, L, H, action, etat: () => ({ etat, curseur: curseur.slice(), tours: e.tours.length, gagnant: e.gagnant, score: Object.assign({}, score), lastJ, lastO }),
    partie: () => e, arreter() { actif = false; clearTimeout(minuteur); }
  };
}

scope.BatailleEcran = { creer, FORMAT, L, H };
if (typeof module !== "undefined") module.exports = scope.BatailleEcran;
})(typeof window === "undefined" ? globalThis : window);
