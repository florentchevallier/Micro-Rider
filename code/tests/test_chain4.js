const A = require('../code/js/jeux/chain4.js');
let ok = 0, ko = 0;
const t = (nom, c, d) => { if (c) { ok++; console.log('OK  ' + nom); } else { ko++; console.log('KO  ' + nom + '   -> ' + d); } };
const partie = (coups) => { const e = A.nouvelle(); for (const c of coups) A.jouer(e, c); return e; };

t('grille vide 6×7, le joueur commence', A.nouvelle().grille.length === 6 && A.nouvelle().grille[0].length === 7 && A.tour(A.nouvelle()) === A.JOUEUR);
t('un pion tombe en bas de la colonne', (() => { const e = partie([3]); return e.grille[5][3] === 1; })());
t('le pion suivant s\'empile et la main passe', (() => { const e = partie([3, 3]); return e.grille[4][3] === 2 && A.tour(e) === 1; })());
t('horizontale : 4 pions du joueur', partie([0, 0, 1, 1, 2, 2, 3]).gagnant === 1);
t('verticale : 4 pions du joueur', partie([0, 1, 0, 1, 0, 1, 0]).gagnant === 1);
t('diagonale montante', partie([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]).gagnant === 1);
t('diagonale descendante', partie([6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3]).gagnant === 1);
t('la ligne gagnante contient 4 cases', partie([0, 0, 1, 1, 2, 2, 3]).ligne.length >= 4);
t('victoire de l\'ordinateur (joueur 2)', partie([0, 1, 0, 1, 2, 1, 2, 1]).gagnant === 2);
t('plus de coup possible après la victoire', (() => { const e = partie([0, 0, 1, 1, 2, 2, 3]); return A.jouer(e, 4) === null && A.colonnesJouables(e).length === 0; })());
t('colonne pleine refusée', (() => { const e = partie([0, 0, 0, 0, 0, 0]); return A.jouer(e, 0) === null && !A.colonnesJouables(e).includes(0); })());
t('partie nulle : grille pleine (42 coups) sans gagnant', (() => {
  for (let k = 0; k < 20000; k++) { const e = A.nouvelle(); while (!e.gagnant && !e.nul) { const l = A.colonnesJouables(e); A.jouer(e, l[Math.floor(Math.random() * l.length)]); }
    if (e.nul) return e.historique.length === 42 && !e.gagnant && A.colonnesJouables(e).length === 0 && A.restaurer(A.serialiser(e)).nul; }
  return 'aucune partie nulle trouvée au hasard';
})());
t('annuler un coup', (() => { const e = partie([3, 4]); A.annulerUn(e); return e.grille[5][4] === 0 && e.historique.length === 1 && A.tour(e) === 2; })());
t('annuler un tour : coup de l\'ordi + coup du joueur', (() => { const e = partie([3, 4]); A.annulerTour(e); return e.historique.length === 0; })());
t('annuler après une victoire du joueur : un seul coup, la partie reprend', (() => { const e = partie([0, 0, 1, 1, 2, 2, 3]); A.annulerTour(e); return e.gagnant === 0 && e.historique.length === 6; })());
t('annuler sur grille vide : rien', !A.annulerTour(A.nouvelle()));
t('sauvegarde / reprise identiques', (() => { const e = partie([3, 2, 4, 4, 5]); const r = A.restaurer(A.serialiser(e)); return r && JSON.stringify(r.grille) === JSON.stringify(e.grille) && A.tour(r) === A.tour(e); })());
t('reprise : données invalides refusées', A.restaurer('{"v":1,"historique":[9]}') === null && A.restaurer('nimporte') === null && A.restaurer('{"v":2}') === null);
const fixe = () => 0.5;
t('l\'ordi gagne quand il peut', (() => { const e = partie([0, 1, 0, 1, 2, 1]); /* tour joueur... */ const e2 = partie([6, 0, 6, 1, 5, 2, 5]); /* ordi (2) a 0,1,2 en bas : doit jouer 3 */ return A.tour(e2) === 2 && A.coupOrdi(e2, fixe) === 3; })());
t('l\'ordi bloque une victoire du joueur', (() => { const e = partie([0, 6, 1, 6, 2]); return A.tour(e) === 2 && A.coupOrdi(e, fixe) === 3; })());
t('l\'ordi ne joue jamais dans une colonne pleine', (() => { const e = partie([0, 0, 0, 0, 0, 0]); for (let i = 0; i < 20; i++) if (A.coupOrdi(e, Math.random) === 0) return false; return true; })());
t('100 parties au hasard (joueur aléatoire) : toujours terminées sans erreur, temps raisonnable', (() => {
  const t0 = Date.now(); let gagnesOrdi = 0;
  for (let k = 0; k < 100; k++) {
    const e = A.nouvelle();
    while (!e.gagnant && !e.nul) { const l = A.colonnesJouables(e); if (A.tour(e) === 1) A.jouer(e, l[Math.floor(Math.random() * l.length)]); else A.jouer(e, A.coupOrdi(e)); }
    if (e.gagnant === 2) gagnesOrdi++;
  }
  return gagnesOrdi >= 90 && Date.now() - t0 < 20000 ? true : 'ordi ' + gagnesOrdi + '/100 en ' + (Date.now() - t0) + ' ms';
})());
t('un coup de l\'ordi prend moins de 200 ms', (() => { const e = partie([3, 3, 2, 4]); const t0 = Date.now(); A.coupOrdi(e); return Date.now() - t0 < 200; })());
console.log(`\n${ok} OK, ${ko} KO`); process.exit(ko ? 1 : 0);
