"use strict";
/* =====================================================================
   CHAIN FOUR : écran du jeu (format « carré » : 520 × 626) dessiné sur un canvas.
   Pilotage par actions (voir entrees.js) : gauche / droite choisissent la colonne, bas ou a lâchent le pion,
   b annule le dernier tour, menu propose une nouvelle partie. Aucune limite de temps ; la partie est sauvegardée.
   ===================================================================== */
(function (scope) {

const A4 = scope.Chain4;
const L = 520, H = 626;                                           // taille logique de l'écran (même rapport que l'écran de la borne carrée)
const FORMAT = "carre";
const CLE_PARTIE = "micro-rider.jeu.chain4", CLE_SCORE = "micro-rider.jeu.chain4.score";
const TEXTES = {
  en: { titre: "CHAIN FOUR", score: (v, d, n) => "You " + v + "  ·  CPU " + d + (n ? "  ·  Draw " + n : ""), tien: "Your turn", ordi: "Computer is thinking", gagne: "You win!", perdu: "You lose…", nul: "Draw",
    confirme: "New game?", pleine: "Column full", annule: "Move undone",
    aideJeu: "◀ ▶ column   ▼/Enter drop   ⌫ undo   Esc new game", aideJeuBorne: "◀ ▶ column   ▼/Enter drop   ⌫ undo   Esc games", aideConfirme: "Enter: yes     Back/Esc: no", aideFin: "Enter: play again     Back: undo" },
  fr: { titre: "CHAIN FOUR", score: (v, d, n) => "Toi " + v + "  ·  Ordi " + d + (n ? "  ·  Nul " + n : ""), tien: "À toi de jouer", ordi: "L'ordinateur réfléchit", gagne: "Gagné !", perdu: "Perdu…", nul: "Match nul",
    confirme: "Nouvelle partie ?", pleine: "Colonne pleine", annule: "Coup annulé",
    aideJeu: "◀ ▶ colonne   ▼/Entrée jouer   ⌫ annuler   Échap nouvelle", aideJeuBorne: "◀ ▶ colonne   ▼/Entrée jouer   ⌫ annuler   Échap jeux", aideConfirme: "Entrée : oui     Retour/Échap : non", aideFin: "Entrée : rejouer     Retour : annuler" }
};
const COUL = { fond: "#06122b", plateau: "#1d3f8f", plateauBord: "#122a66", trou: "#07102a", joueur: "#c2305a", joueurClair: "#e8688b", ordi: "#ffd24a", ordiClair: "#fff0a0", texte: "#eaf3ff", doux: "#8ea6c8", accent: "#6fe8df" };
const X0 = 20, Y0 = 146, CASE = 68, R = 28;                       // plateau : 7 × 68 = 476 de large, 6 × 68 = 408 de haut

function creer(canvas, opts) {
  opts = opts || {};
  const T = TEXTES[opts.langue] || TEXTES.en, g = canvas.getContext("2d"), delaiIA = opts.delaiIA == null ? 650 : opts.delaiIA, hasard = opts.hasard || Math.random;
  const stock = {
    lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    ecrire(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible : sans conséquence */ } }
  };
  const son = (n) => { if (opts.son) opts.son(n); };
  canvas.width = L; canvas.height = H;
  let e = A4.restaurer(stock.lire(CLE_PARTIE) || "") || A4.nouvelle();
  let score = { v: 0, d: 0, n: 0 }; try { const s = JSON.parse(stock.lire(CLE_SCORE) || ""); if (s && [s.v, s.d, s.n].every(Number.isFinite)) score = s; } catch (err) { /* pas de score */ }
  let etat = "jeu", colonne = 3, anim = null, minuteur = null, message = "", tMessage = 0, scoreCompte = null;

  const sauver = () => { stock.ecrire(CLE_PARTIE, A4.serialiser(e)); };
  const sauverScore = () => stock.ecrire(CLE_SCORE, JSON.stringify(score));
  const dire = (txt, ms) => { message = txt; tMessage = performance.now() + (ms || 1800); };

  const cleScore = () => (e.gagnant === A4.JOUEUR ? "v" : e.gagnant === A4.ORDI ? "d" : "n");
  function verifierFin() {
    if (!(e.gagnant || e.nul)) return false;
    etat = "fin";
    if (!scoreCompte) { scoreCompte = cleScore(); score[scoreCompte]++; sauverScore(); son(e.gagnant === A4.JOUEUR ? "gagne" : e.gagnant === A4.ORDI ? "perdu" : "nul"); }
    return true;
  }
  // Pose un pion avec animation de chute ; `apres` est appelé quand il touche le fond.
  function poser(c, apres) {
    const j = A4.tour(e), pos = A4.jouer(e, c); if (!pos) return false;
    anim = { c, r: pos.r, j, y: Y0 - CASE, v: 0, apres }; son("poser");
    sauver(); return true;
  }
  function tourOrdi() {
    etat = "ia"; clearTimeout(minuteur);
    minuteur = setTimeout(() => {
      if (etat !== "ia") return;
      const c = A4.coupOrdi(e, hasard); if (c < 0) { verifierFin(); return; }
      poser(c, () => { if (!verifierFin()) etat = "jeu"; });
    }, delaiIA);
  }
  function nouvellePartie() { clearTimeout(minuteur); e = A4.nouvelle(); anim = null; etat = "jeu"; scoreCompte = null; message = ""; sauver(); }

  function action(a) {
    if (a === "gauche") { const c = Math.max(0, colonne - 1); if (c !== colonne) son("deplacer"); colonne = c; return; }
    if (a === "droite") { const c = Math.min(A4.COLS - 1, colonne + 1); if (c !== colonne) son("deplacer"); colonne = c; return; }
    if (anim) return;                                                  // un pion est en train de tomber
    if (etat === "confirme") { if (a === "a" || a === "bas") nouvellePartie(); else if (a === "b" || a === "menu") etat = "jeu"; return; }
    if (etat === "fin") {
      if (a === "a" || a === "bas") nouvellePartie();
      else if (a === "b") { if (scoreCompte) { score[scoreCompte]--; scoreCompte = null; sauverScore(); } A4.annulerTour(e); etat = "jeu"; sauver(); }
      return;
    }
    if (etat === "ia") return;                                         // l'ordinateur réfléchit : on attend
    if (a === "a" || a === "bas") {
      if (A4.rangeeLibre(e, colonne) < 0) { dire(T.pleine); son("erreur"); return; }
      poser(colonne, () => { if (!verifierFin()) tourOrdi(); });
    } else if (a === "b") { if (A4.annulerTour(e)) { sauver(); dire(T.annule, 1000); son("annule"); } }
    else if (a === "menu") { if (e.historique.length) etat = "confirme"; }
  }
  // La partie reprise est peut-être à l'ordinateur de jouer (fermée en pleine « réflexion »).
  if (e.gagnant || e.nul) { etat = "fin"; scoreCompte = cleScore(); } else if (A4.tour(e) === A4.ORDI) tourOrdi();

  // ---------------- dessin ----------------
  const texte = (t, x, y, taille, c, align) => { g.fillStyle = c || COUL.texte; g.font = "bold " + taille + "px monospace"; g.textAlign = align || "left"; g.fillText(t, x, y); g.textAlign = "left"; };
  const cx = (c) => X0 + c * CASE + CASE / 2, cy = (r) => Y0 + r * CASE + CASE / 2;
  function pion(x, y, j, eclat) {
    const clair = j === A4.JOUEUR ? COUL.joueurClair : COUL.ordiClair, base = j === A4.JOUEUR ? COUL.joueur : COUL.ordi;
    const grad = g.createRadialGradient(x - 8, y - 9, 3, x, y, R); grad.addColorStop(0, clair); grad.addColorStop(1, base);
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = eclat ? "#ffffff" : "rgba(0,0,0,.35)"; g.lineWidth = eclat ? 4 : 2; g.beginPath(); g.arc(x, y, R - 1, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.28)"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, R - 8, 0.9 * Math.PI, 1.5 * Math.PI); g.stroke();
  }
  function dessiner(maintenant) {
    g.fillStyle = COUL.fond; g.fillRect(0, 0, L, H);
    texte(T.titre, 20, 44, 30, COUL.accent);
    texte(T.score(score.v, score.d, score.n), L - 20, 40, 15, COUL.doux, "right");
    // ligne d'état
    let statut = T.tien, coul = COUL.texte;
    if (etat === "ia") { statut = T.ordi + ".".repeat(1 + Math.floor(maintenant / 350) % 3); coul = COUL.ordi; }
    else if (etat === "fin") { statut = e.gagnant === A4.JOUEUR ? T.gagne : e.gagnant === A4.ORDI ? T.perdu : T.nul; coul = e.gagnant === A4.JOUEUR ? COUL.accent : e.gagnant === A4.ORDI ? COUL.ordi : COUL.doux; }
    else if (etat === "confirme") { statut = T.confirme; coul = COUL.ordi; }
    else if (message && maintenant < tMessage) { statut = message; coul = COUL.ordi; }
    texte(statut, L / 2, 86, 24, coul, "center");
    // flèche de colonne
    if (etat === "jeu" || etat === "ia") {
      const x = cx(colonne), dy = Math.sin(maintenant / 260) * 3;
      g.fillStyle = etat === "jeu" ? COUL.joueurClair : COUL.doux; g.beginPath(); g.moveTo(x - 15, 106 + dy); g.lineTo(x + 15, 106 + dy); g.lineTo(x, 134 + dy); g.fill();
    }
    // pions déjà posés (sauf celui qui tombe), puis plateau percé par-dessus
    const gagnantes = e.ligne ? new Set(e.ligne.map(([r, c]) => r + "," + c)) : null, clignote = Math.floor(maintenant / 300) % 2 === 0;
    for (let r = 0; r < A4.LIGNES; r++) for (let c = 0; c < A4.COLS; c++) {
      const j = e.grille[r][c]; if (!j || (anim && anim.r === r && anim.c === c)) continue;
      pion(cx(c), cy(r), j, gagnantes && gagnantes.has(r + "," + c) && clignote);
    }
    if (anim) pion(cx(anim.c), anim.y, anim.j, false);
    g.fillStyle = COUL.plateau; g.strokeStyle = COUL.plateauBord; g.lineWidth = 4;
    g.beginPath(); g.rect(X0, Y0, A4.COLS * CASE, A4.LIGNES * CASE);
    for (let r = 0; r < A4.LIGNES; r++) for (let c = 0; c < A4.COLS; c++) { g.moveTo(cx(c) + R, cy(r)); g.arc(cx(c), cy(r), R, 0, Math.PI * 2, true); }
    g.fill("evenodd"); g.stroke();
    for (let r = 0; r < A4.LIGNES; r++) for (let c = 0; c < A4.COLS; c++) { g.strokeStyle = "rgba(0,0,0,.4)"; g.lineWidth = 2; g.beginPath(); g.arc(cx(c), cy(r), R, 0, Math.PI * 2); g.stroke(); }
    // bas d'écran : aide
    const aide = etat === "confirme" ? T.aideConfirme : etat === "fin" ? T.aideFin : opts.borne ? T.aideJeuBorne : T.aideJeu;
    texte(aide, L / 2, 598, etat === "jeu" || etat === "ia" ? 12 : 14, COUL.doux, "center");
  }
  let dernier = performance.now();
  function pas(maintenant) {
    const dt = Math.min(0.05, (maintenant - dernier) / 1000); dernier = maintenant;
    if (anim) {
      anim.v += 2600 * dt; anim.y += anim.v * dt; const but = cy(anim.r);
      if (anim.y >= but) { anim.y = but; const f = anim.apres; anim = null; son("toucheFond"); f && f(); }
    }
    dessiner(maintenant);
  }
  let actif = true;
  function boucle(t) { if (!actif) return; pas(t); requestAnimationFrame(boucle); }
  requestAnimationFrame(boucle);

  return {
    FORMAT, L, H, action, etat: () => ({ etat, colonne, tour: A4.tour(e), historique: e.historique.slice(), gagnant: e.gagnant, nul: e.nul, enChute: !!anim, score: Object.assign({}, score) }),
    partie: () => e, arreter() { actif = false; clearTimeout(minuteur); }
  };
}

scope.Chain4Ecran = { creer, FORMAT, L, H };
if (typeof module !== "undefined") module.exports = scope.Chain4Ecran;
})(typeof window === "undefined" ? globalThis : window);
