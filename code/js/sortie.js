"use strict";
/* =====================================================================
   SORTIE : enregistrement d'une sortie (une mesure par seconde) et export au format .tcx.
   Aucune dépendance au navigateur. Le .tcx est le format Garmin « Training Center » : Strava,
   TrainingPeaks, Garmin Connect, etc. le lisent. Sans position GPS, l'activité est classée « en salle ».
   ===================================================================== */
(function (scope) {

// Un point : [instant (ms depuis 1970), puissance W, cadence tr/min, fréquence cardiaque bpm (0 = inconnue), distance m, vitesse m/s]
function creerSortie(donnees) {
  const s = Object.assign({ points: [], seance: "", base: 0 }, donnees || {});
  s.refD = null;                                            // distance du noyau au premier point de CETTE session de la page
  s.ajouter = function (t, w, rpm, fc, dPhys, v) {
    if (s.refD === null) s.refD = dPhys;                    // la distance de la sortie repart de là où elle s'était arrêtée
    const d = s.base + Math.max(0, dPhys - s.refD);
    s.points.push([Math.round(t), Math.round(w), Math.round(rpm), Math.round(fc), Math.round(d * 10) / 10, Math.round(v * 100) / 100]);
  };
  s.vider = function () { s.points = []; s.seance = ""; s.base = 0; s.refD = null; };
  s.stats = function () {
    const p = s.points, n = p.length;
    if (!n) return { n: 0, secondes: 0, kj: 0, distance: 0, wMoy: 0, wMax: 0, fcMoy: 0, fcMax: 0, rpmMoy: 0, vMax: 0 };
    let sw = 0, wMax = 0, sf = 0, nf = 0, fMax = 0, sr = 0, nr = 0, vMax = 0;
    for (const q of p) {
      sw += q[1]; wMax = Math.max(wMax, q[1]); vMax = Math.max(vMax, q[5]);
      if (q[3] > 0) { sf += q[3]; nf++; fMax = Math.max(fMax, q[3]); }
      if (q[2] > 0) { sr += q[2]; nr++; }
    }
    return { n, secondes: n, kj: sw / 1000, distance: p[n - 1][4], wMoy: sw / n, wMax, fcMoy: nf ? sf / nf : 0, fcMax: fMax, rpmMoy: nr ? sr / nr : 0, vMax };
  };
  s.serialiser = function () { return JSON.stringify({ v: 1, points: s.points, seance: s.seance, base: s.base }); };
  s.tcx = function (appareils) { return versTcx(s, appareils); };
  return s;
}
function restaurer(texte) {
  try {
    const d = JSON.parse(texte);
    if (!d || d.v !== 1 || !Array.isArray(d.points)) return null;
    if (!d.points.every((p) => Array.isArray(p) && p.length === 6 && p.every((x) => typeof x === "number" && isFinite(x)))) return null;
    const s = creerSortie({ points: d.points, seance: String(d.seance || ""), base: 0 });
    s.base = d.points.length ? d.points[d.points.length - 1][4] : 0;
    return s;
  } catch (e) { return null; }
}

// Titre et description proposés pour l'activité (Strava les reprend du .tcx / les propose au collage).
function titre(s) { return s.seance ? "Micro-Rider training: " + s.seance : "Micro-Rider virtual ride"; }
// appareils : { trainer, click, fc, cad } (noms, optionnels) -> « Home trainer : … + Click : … · Cardio : … · Cadence : … »
function description(a) {
  a = a || {}; const l = [];
  if (a.trainer || a.click) l.push("Trainer: " + [a.trainer, a.click && "Click: " + a.click].filter(Boolean).join(" + "));
  if (a.fc) l.push("Heart rate: " + a.fc);
  if (a.cad) l.push("Cadence: " + a.cad);
  return l.join(" · ");
}
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, ".000Z");
const echapper = (t) => String(t).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
function versTcx(s, appareils) {
  if (!s.points.length) throw new Error("empty ride: nothing to export");
  const st = s.stats(), p = s.points, debut = iso(p[0][0]);
  const l = [];
  l.push('<?xml version="1.0" encoding="UTF-8"?>');
  l.push('<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">');
  l.push(" <Activities>", '  <Activity Sport="Biking">', "   <Id>" + debut + "</Id>");
  l.push('   <Lap StartTime="' + debut + '">');
  l.push("    <TotalTimeSeconds>" + st.secondes + "</TotalTimeSeconds>");
  l.push("    <DistanceMeters>" + st.distance.toFixed(1) + "</DistanceMeters>");
  l.push("    <MaximumSpeed>" + st.vMax.toFixed(2) + "</MaximumSpeed>");
  l.push("    <Calories>" + Math.round(st.kj) + "</Calories>");                           // ≈ kJ produits (rendement humain ~24 % : 1 kJ ≈ 1 kcal)
  if (st.fcMoy > 0) { l.push("    <AverageHeartRateBpm><Value>" + Math.round(st.fcMoy) + "</Value></AverageHeartRateBpm>", "    <MaximumHeartRateBpm><Value>" + Math.round(st.fcMax) + "</Value></MaximumHeartRateBpm>"); }
  l.push("    <Intensity>Active</Intensity>");
  if (st.rpmMoy > 0) l.push("    <Cadence>" + Math.min(254, Math.round(st.rpmMoy)) + "</Cadence>");
  l.push("    <TriggerMethod>Manual</TriggerMethod>", "    <Track>");
  for (const q of p) {
    l.push("     <Trackpoint>", "      <Time>" + iso(q[0]) + "</Time>", "      <DistanceMeters>" + q[4].toFixed(1) + "</DistanceMeters>");
    if (q[3] > 0) l.push("      <HeartRateBpm><Value>" + Math.min(254, q[3]) + "</Value></HeartRateBpm>");
    l.push("      <Cadence>" + Math.min(254, q[2]) + "</Cadence>");
    l.push("      <Extensions><ns3:TPX><ns3:Speed>" + q[5].toFixed(2) + "</ns3:Speed><ns3:Watts>" + q[1] + "</ns3:Watts></ns3:TPX></Extensions>", "     </Trackpoint>");
  }
  l.push("    </Track>", "   </Lap>");
  l.push("   <Notes>" + echapper(titre(s) + (description(appareils) ? "\n" + description(appareils) : "")) + "</Notes>");
  l.push('   <Creator xsi:type="Device_t"><Name>Micro-Rider (Zwift Hub)</Name><UnitId>0</UnitId><ProductID>0</ProductID></Creator>');
  l.push("  </Activity>", " </Activities>", "</TrainingCenterDatabase>");
  return l.join("\n") + "\n";
}

scope.Sortie = { creer: creerSortie, restaurer, versTcx, titre, description };
if (typeof module !== "undefined") module.exports = scope.Sortie;
})(typeof window === "undefined" ? globalThis : window);
