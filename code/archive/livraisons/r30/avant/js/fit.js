"use strict";
/* =====================================================================
   FIT : encodeur minimal du format Garmin FIT (binaire) pour une sortie Micro-Rider.
   Contrairement au .tcx, le .fit porte le « sous-sport » : sub_sport = virtual_activity (58) fait classer la sortie
   en « Vélo virtuel » par Strava (comme Rouvy, Bikett…). Aucune dépendance au navigateur.
   Messages écrits : file_id, device_info (appli + capteurs), event (timer), record (1/s), lap, session, activity.
   Les points de la sortie : [instant ms, W, rpm, bpm (0 = inconnu), distance m, vitesse m/s].
   ===================================================================== */
(function (scope) {

const EPOCH_FIT = 631065600;                        // 1989-12-31T00:00:00Z en secondes Unix
const T = { enum: [0x00, 1], u8: [0x02, 1], u16: [0x84, 2], u32: [0x86, 4], u32z: [0x8c, 4], str: [0x07, 0] };
const NOM_APPLI = "Micro-Rider";
const SPORT_VELO = 2, SOUS_SPORT_VIRTUEL = 58;

const TABLE_CRC = [0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400];
function crc16(octets, crc) {
  crc = crc || 0;
  for (const b of octets) {
    let t = TABLE_CRC[crc & 0xf]; crc = (crc >> 4) & 0x0fff; crc = crc ^ t ^ TABLE_CRC[b & 0xf];
    t = TABLE_CRC[crc & 0xf]; crc = (crc >> 4) & 0x0fff; crc = crc ^ t ^ TABLE_CRC[(b >> 4) & 0xf];
  }
  return crc;
}

function versFit(s, appareils, titre) {
  if (!s.points.length) throw new Error("sortie vide : rien à exporter");
  const st = s.stats(), p = s.points, out = [];
  const u = (v, n) => { const a = []; for (let i = 0; i < n; i++) a.push((v >>> (8 * i)) & 0xff); return a; };
  const fts = (ms) => Math.round(ms / 1000) - EPOCH_FIT;
  const bornes = (v, max) => Math.max(0, Math.min(max, Math.round(v)));
  // Définition d'un message : champs [numéro, taille, type]. Données : valeurs dans le même ordre ; null = « invalide ».
  const def = (loc, glob, champs) => {
    out.push(0x40 | loc, 0, 0, ...u(glob, 2), champs.length);
    for (const [n, taille, ty] of champs) out.push(n, taille, ty[0]);
  };
  const donnees = (loc, champs, vals) => {
    out.push(loc);
    champs.forEach(([, taille, ty], i) => {
      const v = vals[i];
      if (ty === T.str) { const b = Array.from(unescape(encodeURIComponent(String(v == null ? "" : v)))).map((c) => c.charCodeAt(0)).slice(0, taille - 1); while (b.length < taille) b.push(0); out.push(...b); return; }
      const n = ty[1], inval = n === 1 ? 0xff : n === 2 ? 0xffff : 0xffffffff;
      out.push(...u(v == null ? (ty === T.u32z ? 0 : inval) : v, n));
    });
  };
  const F = (n, ty, taille) => [n, taille || ty[1], ty];

  const t0 = fts(p[0][0]), t1 = fts(p[p.length - 1][0]);
  const nom = (Array.isArray(appareils) ? appareils : []).slice(0, 4);

  // file_id
  const cId = [F(0, T.enum), F(1, T.u16), F(2, T.u16), F(3, T.u32z), F(4, T.u32), F(8, T.str, 16)];
  def(0, 0, cId); donnees(0, cId, [4, 255, 1, 1, t0, NOM_APPLI]);
  // device_info : l'appli (« creator ») puis les capteurs connectés
  const cDev = [F(253, T.u32), F(0, T.u8), F(2, T.u16), F(4, T.u16), F(27, T.str, 32)];
  def(1, 23, cDev); donnees(1, cDev, [t0, 0, 255, 1, NOM_APPLI]);
  nom.forEach((n, i) => donnees(1, cDev, [t0, i + 1, 255, null, n]));
  // workout : nom de l'entraînement (titre proposé)
  if (titre) { const cW = [F(4, T.enum), F(8, T.str, 40)]; def(7, 26, cW); donnees(7, cW, [SPORT_VELO, titre]); }
  // timer start
  const cEv = [F(253, T.u32), F(0, T.enum), F(1, T.enum)];
  def(2, 21, cEv); donnees(2, cEv, [t0, 0, 0]);
  // records
  const cRec = [F(253, T.u32), F(3, T.u8), F(4, T.u8), F(5, T.u32), F(6, T.u16), F(7, T.u16)];
  def(3, 20, cRec);
  let prec = null;
  for (const q of p) {
    if (prec && q[0] - prec[0] > 3000) { donnees(2, cEv, [fts(prec[0]), 0, 4]); donnees(2, cEv, [fts(q[0]), 0, 0]); }   // pause : stop puis start
    donnees(3, cRec, [fts(q[0]), q[3] > 0 ? bornes(q[3], 254) : null, bornes(q[2], 254), bornes(q[4] * 100, 0xfffffffe), bornes(q[5] * 1000, 0xfffe), bornes(q[1], 0xfffe)]);
    prec = q;
  }
  donnees(2, cEv, [t1, 0, 4]);
  // totaux
  const dureeS = st.secondes, ecoule = Math.max(dureeS, t1 - t0);
  const vMoy = st.distance / Math.max(1, dureeS);
  const calories = bornes(st.kj, 0xfffe);
  const cLap = [F(253, T.u32), F(0, T.enum), F(1, T.enum), F(2, T.u32), F(7, T.u32), F(8, T.u32), F(9, T.u32), F(11, T.u16), F(13, T.u16), F(14, T.u16),
    F(15, T.u8), F(16, T.u8), F(17, T.u8), F(19, T.u16), F(20, T.u16), F(24, T.enum), F(25, T.enum), F(39, T.enum)];
  const comm = (extra) => [fts(p[p.length - 1][0]), ...extra];
  const tot = [t0, ecoule * 1000, dureeS * 1000, bornes(st.distance * 100, 0xfffffffe), calories, bornes(vMoy * 1000, 0xfffe), bornes(st.vMax * 1000, 0xfffe),
    st.fcMoy > 0 ? bornes(st.fcMoy, 254) : null, st.fcMoy > 0 ? bornes(st.fcMax, 254) : null, st.rpmMoy > 0 ? bornes(st.rpmMoy, 254) : null, bornes(st.wMoy, 0xfffe), bornes(st.wMax, 0xfffe)];
  def(4, 19, cLap); donnees(4, cLap, comm([9, 1, ...tot, 7, SPORT_VELO, SOUS_SPORT_VIRTUEL]));
  // session
  const cSes0 = [F(253, T.u32), F(0, T.enum), F(1, T.enum), F(2, T.u32), F(7, T.u32), F(8, T.u32), F(9, T.u32), F(11, T.u16), F(14, T.u16), F(15, T.u16),
    F(16, T.u8), F(17, T.u8), F(18, T.u8), F(20, T.u16), F(21, T.u16), F(5, T.enum), F(6, T.enum), F(48, T.u32), F(25, T.u16), F(26, T.u16), F(254, T.u16), F(28, T.enum)];
  const cSes = titre ? cSes0.concat([F(110, T.str, 40)]) : cSes0;
  def(5, 18, cSes); donnees(5, cSes, comm([8, 1, ...tot, SPORT_VELO, SOUS_SPORT_VIRTUEL, bornes(st.kj * 1000, 0xfffffffe), 0, 1, 0, 0].concat(titre ? [titre] : [])));
  // activity
  const cAct = [F(253, T.u32), F(0, T.u32), F(1, T.u16), F(2, T.enum), F(3, T.enum), F(4, T.enum), F(5, T.u32)];
  def(6, 34, cAct); donnees(6, cAct, comm([dureeS * 1000, 1, 0, 26, 1, t1 - new Date(p[p.length - 1][0]).getTimezoneOffset() * 60]));

  // en-tête (14 octets) + données + CRC
  const tete = [14, 0x20, ...u(2132, 2), ...u(out.length, 4), 0x2e, 0x46, 0x49, 0x54];
  const crcTete = crc16(tete);
  const fichier = [...tete, ...u(crcTete, 2), ...out];
  fichier.push(...u(crc16(fichier), 2));
  return Uint8Array.from(fichier);
}

scope.Fit = { versFit, crc16 };
if (typeof module !== "undefined") module.exports = scope.Fit;
})(typeof window === "undefined" ? globalThis : window);
