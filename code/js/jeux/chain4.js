"use strict";
/* =====================================================================
   CHAIN FOUR : logique pure du jeu d'alignement de pions (7 colonnes × 6 rangées), sans dépendance au navigateur.
   Le joueur est « 1 », l'ordinateur « 2 ». Aucune contrainte de temps : le jeu attend, et se sauvegarde / se reprend tel quel.
   L'adversaire est volontairement simple (profondeur 3, avec un peu de hasard entre coups équivalents).
   ===================================================================== */
(function (scope) {

const COLS = 7, LIGNES = 6, JOUEUR = 1, ORDI = 2;

function nouvelle() {
  return { grille: Array.from({ length: LIGNES }, () => Array(COLS).fill(0)), historique: [], gagnant: 0, ligne: null, nul: false };
}
const copie = (e) => ({ grille: e.grille.map((r) => r.slice()), historique: e.historique.slice(), gagnant: e.gagnant, ligne: e.ligne, nul: e.nul });
const tour = (e) => (e.historique.length % 2 === 0 ? JOUEUR : ORDI);            // le joueur commence
const rangeeLibre = (e, c) => { for (let r = LIGNES - 1; r >= 0; r--) if (!e.grille[r][c]) return r; return -1; };
const colonnesJouables = (e) => (e.gagnant || e.nul ? [] : [...Array(COLS).keys()].filter((c) => rangeeLibre(e, c) >= 0));

// Quatre pions alignés passant par (r, c) : retourne les 4 cases, ou null.
function alignement(g, r, c) {
  const v = g[r][c]; if (!v) return null;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cases = [[r, c]];
    for (const s of [1, -1]) for (let k = 1; k < 4; k++) {
      const rr = r + dr * k * s, cc = c + dc * k * s;
      if (rr < 0 || rr >= LIGNES || cc < 0 || cc >= COLS || g[rr][cc] !== v) break;
      cases.push([rr, cc]);
    }
    if (cases.length >= 4) return cases;
  }
  return null;
}

// Pose un pion dans la colonne c pour le joueur dont c'est le tour. Retourne { r, c } ou null si impossible.
function jouer(e, c) {
  if (e.gagnant || e.nul || c < 0 || c >= COLS) return null;
  const r = rangeeLibre(e, c); if (r < 0) return null;
  const j = tour(e); e.grille[r][c] = j; e.historique.push(c);
  const al = alignement(e.grille, r, c);
  if (al) { e.gagnant = j; e.ligne = al; } else if (e.historique.length === COLS * LIGNES) e.nul = true;
  return { r, c };
}
// Annule le dernier coup (un seul). Retourne true si quelque chose a été annulé.
function annulerUn(e) {
  if (!e.historique.length) return false;
  const c = e.historique.pop(), r = rangeeLibre(e, c) + 1;
  e.grille[r][c] = 0; e.gagnant = 0; e.ligne = null; e.nul = false; return true;
}
// Annule un « tour » : le coup de l'ordinateur puis celui du joueur (ou seulement celui du joueur s'il a gagné / si l'ordi n'a pas joué).
function annulerTour(e) {
  if (!e.historique.length) return false;
  if (tour(e) === JOUEUR && e.historique.length >= 2) { annulerUn(e); annulerUn(e); return true; }
  return annulerUn(e);
}

// ---- adversaire ----
const ORDRE = [3, 2, 4, 1, 5, 0, 6];                                              // préférence pour le centre
function evaluer(g, j) {                                                          // score statique du point de vue de j
  const adv = j === JOUEUR ? ORDI : JOUEUR; let s = 0;
  for (let r = 0; r < LIGNES; r++) if (g[r][3] === j) s += 3; else if (g[r][3] === adv) s -= 3;
  const fen = (cases) => {
    let a = 0, b = 0; for (const [r, c] of cases) { if (g[r][c] === j) a++; else if (g[r][c] === adv) b++; }
    if (a && b) return 0; if (a === 3) return 5; if (a === 2) return 2; if (b === 3) return -6; if (b === 2) return -2; return 0;
  };
  for (let r = 0; r < LIGNES; r++) for (let c = 0; c < COLS; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cases = []; for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= LIGNES || cc < 0 || cc >= COLS) break; cases.push([rr, cc]); }
    if (cases.length === 4) s += fen(cases);
  }
  return s;
}
function negamax(e, prof, alpha, beta, j) {
  if (e.gagnant) return e.gagnant === j ? 10000 + prof : -10000 - prof;
  if (e.nul || prof === 0) return evaluer(e.grille, j);
  let meilleur = -Infinity;
  for (const c of ORDRE) {
    if (rangeeLibre(e, c) < 0) continue;
    jouer(e, c); const v = -negamax(e, prof - 1, -beta, -alpha, j === ORDI ? JOUEUR : ORDI); annulerUn(e);
    if (v > meilleur) meilleur = v; if (v > alpha) alpha = v; if (alpha >= beta) break;
  }
  return meilleur;
}
// Coup de l'ordinateur : gagne s'il peut, sinon bloque, sinon profondeur 3 ; au hasard parmi les coups équivalents.
function coupOrdi(e, hasard) {
  const rnd = hasard || Math.random, j = tour(e), libres = colonnesJouables(e); if (!libres.length) return -1;
  const w = copie(e); let notes = [];
  for (const c of libres) { jouer(w, c); const v = w.gagnant === j ? 100000 : -negamax(w, 2, -Infinity, Infinity, j === ORDI ? JOUEUR : ORDI); annulerUn(w); notes.push([c, v]); }
  const max = Math.max(...notes.map((n) => n[1])), bons = notes.filter((n) => n[1] >= max - 1).map((n) => n[0]);
  return bons[Math.floor(rnd() * bons.length)];
}

function serialiser(e) { return JSON.stringify({ v: 1, historique: e.historique }); }
function restaurer(texte) {
  try {
    const d = JSON.parse(texte); if (!d || d.v !== 1 || !Array.isArray(d.historique) || d.historique.length > COLS * LIGNES) return null;
    const e = nouvelle(); for (const c of d.historique) { if (!Number.isInteger(c) || !jouer(e, c)) return null; }
    return e;
  } catch (err) { return null; }
}

scope.Chain4 = { COLS, LIGNES, JOUEUR, ORDI, nouvelle, copie, tour, jouer, annulerUn, annulerTour, rangeeLibre, colonnesJouables, coupOrdi, serialiser, restaurer };
if (typeof module !== "undefined") module.exports = scope.Chain4;
})(typeof window === "undefined" ? globalThis : window);
