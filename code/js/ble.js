"use strict";
/* =====================================================================
   BLUETOOTH : trainer (puissance, cadence, résistance) et capteur cardio.
   Même logique que index.html (validée avec le Zwift Hub et le HW9), sans écran :
   l'application branche ses propres affichages sur les "crochets" (BLE.crochets).
   Les conversions d'octets sont dans parseurs.js (bloc identique à ble-diagnostic.html).
   ===================================================================== */
(function (scope) {

const crochets = {
  log: () => {},                 // (texte)
  info: () => {},                // (texte) message à l'utilisateur
  change: () => {},              // l'état d'une connexion a changé
  trainerConnecte: () => {},     // le trainer est prêt (contrôle demandé)
  trainerPerdu: () => {},        // le trainer s'est déconnecté
  memoriser: () => {}            // (rôle, appareil) connexion réussie : à retenir pour la prochaine fois
};
const log = (m) => crochets.log(m);
const info = (m) => crochets.info(m);

const NOMS = {
  0x1826: "Fitness Machine (FTMS)", 0x1818: "Cycling Power", 0x180d: "Heart Rate", 0x180f: "Battery", 0x180a: "Device Information",
  0x2acc: "FTMS Feature", 0x2ad2: "Indoor Bike Data", 0x2ad9: "FTMS Control Point", 0x2ada: "FTMS Status",
  0x2ad3: "Training Status", 0x2ad6: "Supported Resistance Range", 0x2ad8: "Supported Power Range",
  0x2a63: "Cycling Power Measurement", 0x2a65: "Cycling Power Feature", 0x2a5d: "Sensor Location",
  0x2a37: "Heart Rate Measurement", 0x2a38: "Body Sensor Location", 0x2a39: "HR Control Point",
  0x2a19: "Battery Level", 0x2a29: "Manufacturer Name", 0x2a24: "Model Number", 0x2a26: "Firmware Revision"
};
function nomUuid(uuid) {
  const c = uuidCourt(uuid);
  return c !== null ? "0x" + c.toString(16) + " " + (NOMS[c] || "(autre)") : uuid;
}

const TR = {
  device: null, cp: null, connexion: false, connecte: false, controle: false, reprise: false,
  ftms: null, power: null, precPower: null, cadManivelle: 0, tManivelle: 0, dernier: 0,
  attente: null, file: Promise.resolve(), enVol: false, envoye: null, tEnvoi: 0, tVerif: 0, echecs: 0
};
const FC = { device: null, connexion: false, connecte: false, hr: null, dernier: 0 };
// Capteur de cadence seul (Garmin, Wahoo, génériques : service standard Cycling Speed and Cadence).
const CAD = { device: null, connexion: false, connecte: false, prec: null, cad: 0, tEvt: 0 };

const decrire = (c) => ["read", "write", "writeWithoutResponse", "notify", "indicate"].filter((k) => c.properties[k]).join(", ");
function erreurBle(qui, e) {
  if (e && e.name === "NotFoundError") { log(qui + ": no device chosen."); info(""); return; }
  log("⚠ " + qui + " : " + (e && e.name) + " – " + (e && e.message));
  log("   Hints: device already taken by another app (Zwift, phone, watch)? Bluetooth allowed for Chrome in System Settings?");
  info("⚠ " + qui + " : " + ((e && e.message) || "error") + " (details in the Bluetooth log)");
}
async function abonner(c, nom, traiter) {
  try {
    c.addEventListener("characteristicvaluechanged", (e) => traiter(e.target.value));
    await c.startNotifications();
    log("Subscribed to " + nom + ".");
  } catch (e) { log("⚠ subscription to " + nom + " failed: " + e.name + " – " + e.message); }
}
async function inventaire(server) {
  const parUuid = {};
  const services = await server.getPrimaryServices();
  for (const s of services) {
    log("Service " + nomUuid(s.uuid));
    let chars = [];
    try { chars = await s.getCharacteristics(); } catch (e) { log("   ⚠ unreadable characteristics: " + e.message); }
    for (const c of chars) { log("   " + nomUuid(c.uuid) + "  [" + decrire(c) + "]"); parUuid[c.uuid] = c; }
  }
  if (!services.length) log("⚠ no accessible service.");
  return parUuid;
}

// Valeurs reçues, avec péremption : sans nouveau paquet, on retombe à 0.
// Renvoie les champs pour lesquels une source Bluetooth est connectée (les autres : absents).
function lire(maintenant) {
  const r = {};
  if (TR.connecte) {
    const frais = maintenant - TR.dernier < 4000;
    const f = TR.ftms || {}, p = TR.power || {};
    const puiss = f.puissance !== undefined ? f.puissance : p.puissance;
    let cad = f.cadence;
    if (cad === undefined) cad = (maintenant - TR.tManivelle < 2500) ? TR.cadManivelle : 0;
    r.puissance = frais ? Math.max(0, puiss || 0) : 0;
    r.cadence = frais ? Math.max(0, cad || 0) : 0;
  }
  if (FC.connecte) r.fc = (FC.hr && maintenant - FC.dernier < 5000) ? FC.hr.fc : 0;
  // Le capteur de cadence, quand il est connecté, est prioritaire sur la cadence du trainer (qui met plusieurs tours à la détecter).
  if (CAD.connecte) r.cadence = (maintenant - CAD.tEvt < 2500) ? CAD.cad : 0;
  return r;
}

// ============================ TRAINER ============================
// Les commandes passent l'une après l'autre (le Control Point n'en traite qu'une à la fois).
function commande(nom, octets, silencieux) {
  if (!TR.cp) return Promise.resolve(null);
  const tache = TR.file.then(() => envoyer(nom, octets, silencieux));
  TR.file = tache.catch(() => {});
  return tache;
}
async function envoyer(nom, octets, silencieux) {
  const cp = TR.cp;
  if (!cp) return null;
  const data = Uint8Array.from(octets);
  if (!silencieux) log("→ " + nom + " : " + hex(new DataView(data.buffer)));
  const attendre = new Promise((resolve) => {
    TR.attente = { op: octets[0], silencieux, resolve, t: setTimeout(() => { log("⚠ no answer to “" + nom + "” (3 s)"); TR.attente = null; resolve(null); }, 3000) };
  });
  try {
    if (cp.writeValueWithResponse) await cp.writeValueWithResponse(data); else await cp.writeValue(data);
  } catch (e) {
    if (TR.attente) { clearTimeout(TR.attente.t); TR.attente = null; }
    log("⚠ write “" + nom + "” failed: " + e.name + " – " + e.message);
    return null;
  }
  return attendre;
}
function reponseControle(dv) {
  const b = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
  const calme = TR.attente && TR.attente.silencieux && b[0] === 0x80 && b[2] === 1;
  if (!calme) {
    log("← Control Point : " + hex(dv));
    if (b[0] === 0x80) log("   response to opcode 0x" + b[1].toString(16) + " : " + (RESULTATS[b[2]] || "code " + b[2]));
  }
  if (b[0] === 0x80 && TR.attente && TR.attente.op === b[1]) {
    clearTimeout(TR.attente.t); const r = TR.attente.resolve; TR.attente = null; r(b[2]);
  }
}

async function connecterTrainer(connu) {
  TR.connexion = true; crochets.change();
  try {
    let device = connu;
    if (device) log("Reconnecting to the remembered trainer: " + (device.name || "(unnamed)") + "…");
    else {
      log("Looking for the trainer…");
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [0x1826] }, { services: [0x1818] }],
        optionalServices: [0x1826, 0x1818, 0x180f, 0x180a]
      });
    }
    await ouvrirTrainer(device);
  } catch (e) {
    erreurBle("Trainer", e);
    if (TR.device && TR.device.gatt && TR.device.gatt.connected) TR.device.gatt.disconnect();
  }
  TR.connexion = false; crochets.change();
}

// device.gatt.connect() peut attendre très longtemps un appareil absent : au bout de ms, on abandonne.
function connexionGatt(device, ms = 15000) {
  return new Promise((ok, no) => {
    const t = setTimeout(() => { try { device.gatt.disconnect(); } catch (e) { /* déjà coupé */ } no(new Error("no answer from the device (off, out of range, or already connected elsewhere?)")); }, ms);
    device.gatt.connect().then((s) => { clearTimeout(t); ok(s); }, (e) => { clearTimeout(t); no(e); });
  });
}
// Appareils que l'utilisateur a déjà autorisés pour cette page (permet de se reconnecter sans refaire le choix).
async function appareilsAutorises() {
  try { return navigator.bluetooth && navigator.bluetooth.getDevices ? await navigator.bluetooth.getDevices() : null; }
  catch (e) { return null; }
}
async function ouvrirTrainer(device) {
  Object.assign(TR, { device, cp: null, connecte: false, controle: false, ftms: null, power: null, precPower: null,
    cadManivelle: 0, tManivelle: 0, dernier: 0, attente: null, file: Promise.resolve(), enVol: false,
    envoye: null, tEnvoi: 0, tVerif: 0, echecs: 0, reprise: false });
  device.addEventListener("gattserverdisconnected", surDeconnexionTrainer);
  const server = await connexionGatt(device);
  log("Trainer connected: " + (device.name || "(unnamed)"));
  const c = await inventaire(server);

  const feat = c[canon(0x2acc)];
  if (feat) {
    try {
      const dv = await feat.readValue();
      const cible = dv.getUint32(4, true);
      log("Supported commands: target power " + (cible & (1 << 3) ? "yes" : "no") + ", slope simulation " + (cible & (1 << 13) ? "yes" : "no"));
    } catch (e) { log("⚠ FTMS Feature read: " + e.message); }
  }
  if (!c[canon(0x2ad2)] && !c[canon(0x2a63)]) throw new Error("neither Indoor Bike Data nor Cycling Power: incompatible trainer");
  if (c[canon(0x2ad2)]) await abonner(c[canon(0x2ad2)], "Indoor Bike Data", (dv) => {
    try { TR.ftms = parseIndoorBike(dv); TR.dernier = performance.now(); } catch (e) { log("⚠ unreadable FTMS packet: " + hex(dv)); }
  });
  if (c[canon(0x2a63)]) await abonner(c[canon(0x2a63)], "Cycling Power Measurement", (dv) => {
    try {
      const r = parseCyclingPower(dv);
      const cad = cadenceManivelle(TR.precPower, r);
      if (cad !== undefined) { TR.cadManivelle = cad; TR.tManivelle = performance.now(); }
      TR.precPower = r; TR.power = r; TR.dernier = performance.now();
    } catch (e) { log("⚠ unreadable Cycling Power packet: " + hex(dv)); }
  });
  if (c[canon(0x2ada)]) await abonner(c[canon(0x2ada)], "FTMS Status", (dv) => {
    if (dv.getUint8(0) !== 0x12) log("Status FTMS : " + hex(dv));     // 0x12 = écho de la pente : trop fréquent pour le journal
  });
  if (c[canon(0x2ad9)]) { TR.cp = c[canon(0x2ad9)]; await abonner(TR.cp, "Control Point", reponseControle); }

  TR.connecte = true;
  crochets.memoriser("trainer", device);
  crochets.trainerConnecte();
  crochets.change();

  if (!TR.cp) { log("No Control Point: the resistance will not be controlled."); info("Trainer connected, without resistance control."); return; }
  const r = await commande("Request Control", OCTETS_CONTROLE);
  if (r === 1) {
    TR.controle = true;
    commande("Start or Resume", OCTETS_DEMARRAGE);
    log("Trainer control granted.");
    info("Trainer connected: the resistance follows the workout (ERG) or stays free.");
  } else {
    log("⚠ trainer control not granted.");
    info("⚠ Trainer connected, but it refuses resistance control.");
  }
}

function surDeconnexionTrainer() {
  const etait = TR.connecte;
  TR.connecte = false; TR.controle = false; TR.cp = null; TR.enVol = false;
  log("Trainer disconnected.");
  if (etait) { info("Trainer disconnected."); crochets.trainerPerdu(); }
  crochets.change();
}
async function deconnecterTrainer() {
  if (TR.controle) await commande("Stop", OCTETS_STOP);
  if (TR.device && TR.device.gatt.connected) TR.device.gatt.disconnect();
}

// Consigne envoyée au trainer : { mode:"erg", w, index } (puissance cible) ou { mode:"libre", pente }
// (simulation de pente, 0 % par défaut : résistance libre). On n'envoie que si elle change
// (au moins 2 W d'écart, ou un autre palier), au plus une fois par seconde, et on la renvoie toutes les 30 s.
const SEUIL_W = 2, RENVOI_MS = 30000, SEUIL_PENTE = 0.2;
function majConsigne(consigne, maintenant) {
  if (!TR.connecte || !TR.controle || TR.enVol || TR.echecs >= 3) return;
  const e = TR.envoye;
  // Un changement de pente (rapport virtuel) part sans attendre la seconde de pause entre deux vérifications.
  // Idem pour un net changement de cible ERG au sein d'un même palier (ajustement par l'utilisateur : ±5 %).
  const urgent = e && ((consigne.mode === "libre" && e.mode === "libre" && Math.abs(consigne.pente - e.pente) >= SEUIL_PENTE) ||
                       (consigne.mode === "erg" && e.mode === "erg" && consigne.index === e.index && Math.abs(consigne.w - e.w) >= 10));
  if (!urgent && maintenant - TR.tVerif < 1000) return;
  TR.tVerif = maintenant;
  let doit;
  if (!e || e.mode !== consigne.mode || maintenant - TR.tEnvoi >= RENVOI_MS) doit = true;
  else if (consigne.mode === "erg") doit = consigne.index !== e.index || Math.abs(consigne.w - e.w) >= SEUIL_W;
  else doit = Math.abs(consigne.pente - e.pente) >= SEUIL_PENTE;
  if (!doit) return;
  TR.enVol = true;
  const nom = consigne.mode === "erg" ? "Target " + consigne.w + " W" : "Free, slope " + consigne.pente + " %";
  const octets = consigne.mode === "erg" ? octetsPuissance(consigne.w) : octetsSimulation(consigne.pente);
  commande(nom, octets, true).then((r) => {
    TR.enVol = false;
    if (r === 1) {
      const changeMode = !TR.envoye || TR.envoye.mode !== consigne.mode;
      const changePalier = consigne.mode === "erg" && TR.envoye && TR.envoye.index !== consigne.index;
      const changePente = consigne.mode === "libre" && !changeMode && Math.abs(consigne.pente - (TR.envoye ? TR.envoye.pente : consigne.pente)) >= SEUIL_PENTE;
      TR.envoye = Object.assign({}, consigne); TR.tEnvoi = performance.now(); TR.echecs = 0;
      if (changeMode || changePalier || changePente) log("Setpoint sent: " + nom);
    } else if (TR.connecte && r === 5 && !TR.reprise) {
      // « Non autorisé » : le trainer a perdu le contrôle (autre connexion, veille…). On le redemande, puis on renvoie la consigne.
      TR.reprise = true;
      log("Control lost: requesting control from the trainer again…");
      commande("Request Control", OCTETS_CONTROLE).then((c) => {
        TR.reprise = false;
        if (c === 1) { commande("Start or Resume", OCTETS_DEMARRAGE); TR.controle = true; TR.echecs = 0; TR.envoye = null; log("Trainer control regained."); }
        else { TR.echecs++; log("⚠ trainer control not regained."); }
      });
    } else if (TR.connecte) {
      TR.echecs++;
      log("⚠ setpoint “" + nom + "” not confirmed (attempt " + TR.echecs + "/3)");
      if (TR.echecs >= 3) info("⚠ The trainer no longer confirms commands.");
    }
  });
}

// ============================ CARDIO ============================
async function connecterFc(connu) {
  FC.connexion = true; crochets.change();
  try {
    let device = connu;
    if (device) log("Reconnecting to the remembered heart-rate sensor: " + (device.name || "(unnamed)") + "…");
    else {
      log("Looking for the heart-rate sensor…");
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [0x180d] }],
        exclusionFilters: [{ namePrefix: "Zwift" }, { namePrefix: "ZWIFT" }],    // le Hub expose un service cardio vide
        optionalServices: [0x180d, 0x180f, 0x180a]
      });
    }
    FC.device = device; FC.hr = null; FC.dernier = 0;
    device.addEventListener("gattserverdisconnected", surDeconnexionFc);
    const server = await connexionGatt(device);
    log("Heart-rate sensor connected: " + (device.name || "(unnamed)"));
    const c = await inventaire(server);
    if (!c[canon(0x2a37)]) throw new Error("no standard heart-rate measurement");
    await abonner(c[canon(0x2a37)], "Heart Rate Measurement", (dv) => {
      try { FC.hr = parseHR(dv); FC.dernier = performance.now(); } catch (e) { log("⚠ unreadable heart-rate packet: " + hex(dv)); }
    });
    FC.connecte = true;
    crochets.memoriser("fc", device);
  } catch (e) {
    erreurBle("Heart-rate sensor", e);
    if (FC.device && FC.device.gatt && FC.device.gatt.connected) FC.device.gatt.disconnect();
  }
  FC.connexion = false; crochets.change();
}
// ============================ CAPTEUR DE CADENCE ============================
async function connecterCadence(connu) {
  CAD.connexion = true; crochets.change();
  try {
    let device = connu;
    if (device) log("Reconnecting to the remembered cadence sensor: " + (device.name || "(unnamed)") + "…");
    else {
      log("Looking for the cadence sensor…");
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [0x1816] }],
        optionalServices: [0x1816, 0x180f, 0x180a]
      });
    }
    CAD.device = device; CAD.prec = null; CAD.cad = 0; CAD.tEvt = 0;
    device.addEventListener("gattserverdisconnected", surDeconnexionCadence);
    const server = await connexionGatt(device);
    log("Cadence sensor connected: " + (device.name || "(unnamed)"));
    const c = await inventaire(server);
    if (!c[canon(0x2a5b)]) throw new Error("no standard speed/cadence measurement");
    const feat = c[canon(0x2a5c)];                       // CSC Feature : bit 1 = données de manivelle
    if (feat) {
      try { const f = (await feat.readValue()).getUint16(0, true); if (!(f & 0x02)) throw new Error("this sensor only measures wheel speed, not cadence"); }
      catch (e) { if (/wheel speed/.test(e.message)) throw e; log("⚠ unreadable CSC Feature: " + e.message); }
    }
    await abonner(c[canon(0x2a5b)], "CSC Measurement", (dv) => {
      try {
        const cur = parseCsc(dv);
        if (cur.tours === undefined) return;
        const cad = cadenceManivelle(CAD.prec, cur);
        CAD.prec = { tours: cur.tours, temps: cur.temps };
        if (cad !== undefined) { CAD.cad = cad; CAD.tEvt = performance.now(); }
      } catch (e) { log("⚠ unreadable cadence packet: " + hex(dv)); }
    });
    CAD.connecte = true;
    crochets.memoriser("cad", device);
  } catch (e) {
    erreurBle("Cadence sensor", e);
    if (CAD.device && CAD.device.gatt && CAD.device.gatt.connected) CAD.device.gatt.disconnect();
  }
  CAD.connexion = false; crochets.change();
}
function surDeconnexionCadence() {
  const etait = CAD.connecte;
  CAD.connecte = false;
  log("Cadence sensor disconnected: the trainer cadence takes over.");
  if (etait) info("Cadence sensor disconnected.");
  crochets.change();
}
function deconnecterCadence() { if (CAD.device && CAD.device.gatt.connected) CAD.device.gatt.disconnect(); }

function surDeconnexionFc() {
  const etait = FC.connecte;
  FC.connecte = false;
  log("Heart-rate sensor disconnected.");
  if (etait) info("Heart-rate sensor disconnected.");
  crochets.change();
}
function deconnecterFc() { if (FC.device && FC.device.gatt.connected) FC.device.gatt.disconnect(); }

scope.BLE = { appareilsAutorises, crochets, TR, FC, CAD, disponible: () => !!navigator.bluetooth, lire, majConsigne, hex,
              connecterTrainer, deconnecterTrainer, connecterFc, deconnecterFc, connecterCadence, deconnecterCadence };
})(window);
