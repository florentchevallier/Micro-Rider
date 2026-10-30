// Bataille navale : placement, tirs, ordinateur, annulation, sauvegarde. Lancer : node test_bataille.js
const B = require("../code/js/jeux/bataille.js");
let ok = 0, ko = 0;
const t = (n, c, d) => { if (c) ok++; else { ko++; console.log("KO  " + n, d === undefined ? "" : JSON.stringify(d)); } };
const graine = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

// placement : toujours valide, sans chevauchement, dans la grille
let bon = true;
for (let i = 0; i < 500; i++) {
  const f = B.placerFlotte(graine(i + 1)), vus = new Set();
  if (f.map((b) => b.l).join() !== B.TAILLES.join()) bon = false;
  for (const b of f) {
    if (b.cases.length !== b.l) bon = false;
    const rs = b.cases.map((p) => p[0]), cs = b.cases.map((p) => p[1]);
    if (!(new Set(rs).size === 1 || new Set(cs).size === 1)) bon = false;                   // alignés
    const cont = (a) => Math.max(...a) - Math.min(...a) === a.length - 1; if (!(cont(rs) || new Set(rs).size === 1) || !(cont(cs) || new Set(cs).size === 1)) bon = false;
    for (const [r, c] of b.cases) { if (r < 0 || r >= B.LIGNES || c < 0 || c >= B.COLS || vus.has(r + "," + c)) bon = false; vus.add(r + "," + c); }
  }
}
t("placement : 500 flottes valides (taille, alignement, grille, sans chevauchement)", bon);
t("terrain 6 × 8, 4 bateaux (4, 3, 3, 2)", B.COLS === 6 && B.LIGNES === 8 && B.TAILLES.join() === "4,3,3,2");
const h = graine(7); const f1 = B.placerFlotte(h), f2 = B.placerFlotte(h);
t("deux tirages successifs diffèrent", JSON.stringify(f1) !== JSON.stringify(f2));

// tirs du joueur
let e = B.nouvelle(graine(3));
const b0 = e.flotte.o[3].cases[0];       // bateau de 2 cases
let r = B.tirer(e, b0[0], b0[1]);
t("tir sur un bateau : touché", r && r.resultat === "touche", r);
t("tir pendant que l'ordinateur n'a pas répondu : refusé", B.tirer(e, 0, 0) === null);
t("l'ordinateur répond", B.jouerOrdi(e, graine(5)) !== null && e.tours[0].o);
t("même case deux fois : refusé", B.tirer(e, b0[0], b0[1]) === null);
const b1 = e.flotte.o[3].cases[1]; r = B.tirer(e, b1[0], b1[1]);
t("dernière case du bateau : coulé", r && r.resultat === "coule" && r.bateau.l === 2, r);
B.jouerOrdi(e, graine(6));
let vide = null; for (let a = 0; a < B.LIGNES && !vide; a++) for (let c = 0; c < B.COLS; c++) if (!B.grilleTirs(e, "j")[a][c] && !e.flotte.o.some((b) => b.cases.some((p) => p[0] === a && p[1] === c))) { vide = [a, c]; break; }
r = B.tirer(e, vide[0], vide[1]); t("case vide : à l'eau", r && r.resultat === "eau", r);
t("hors grille : refusé", B.tirer(e, -1, 0) === null && B.tirer(e, 0, B.COLS) === null);

// annulation
const n = e.tours.length; B.annulerTour(e); t("annuler : retire un tour", e.tours.length === n - 1);
t("mélanger refusé après le premier tir", B.melanger(e) === false);
let e2 = B.nouvelle(graine(9)); const avant = JSON.stringify(e2.flotte.j); t("mélanger avant de jouer : change la flotte du joueur", B.melanger(e2, graine(10)) && JSON.stringify(e2.flotte.j) !== avant);

// victoire du joueur : on tire sur toutes les cases ennemies
e = B.nouvelle(graine(11)); const cibles = e.flotte.o.flatMap((b) => b.cases);
for (const [a, c] of cibles) { B.tirer(e, a, c); if (!e.gagnant) B.jouerOrdi(e, graine(a * 10 + c)); }
t("tous les bateaux ennemis touchés : le joueur gagne", e.gagnant === 1, e.gagnant);
t("plus de tir après la fin", B.tirer(e, 0, 0) === null);
B.annulerTour(e); t("annuler la victoire : la partie reprend", e.gagnant === 0);

// ordinateur : parties complètes contre un joueur au hasard, jamais deux fois la même case, termine toujours
let long = [], toutBon = true;
for (let i = 0; i < 200; i++) {
  const g = graine(100 + i), p = B.nouvelle(g), reste = []; for (let a = 0; a < B.LIGNES; a++) for (let c = 0; c < B.COLS; c++) reste.push([a, c]);
  for (let k = reste.length - 1; k > 0; k--) { const m = Math.floor(g() * (k + 1)); [reste[k], reste[m]] = [reste[m], reste[k]]; }
  let ti = 0; while (!p.gagnant && ti < reste.length) { B.tirer(p, ...reste[ti++]); if (!p.gagnant) { if (!B.jouerOrdi(p, g)) { toutBon = false; break; } } }
  const so = B.tirsDe(p, "o").map((x) => x.join()); if (new Set(so).size !== so.length) toutBon = false;
  if (!p.gagnant) toutBon = false; long.push(B.tirsDe(p, "o").length);
}
t("200 parties : l'ordinateur ne rejoue jamais une case et la partie se termine", toutBon);
// niveau de l'ordinateur seul contre une flotte au hasard (joueur qui ne tire pas) : tirs pour tout couler
let somme = 0, sommeHasard = 0;
for (let i = 0; i < 300; i++) {
  const g = graine(500 + i), p = B.nouvelle(g); p.tours.push({ j: [0, 0], o: null }); let k = 0;
  while (!p.gagnant && k < 60) { p.tours[p.tours.length - 1].o = B.coupOrdi(p, g); k++; B.verifierFin(p); if (!p.gagnant) p.tours.push({ j: [0, 0], o: null }); }
  somme += k;
  const tout = []; for (let a = 0; a < B.LIGNES; a++) for (let c = 0; c < B.COLS; c++) tout.push([a, c]);
  for (let q = tout.length - 1; q > 0; q--) { const m = Math.floor(g() * (q + 1)); [tout[q], tout[m]] = [tout[m], tout[q]]; }
  const cases = new Set(p.flotte.j.flatMap((b) => b.cases.map((x) => x.join()))); let reste = cases.size, n2 = 0; for (const x of tout) { n2++; if (cases.has(x.join()) && --reste === 0) break; } sommeHasard += n2;
}
const moy = somme / 300, moyH = sommeHasard / 300;
t("ordinateur malin : moins de tirs que le hasard pur (" + moy.toFixed(1) + " contre " + moyH.toFixed(1) + ") mais pas parfait", moy < moyH - 4 && moy > 16, { moy, moyH });

// fouille : après une touche, le coup suivant est adjacent
e = B.nouvelle(graine(21)); const cible0 = e.flotte.j[0].cases[1];
e.tours.push({ j: [0, 0], o: cible0 }); const pt = B.coupOrdi(e, graine(2));
t("après une touche, l'ordinateur tire à côté", Math.abs(pt[0] - cible0[0]) + Math.abs(pt[1] - cible0[1]) === 1, pt);
const cs = e.flotte.j[0].cases, horiz = cs[0][0] === cs[1][0];
e = B.nouvelle(graine(21)); e.tours.push({ j: [0, 0], o: cs[1] }, { j: [0, 1], o: cs[2] });
const suite = B.coupOrdi(e, graine(2)); t("deux touches alignées : il prolonge la ligne", horiz ? suite[0] === cs[1][0] : suite[1] === cs[1][1], { suite, cs });
// bateau coulé : plus de fouille autour
e = B.nouvelle(graine(22)); const petit = e.flotte.j[3].cases; e.tours.push({ j: [0, 0], o: petit[0] }, { j: [0, 1], o: petit[1] });
const apres = B.coupOrdi(e, graine(4)); t("bateau coulé : retour à la chasse en damier (ou fouille d'un autre bateau touché)", (apres[0] + apres[1]) % 2 === 0);

// sauvegarde
e = B.nouvelle(graine(31)); B.tirer(e, 0, 0); B.jouerOrdi(e, graine(1)); B.tirer(e, 1, 1);
const s = B.serialiser(e), e3 = B.restaurer(s); t("sauvegarde : aller-retour identique", e3 && B.serialiser(e3) === s);
t("sauvegarde invalide refusée", B.restaurer("") === null && B.restaurer("{}") === null && B.restaurer(s.replace('"v":1', '"v":2')) === null && B.restaurer(s.replace("[[0,0],", "[[9,9],")) === null);
console.log(ok + " OK, " + ko + " KO");
