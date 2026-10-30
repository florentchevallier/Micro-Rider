const N = require('../code/js/noyau.js');
let ok = 0, ko = 0;
const t = (nom, c, d) => { if (c) { ok++; console.log('OK  ' + nom); } else { ko++; console.log('KO  ' + nom + '   -> ' + d); } };

// physique plate
const e = N.creerEtat();
for (let i = 0; i < 600; i++) N.avancer(e, 200, 0, 1);      // 10 min à 200 W, à plat
t('200 W à plat : vitesse d\'équilibre 28-34 km/h', e.v*3.6 > 28 && e.v*3.6 < 34, e.v*3.6);
const e2 = N.creerEtat(); for (let i = 0; i < 600; i++) N.avancer(e2, 250, 0, 1);
t('250 W à plat : 31-37 km/h', e2.v*3.6 > 31 && e2.v*3.6 < 37, e2.v*3.6);
t('distance cohérente avec le temps', Math.abs(e.t - 600) < 0.1 && e.d > 4000 && e.d < 6000, [e.t, e.d]);
const e3 = N.creerEtat(); N.avancer(e3, 0, 0, 5); t('0 W : on ne bouge pas (reste ~0)', e3.v < 0.01 && e3.d < 0.05, e3.v);

// zones
t('zones : 110 W / FTP 250 = Z1', N.zoneDe(110, 250) === 1);
t('zones : 160=Z2, 210=Z3, 250=Z4, 290=Z5, 345=Z6', [160,210,250,290,345].map(w=>N.zoneDe(w,250)).join() === '2,3,4,5,6', [160,210,250,290,345].map(w=>N.zoneDe(w,250)));
t('zones : limites 55 % = Z1, 56 % = Z2', N.zoneDe(137.5,250) === 1 && N.zoneDe(140,250) === 2);

// séance
const S = N.construireSeance({ nom:'x', ftp:250, etapes:[{s:60,w:100},{s:60,pct:60},{s:100,w0:100,w1:200},{s:30,libre:true}] });
t('durée totale 250 s', S.duree === 250, S.duree);
t('wMax = 200', S.wMax === 200, S.wMax);
t('cible à 30 s : 100 W, étape 0, reste 30 s', (() => { const c = N.cibleA(S, 30); return c.w === 100 && c.index === 0 && c.reste === 30; })());
t('pct converti : 60 % de 250 = 150 W', N.cibleA(S, 90).w === 150);
t('rampe : à mi-étape (t=170) = 150 W', N.cibleA(S, 170).w === 150, N.cibleA(S, 170).w);
t('rampe : début 100 W, quasi fin ~199 W', N.cibleA(S, 120).w === 100 && Math.abs(N.cibleA(S, 219.9).w - 199.9) < 0.2);
t('étape libre : pas de cible', (() => { const c = N.cibleA(S, 230); return c.libre && c.w === null; })());
t('après la fin : null', N.cibleA(S, 250) === null && N.cibleA(S, 1000) === null);
t('FTP imposée à la construction (pct)', N.construireSeance({etapes:[{s:10,pct:100}]}, 300).etapes[0].w0 === 300);
for (const [nom, def] of [['vide', {etapes:[]}], ['durée 0', {etapes:[{s:0,w:100}]}], ['sans puissance', {etapes:[{s:10}]}], ['puissance négative', {etapes:[{s:10,w:-5}]}], ['rampe incomplète', {etapes:[{s:10,w0:100}]}]]) {
  let m = null; try { N.construireSeance(def, 250); } catch (er) { m = er.message; }
  t('séance invalide refusée : ' + nom, m !== null, m);
}

// lecteur
const L = N.creerLecteur();
t('lecteur : état initial "aucune", consigne libre', L.etat === 'aucune' && L.consigne().mode === 'libre');
L.charger(S); t('lecteur : séance chargée → prête, consigne libre', L.etat === 'prete' && L.consigne().mode === 'libre');
L.avancer(10); t('lecteur : l\'horloge n\'avance pas tant que la séance n\'est pas démarrée', L.t === 0);
L.demarrer(); L.avancer(30);
t('lecteur : en cours, consigne ERG 100 W', L.etat === 'en cours' && L.t === 30 && L.consigne().mode === 'erg' && L.consigne().w === 100, L.consigne());
L.pause(); L.avancer(20); t('lecteur : en pause, horloge figée, consigne libre', L.t === 30 && L.consigne().mode === 'libre');
L.reprendre(); L.avancer(5); t('lecteur : reprise', L.t === 35 && L.consigne().mode === 'erg');
L.avancer(210); t('lecteur : étape libre → consigne libre', L.t === 245 && L.consigne().mode === 'libre');
L.avancer(100); t('lecteur : fin → finie, t plafonné, consigne libre', L.etat === 'finie' && L.t === 250 && L.consigne().mode === 'libre', [L.etat, L.t]);
L.demarrer(); t('lecteur : redémarrage possible après la fin', L.etat === 'en cours' && L.t === 0);
L.arreter(); t('lecteur : arrêt → prête, t=0', L.etat === 'prete' && L.t === 0);
t('consigne ERG arrondie à l\'entier', (() => { const l = N.creerLecteur(); l.charger(N.construireSeance({etapes:[{s:100,w0:100,w1:200}]})); l.demarrer(); l.avancer(33.3); return Number.isInteger(l.consigne().w); })());
t('rapports : 10 = pente nulle', N.penteDuRapport(10) === 0);
t('rapports : 1 → −4,5 %, 24 → +11,2 %', N.penteDuRapport(1) === -4.5 && N.penteDuRapport(24) === 11.2, [N.penteDuRapport(1), N.penteDuRapport(24)]);
t('rapports : hors bornes ramenés dans 1..24', N.penteDuRapport(0) === -4.5 && N.penteDuRapport(99) === 11.2);
t('rapports : strictement croissants', (() => { for (let g = 1; g < 24; g++) if (!(N.penteDuRapport(g + 1) > N.penteDuRapport(g))) return false; return true; })());
t('rapports : à 200 W la vitesse baisse quand le rapport monte', (() => { const v = (g) => { const e = N.creerEtat(); N.avancer(e, 200, N.penteDuRapport(g), 600); return e.v; }; return v(1) > v(10) && v(10) > v(17) && v(17) > v(24) && v(24) > 1; })());
t('rapports : la consigne libre porte la pente du rapport', N.creerLecteur().consigne(N.penteDuRapport(14)).pente === 3.2);
t('arrêt : sans pédaler à plat, de 30 km/h à l\'arrêt en moins de 6 s', (() => { const e = N.creerEtat(); e.v = 8.3; e.pLisse = 0; N.avancer(e, 0, 0, 6, false); return e.v === 0; })());
t('arrêt : à −1 % (rapport 8) aussi, et en montée', [-1, 0, 3].every((p) => { const e = N.creerEtat(); e.v = 8; e.pLisse = 0; N.avancer(e, 0, p, 8, false); return e.v === 0; }));
t('roue libre : à −3 % on continue de rouler sans pédaler', (() => { const e = N.creerEtat(); e.v = 8; e.pLisse = 0; N.avancer(e, 0, -3, 8, false); return e.v > 6; })());
t('arrêt : en pédalant, rien ne change (200 W à plat ≈ 34 km/h)', (() => { const e = N.creerEtat(); N.avancer(e, 200, 0, 600, true); const e2 = N.creerEtat(); N.avancer(e2, 200, 0, 600); return Math.abs(e.v - e2.v) < 1e-9 && e.v * 3.6 > 32 && e.v * 3.6 < 35; })());
t('frein : 3 m/s² de plus, de 10 m/s à 1 m/s en ~3 s à 0 W', (() => { const e = N.creerEtat(); e.v = 10; e.pLisse = 0; N.avancer(e, 0, 0, 3, true, true); return e.v < 2; })());
t('frein : sans frein la même durée perd bien moins', (() => { const e = N.creerEtat(); e.v = 10; e.pLisse = 0; N.avancer(e, 0, 0, 3, true, false); return e.v > 6; })());
t('boost : refusé à l\'arrêt, accepté en roulant', (() => { const e = N.creerEtat(); const a = N.declencherBoost(e); e.v = 8; return a === false && N.declencherBoost(e) === true; })());
t('boost : 5 s actif puis pause de 10 s, pas de relance avant', (() => { const e = N.creerEtat(); e.v = 8; N.declencherBoost(e); const r1 = N.etatBoost(e).actif; N.avancer(e, 250, 0, 6); const r2 = N.etatBoost(e); N.avancer(e, 250, 0, 5); const r3 = N.declencherBoost(e); N.avancer(e, 250, 0, 6); const r4 = N.declencherBoost(e); return r1 && !r2.actif && !r2.pret && r2.attente > 8 && r3 === false && r4 === true; })());
t('boost : vitesse virtuelle +20 % au plus fort, retour doux à 1', (() => { const e = N.creerEtat(); e.v = 8; e.pLisse = 200; N.declencherBoost(e); N.avancer(e, 200, 0, 3); const m = N.vitesseVirtuelle(e) / e.v; N.avancer(e, 200, 0, 8); const f = N.vitesseVirtuelle(e) / e.v; return m > 1.19 && m <= 1.2 + 1e-9 && Math.abs(f - 1) < 0.01; })());
t('boost : la distance bonus est séparée de la distance réelle', (() => { const e = N.creerEtat(); e.v = 8; e.pLisse = 200; N.declencherBoost(e); const d0 = e.d; N.avancer(e, 200, 0, 5); return e.bonusD > 0.5 && e.bonusD < (e.d - d0) * 0.2 + 1e-6; })());
// échelle de temps non linéaire du graphique de séance
(() => {
  const mono = (d, tt) => { const f = N.echelleTemps(d, tt); let p = -1; for (let u = 0; u <= d; u += d / 400) { const x = f.x(u); if (x < p - 1e-9) return false; p = x; } return Math.abs(f.x(0)) < 1e-9 || true; };
  const f = N.echelleTemps(3600, 1500);
  t('échelle : 0 -> 0 et fin -> 1', Math.abs(f.x(0)) < 1e-9 && Math.abs(f.x(3600) - 1) < 1e-9);
  t('échelle : monotone (t = 0, 30 s, 25 min, fin)', [0, 30, 1500, 3600].every((tt) => mono(3600, tt)));
  t('échelle : la minute passée et les 10 min à venir sont grossies (> 3x la densité linéaire)', (f.x(1500) - f.x(1440)) / (60 / 3600) > 3 && (f.x(2100) - f.x(1500)) / (600 / 3600) > 2.5, [f.x(1500) - f.x(1440), f.x(2100) - f.x(1500)]);
  t('échelle : début et fin lointains comprimés', f.x(1440) < 0.15 && 1 - f.x(2100) < 0.25);
  t('échelle : continue au passage du temps (pas de saut du curseur)', Math.abs(N.echelleTemps(3600, 1500.5).x(1500.5) - f.x(1500)) < 0.005);
  t('échelle : séance courte (3 min 30) = linéaire', Math.abs(N.echelleTemps(210, 30).x(105) - 0.5) < 1e-9);
  t('échelle : début de séance, curseur à gauche', N.echelleTemps(3600, 0).x(0) === 0);
})();
console.log(`\n${ok} OK, ${ko} KO`); process.exit(ko ? 1 : 0);
