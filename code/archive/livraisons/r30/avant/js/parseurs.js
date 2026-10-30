// >>> PARSEURS

// Un UUID Bluetooth court (ex. 0x2ad2) s'écrit en version longue standard :
const canon = (n) => "0000" + n.toString(16).padStart(4, "0") + "-0000-1000-8000-00805f9b34fb";
function uuidCourt(uuid) {
  const m = /^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/i.exec(uuid);
  return m ? parseInt(m[1], 16) : null;
}
const hex = (dv) => Array.from(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength))
  .map((b) => b.toString(16).padStart(2, "0")).join(" ");

// Indoor Bike Data (FTMS, 0x2AD2). Le 1er champ (2 octets) dit quels champs suivent.
// Piège de la norme : le bit 0 est INVERSÉ (vitesse présente quand il vaut 0).
function parseIndoorBike(dv) {
  let o = 0;
  const flags = dv.getUint16(o, true); o += 2;
  const r = {};
  if (!(flags & 0x0001)) { r.vitesse = dv.getUint16(o, true) * 0.01; o += 2; }   // km/h
  if (flags & 0x0002) { r.vitesseMoy = dv.getUint16(o, true) * 0.01; o += 2; }
  if (flags & 0x0004) { r.cadence = dv.getUint16(o, true) * 0.5; o += 2; }       // tr/min
  if (flags & 0x0008) { r.cadenceMoy = dv.getUint16(o, true) * 0.5; o += 2; }
  if (flags & 0x0010) { r.distance = dv.getUint16(o, true) | (dv.getUint8(o + 2) << 16); o += 3; }  // m
  if (flags & 0x0020) { r.resistance = dv.getInt16(o, true); o += 2; }
  if (flags & 0x0040) { r.puissance = dv.getInt16(o, true); o += 2; }            // W
  if (flags & 0x0080) { r.puissanceMoy = dv.getInt16(o, true); o += 2; }
  if (flags & 0x0100) { r.energie = dv.getUint16(o, true); o += 5; }             // total, par heure, par minute
  if (flags & 0x0200) { r.fc = dv.getUint8(o); o += 1; }
  if (flags & 0x0400) { o += 1; }                                                // équivalent métabolique
  if (flags & 0x0800) { r.temps = dv.getUint16(o, true); o += 2; }
  if (flags & 0x1000) { o += 2; }
  return r;
}

// Cycling Power Measurement (0x2A63) : puissance + éventuellement données de manivelle.
function parseCyclingPower(dv) {
  const flags = dv.getUint16(0, true);
  let o = 2;
  const r = { puissance: dv.getInt16(o, true) }; o += 2;
  if (flags & 0x0001) o += 1;                       // équilibre gauche/droite
  if (flags & 0x0004) o += 2;                       // couple cumulé
  if (flags & 0x0010) o += 6;                       // données de roue
  if (flags & 0x0020) {                             // données de manivelle
    r.tours = dv.getUint16(o, true);                // tours cumulés
    r.temps = dv.getUint16(o + 2, true);            // heure du dernier tour, en 1/1024 s
    o += 4;
  }
  return r;
}
// Cycling Speed and Cadence Measurement (0x2A5B) : roue et/ou manivelle, selon les bits du 1er octet.
// Pour la cadence, seules les données de manivelle comptent (tours cumulés + heure du dernier tour, 1/1024 s).
function parseCsc(dv) {
  const f = dv.getUint8(0);
  let o = 1;
  const r = {};
  if (f & 0x01) { r.toursRoue = dv.getUint32(o, true); r.tempsRoue = dv.getUint16(o + 4, true); o += 6; }
  if (f & 0x02) { r.tours = dv.getUint16(o, true); r.temps = dv.getUint16(o + 2, true); o += 4; }
  return r;
}
// Cadence = tours gagnés / temps écoulé entre deux paquets (compteurs sur 16 bits qui bouclent).
function cadenceManivelle(prec, cur) {
  if (!prec || cur.tours === undefined || prec.tours === undefined) return undefined;
  const dTours = (cur.tours - prec.tours + 65536) % 65536;
  const dTemps = (cur.temps - prec.temps + 65536) % 65536;
  if (dTemps === 0) return undefined;               // pas de nouveau tour : on garde l'ancienne valeur
  return dTours / (dTemps / 1024) * 60;
}

// Heart Rate Measurement (0x2A37).
function parseHR(dv) {
  const f = dv.getUint8(0);
  let o = 1;
  const r = {};
  if (f & 0x01) { r.fc = dv.getUint16(o, true); o += 2; } else { r.fc = dv.getUint8(o); o += 1; }
  const contact = (f >> 1) & 3;                     // 2 = pas de contact, 3 = contact, sinon non indiqué
  r.contact = contact === 3 ? "OK" : contact === 2 ? "perdu" : "n/a";
  if (f & 0x08) o += 2;                             // énergie dépensée
  if (f & 0x10) {                                   // intervalles RR (1/1024 s -> ms)
    r.rr = [];
    while (o + 1 < dv.byteLength) { r.rr.push(Math.round(dv.getUint16(o, true) / 1024 * 1000)); o += 2; }
  }
  return r;
}

// Commandes du Control Point FTMS (0x2AD9) : on fabrique les octets à envoyer.
const octetsSimulation = (pentePct) => {          // opcode 0x11 : vent, pente, roulement, aéro
  const b = new Uint8Array(7), dv = new DataView(b.buffer);
  dv.setUint8(0, 0x11);
  dv.setInt16(1, 0, true);                        // vent : 0
  dv.setInt16(3, Math.round(pentePct * 100), true); // pente en 0,01 %
  dv.setUint8(5, 50);                             // coefficient de roulement 0,0050 (comme notre physique)
  dv.setUint8(6, 19);                             // coefficient d'air 0,19 kg/m (CdA 0,32, rho 1,2)
  return Array.from(b);
};
const octetsPuissance = (w) => [0x05, w & 0xff, (w >> 8) & 0xff];   // opcode 0x05 : puissance cible
const OCTETS_CONTROLE = [0x00], OCTETS_DEMARRAGE = [0x07], OCTETS_STOP = [0x08, 0x01];
const RESULTATS = { 1: "succès", 2: "non supporté", 3: "paramètre invalide", 4: "échec", 5: "non autorisé" };
// <<< PARSEURS
