const S = require('../code/js/sortie.js');
let ok = 0, ko = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('OK  ' + n); } else { ko++; console.log('KO  ' + n + (d !== undefined ? '   -> ' + JSON.stringify(d) : '')); } };
const T0 = Date.UTC(2026, 9, 26, 11, 30, 0);
const s = S.creer();
t('sortie vide : export refusé', (() => { try { s.tcx(); return false; } catch (e) { return /vide/.test(e.message); } })());
for (let i = 0; i < 10; i++) s.ajouter(T0 + i * 1000, 200 + i, 80, i < 5 ? 0 : 140, 500 + i * 8, 8.2);   // le noyau démarre à 500 m : la sortie repart de 0
const st = s.stats();
t('stats : 10 points, 10 s', st.n === 10 && st.secondes === 10);
t('distance relative : repart de 0', s.points[0][4] === 0 && Math.abs(st.distance - 72) < 0.11, st.distance);
t('stats : puissance moyenne 204,5 et max 209', Math.abs(st.wMoy - 204.5) < 1e-9 && st.wMax === 209);
t('stats : FC moyenne sur les seules valeurs connues (140), max 140', st.fcMoy === 140 && st.fcMax === 140);
t('stats : énergie ≈ 2,045 kJ', Math.abs(st.kj - 2.045) < 1e-9);
const x = s.tcx();
t('tcx : en-tête XML et espace de noms Garmin', x.startsWith('<?xml') && x.includes('TrainingCenterDatabase/v2') && x.includes('Sport="Biking"'));
t('tcx : 10 Trackpoint, heure UTC ISO', (x.match(/<Trackpoint>/g) || []).length === 10 && x.includes('<Time>2026-10-26T11:30:00.000Z</Time>') && x.includes('<Time>2026-10-26T11:30:09.000Z</Time>'));
t('tcx : puissance et vitesse en extension', x.includes('<ns3:Watts>200</ns3:Watts>') && x.includes('<ns3:Speed>8.20</ns3:Speed>'));
t('tcx : FC seulement quand connue (5 points)', (x.match(/<HeartRateBpm>/g) || []).length === 5);
t('tcx : durée, distance, calories dans le tour', x.includes('<TotalTimeSeconds>10</TotalTimeSeconds>') && x.includes('<DistanceMeters>72.0</DistanceMeters>') && x.includes('<Calories>2</Calories>'));
t('tcx : aucune position GPS (séance en salle)', !/Position|LatitudeDegrees/.test(x));
t('tcx : ordre des éléments du tour conforme au schéma', (() => { const o = ['TotalTimeSeconds', 'DistanceMeters', 'MaximumSpeed', 'Calories', 'AverageHeartRateBpm', 'MaximumHeartRateBpm', 'Intensity', 'Cadence', 'TriggerMethod', 'Track'].map((k) => x.indexOf('<' + k)); return o.every((v, i) => v > 0 && (i === 0 || v > o[i - 1])); })());
s.seance = 'Test <A&B>';
t('tcx : nom de séance échappé', s.tcx().includes('Micro-Rider training: Test &lt;A&amp;B&gt;'));
// sauvegarde / reprise
const r = S.restaurer(s.serialiser());
t('restauration : mêmes points', r && r.points.length === 10 && r.seance === 'Test <A&B>');
r.ajouter(T0 + 60000, 150, 70, 0, 20, 7);                      // le noyau repart de 20 m après un rechargement de la page
t('reprise : la distance continue (72 m + 0)', r.points[10][4] === 72, r.points[10]);
r.ajouter(T0 + 61000, 150, 70, 0, 28, 7);
t('reprise : puis avance avec le noyau (+8 m)', r.points[11][4] === 80, r.points[11]);
t('restauration : textes invalides refusés', S.restaurer('') === null && S.restaurer('{"v":2}') === null && S.restaurer('{"v":1,"points":[[1,2]]}') === null && S.restaurer('pas du json') === null);
s.vider(); t('vider : plus rien', s.points.length === 0 && s.stats().n === 0);
console.log(`\n${ok} OK, ${ko} KO`); process.exit(ko ? 1 : 0);
