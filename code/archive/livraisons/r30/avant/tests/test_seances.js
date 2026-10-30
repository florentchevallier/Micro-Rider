const Se = require('../code/js/seances.js'), N = require('../code/js/noyau.js');
let ok = 0, ko = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('OK  ' + n); } else { ko++; console.log('KO  ' + n + (d !== undefined ? '   -> ' + JSON.stringify(d) : '')); } };
const MRC = `[COURSE HEADER]
VERSION = 2
UNITS = ENGLISH
DESCRIPTION = Sweet spot 2x10
FILE NAME = ss.mrc
MINUTES PERCENT
[END COURSE HEADER]
[COURSE DATA]
0.00 50
5.00 50
5.00 90
15.00 90
15.00 55
17.50 55
17.50 90
17.50 90
20.00 50
[END COURSE DATA]
[COURSE TEXT]
0 Bienvenue
[END COURSE TEXT]
`;
const d = Se.lireFichier('ss.mrc', MRC);
t('mrc : nom pris dans DESCRIPTION', d.nom === 'Sweet spot 2x10');
t('mrc : 4 étapes (les sauts instantanés ne comptent pas)', d.etapes.length === 4, d.etapes);
t('mrc : paliers en % de la FTP', d.etapes[0].s === 300 && d.etapes[0].pct === 50 && d.etapes[1].s === 600 && d.etapes[1].pct === 90 && d.etapes[2].pct === 55, d.etapes);
t('mrc : dernière étape = rampe 90 → 50 sur 150 s', (() => { const e = d.etapes[3]; return e.s === 150 && e.pct0 === 90 && e.pct1 === 50; })(), d.etapes[3]);
const s = N.construireSeance(d, 200);
t('mrc : séance construite, 20 min, FTP 200 W → 100 W puis 180 W', s.duree === 1200 && Math.round(N.cibleA(s, 10).w) === 100 && Math.round(N.cibleA(s, 400).w) === 180, [s.duree]);
const ERG = `[COURSE HEADER]
VERSION = 2
UNITS = ENGLISH
DESCRIPTION = Test watts
FTP = 250
MINUTES WATTS
[END COURSE HEADER]
[COURSE DATA]
0 100
2 100
2 200
3,5 200
[END COURSE DATA]`;
const e = Se.lireFichier('t.erg', ERG);
t('erg : watts absolus, virgule décimale acceptée', e.etapes.length === 2 && e.etapes[0].w === 100 && e.etapes[1].w === 200 && e.etapes[1].s === 90, e.etapes);
t('erg : la FTP ne change rien aux watts', Math.round(N.cibleA(N.construireSeance(e, 400), 130).w) === 200);
t('mrc : rampe linéaire', (() => { const r = Se.lireMrc('MINUTES WATTS\n[COURSE DATA]\n0 100\n4 200\n', 'r.erg'); const q = N.construireSeance(r); return Math.round(N.cibleA(q, 120).w) === 150; })());
t('mrc : nom de repli = nom du fichier', Se.lireMrc('MINUTES PERCENT\n[COURSE DATA]\n0 50\n1 50\n', 'Mon effort.mrc').nom === 'Mon effort');
const echec = (txt, motif) => { try { Se.lireMrc(txt, 'x.mrc'); return false; } catch (err) { return motif.test(err.message); } };
t('mrc : pas de section de données → erreur claire', echec('MINUTES PERCENT\n', /COURSE DATA/));
t('mrc : unité absente → erreur claire', echec('[COURSE DATA]\n0 50\n1 50\n', /unité/));
t('mrc : ligne illisible → erreur', echec('MINUTES PERCENT\n[COURSE DATA]\n0 50\nabc\n', /illisible/));
t('mrc : minutes qui reculent → erreur', echec('MINUTES PERCENT\n[COURSE DATA]\n0 50\n5 50\n3 60\n', /croître/));
t('mrc : valeur négative → erreur', echec('MINUTES PERCENT\n[COURSE DATA]\n0 50\n5 -3\n', /invalide/));
t('mrc : un seul point → erreur', echec('MINUTES PERCENT\n[COURSE DATA]\n0 50\n', /deux points/));
t('mrc : fichier .fit refusé avec un message clair', (() => { try { Se.lireFichier('a.fit', ''); return false; } catch (err) { return /fit/.test(err.message); } })());
console.log(`\n${ok} OK, ${ko} KO`); process.exit(ko ? 1 : 0);
