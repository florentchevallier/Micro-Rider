"use strict";
/* =====================================================================
   BATAILLE NAVALE : logique pure (grille de 6 colonnes × 8 rangées, quatre bateaux de 4, 3, 3 et 2 cases), sans dépendance au navigateur.
   Le joueur (« j ») tire en premier ; un tir chacun par tour. Les flottes sont placées au hasard (`melanger` pour retirer
   la flotte du joueur tant que la partie n'a pas commencé). L'ordinateur (« o ») est malin mais battable : il tire en damier
   tant qu'il cherche, puis fouille autour des touches (en prolongeant la ligne dès que deux touches sont alignées).
   Aucune contrainte de temps. La partie est entièrement décrite par les deux flottes et la liste des tours (annulation facile).
   ===================================================================== */
(function (scope) {

// Taille du terrain et flotte : seuls réglages à changer pour un terrain plus grand (l'écran dessine d'après COLS et LIGNES).
const COLS = 6, LIGNES = 8, TAILLES = [4, 3, 3, 2];

// Place la flotte au hasard : [{ l, cases: [[r, c], ...] }, ...]. Les bateaux peuvent se toucher mais pas se chevaucher.
function placerFlotte(hasard) {
  hasard = hasard || Math.random;
  for (;;) {
    const pris = new Set(), flotte = [];
    let ok = true;
    for (const l of TAILLES) {
      let pose = null;
      for (let essai = 0; essai < 200 && !pose; essai++) {
        const horiz = hasard() < 0.5, r = Math.floor(hasard() * (horiz ? LIGNES : LIGNES - l + 1)), c = Math.floor(hasard() * (horiz ? COLS - l + 1 : COLS));
        const cases = Array.from({ length: l }, (_, k) => (horiz ? [r, c + k] : [r + k, c]));
        if (cases.every(([a, b]) => !pris.has(a + "," + b))) pose = cases;
      }
      if (!pose) { ok = false; break; }
      pose.forEach(([a, b]) => pris.add(a + "," + b)); flotte.push({ l, cases: pose });
    }
    if (ok) return flotte;
  }
}

function nouvelle(hasard) {
  return { flotte: { j: placerFlotte(hasard), o: placerFlotte(hasard) }, tours: [], gagnant: 0 };      // tours : [{ j: [r, c], o: [r, c] | null }]
}
// Avant le premier tir, le joueur peut retirer sa flotte (et seulement la sienne).
function melanger(e, hasard) { if (e.tours.length) return false; e.flotte.j = placerFlotte(hasard); return true; }

// Tirs portés PAR `qui` (« j » ou « o ») contre la flotte adverse, dans l'ordre.
const tirsDe = (e, qui) => { const l = []; for (const t of e.tours) if (t[qui]) l.push(t[qui]); return l; };
const cible = (qui) => (qui === "j" ? "o" : "j");          // la flotte visée par « qui »

// Grille 8 × 8 des tirs de `qui` : 0 inconnu, 1 à l'eau, 2 touché.
function grilleTirs(e, qui) {
  const g = Array.from({ length: LIGNES }, () => Array(COLS).fill(0)), occupe = new Set();
  for (const b of e.flotte[cible(qui)]) for (const [r, c] of b.cases) occupe.add(r + "," + c);
  for (const [r, c] of tirsDe(e, qui)) g[r][c] = occupe.has(r + "," + c) ? 2 : 1;
  return g;
}
// Bateaux de la flotte visée par `qui` : { l, cases, coule }.
function bateaux(e, qui) {
  const g = grilleTirs(e, qui);
  return e.flotte[cible(qui)].map((b) => ({ l: b.l, cases: b.cases, coule: b.cases.every(([r, c]) => g[r][c] === 2) }));
}
const dansGrille = (r, c) => r >= 0 && r < LIGNES && c >= 0 && c < COLS;

function verifierFin(e) {
  e.gagnant = bateaux(e, "j").every((b) => b.coule) ? 1 : bateaux(e, "o").every((b) => b.coule) ? 2 : 0;
  return e.gagnant;
}
// Résultat du dernier tir de `qui` : { r, c, resultat: "eau" | "touche" | "coule", bateau? }
function dernierTir(e, qui) {
  const l = tirsDe(e, qui); if (!l.length) return null;
  const [r, c] = l[l.length - 1], g = grilleTirs(e, qui);
  if (g[r][c] === 1) return { r, c, resultat: "eau" };
  const b = bateaux(e, qui).find((x) => x.cases.some(([a, d]) => a === r && d === c));
  return { r, c, resultat: b.coule ? "coule" : "touche", bateau: b };
}

// Tir du joueur en (r, c) : null si impossible (case déjà jouée, partie finie, ou tour de l'ordinateur).
function tirer(e, r, c) {
  if (e.gagnant || !dansGrille(r, c)) return null;
  const dernier = e.tours[e.tours.length - 1];
  if (dernier && !dernier.o && !e.gagnant) return null;                // l'ordinateur n'a pas encore répondu
  if (grilleTirs(e, "j")[r][c]) return null;
  e.tours.push({ j: [r, c], o: null });
  verifierFin(e);
  return dernierTir(e, "j");
}

// Choix de l'ordinateur (sans jouer) : [r, c].
function coupOrdi(e, hasard) {
  hasard = hasard || Math.random;
  const g = grilleTirs(e, "o"), coules = new Set();
  for (const b of bateaux(e, "o")) if (b.coule) b.cases.forEach(([r, c]) => coules.add(r + "," + c));
  const touches = []; for (let r = 0; r < LIGNES; r++) for (let c = 0; c < COLS; c++) if (g[r][c] === 2 && !coules.has(r + "," + c)) touches.push([r, c]);
  const hit = (r, c) => dansGrille(r, c) && g[r][c] === 2 && !coules.has(r + "," + c);
  let candidats = [];
  if (touches.length) {
    const score = new Map();
    for (const [r, c] of touches) for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const rr = r + dr, cc = c + dc; if (!dansGrille(rr, cc) || g[rr][cc]) continue;
      const k = rr + "," + cc; score.set(k, (score.get(k) || 0) + 1 + (hit(r - dr, c - dc) ? 10 : 0));     // prolonge une ligne de touches
    }
    const max = Math.max(...score.values());
    candidats = [...score].filter(([, s]) => s === max).map(([k]) => k.split(",").map(Number));
  } else {
    for (let r = 0; r < LIGNES; r++) for (let c = 0; c < COLS; c++) if (!g[r][c] && (r + c) % 2 === 0) candidats.push([r, c]);      // damier : toute flotte (≥ 2 cases) y est touchée
    if (!candidats.length) for (let r = 0; r < LIGNES; r++) for (let c = 0; c < COLS; c++) if (!g[r][c]) candidats.push([r, c]);
  }
  return candidats.length ? candidats[Math.floor(hasard() * candidats.length)] : null;
}
// Tour de l'ordinateur : choisit, joue et retourne le résultat (null si ce n'est pas son tour).
function jouerOrdi(e, hasard) {
  const dernier = e.tours[e.tours.length - 1];
  if (e.gagnant || !dernier || dernier.o) return null;
  const c = coupOrdi(e, hasard); if (!c) return null;
  dernier.o = c; verifierFin(e);
  return dernierTir(e, "o");
}
// Annule le dernier tour complet (ou le seul tir du joueur si l'ordinateur n'a pas encore répondu).
function annulerTour(e) { if (!e.tours.length) return false; e.tours.pop(); e.gagnant = 0; verifierFin(e); return true; }

function serialiser(e) { return JSON.stringify({ v: 1, j: e.flotte.j.map((b) => b.cases), o: e.flotte.o.map((b) => b.cases), t: e.tours }); }
// Reprend une partie sauvegardée ; null si le texte est invalide.
function restaurer(txt) {
  try {
    const d = JSON.parse(txt); if (!d || d.v !== 1) return null;
    const flotte = (liste) => {
      if (!Array.isArray(liste) || liste.length !== TAILLES.length) return null;
      const vus = new Set(), res = [];
      for (let i = 0; i < liste.length; i++) {
        const cases = liste[i]; if (!Array.isArray(cases) || cases.length !== TAILLES[i]) return null;
        for (const p of cases) { if (!Array.isArray(p) || !Number.isInteger(p[0]) || !Number.isInteger(p[1]) || !dansGrille(p[0], p[1]) || vus.has(p[0] + "," + p[1])) return null; vus.add(p[0] + "," + p[1]); }
        res.push({ l: TAILLES[i], cases: cases.map((p) => [p[0], p[1]]) });
      }
      return res;
    };
    const fj = flotte(d.j), fo = flotte(d.o); if (!fj || !fo || !Array.isArray(d.t)) return null;
    const tours = [], vj = new Set(), vo = new Set();
    for (const t of d.t) {
      const ok = (p) => Array.isArray(p) && Number.isInteger(p[0]) && Number.isInteger(p[1]) && dansGrille(p[0], p[1]);
      if (!t || !ok(t.j) || (t.o !== null && !ok(t.o)) || vj.has(t.j.join())) return null; vj.add(t.j.join());
      if (t.o) { if (vo.has(t.o.join())) return null; vo.add(t.o.join()); }
      tours.push({ j: [t.j[0], t.j[1]], o: t.o ? [t.o[0], t.o[1]] : null });
    }
    const e = { flotte: { j: fj, o: fo }, tours, gagnant: 0 }; verifierFin(e); return e;
  } catch (err) { return null; }
}

const Bataille = { COLS, LIGNES, TAILLES, placerFlotte, nouvelle, melanger, tirsDe, grilleTirs, bateaux, tirer, dernierTir, coupOrdi, jouerOrdi, annulerTour, verifierFin, serialiser, restaurer };
scope.Bataille = Bataille;
if (typeof module !== "undefined") module.exports = Bataille;
})(typeof window === "undefined" ? globalThis : window);
