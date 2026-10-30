const N = require('../js/noyau.js');
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
console.log(`\n${ok} OK, ${ko} KO`); process.exit(ko ? 1 : 0);
