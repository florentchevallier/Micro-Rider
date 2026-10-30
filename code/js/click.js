"use strict";
/* =====================================================================
   Zwift Click : lecture des deux boutons (Web Bluetooth).
   Ce que l'on sait, d'après l'essai du 2026-10-26 sur un Click (matériel A.0, firmware 1.1.0) :
   - service 00000001-19ca-4651-86e5-fa29dcdd09d1 ; le Click ne parle qu'après l'écriture de « RideOn »
     dans la caractéristique 00000003 ;
   - la caractéristique 00000002 envoie ensuite environ 9 messages par seconde « 37 08 a 10 b » :
     a = bouton 1 (« + »), b = bouton 2 (« − »), valant 1 au repos et 0 quand le bouton est enfoncé ;
   - « 19 10 xx » : niveau de batterie en % (toutes les 5 s environ).
   Les UUID et le format viennent de projets non officiels et de cet essai, pas d'une documentation Zwift.
   ===================================================================== */
(function (scope) {

const ZWIFT = "00000001-19ca-4651-86e5-fa29dcdd09d1";
const car = (n) => "0000000" + n + "-19ca-4651-86e5-fa29dcdd09d1";
const RIDEON = [0x52, 0x69, 0x64, 0x65, 0x4f, 0x6e];                 // « RideOn » en ASCII
const hex = (dv) => Array.from(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength)).map((b) => b.toString(16).padStart(2, "0")).join(" ");

const crochets = { log() {}, change() {}, plus() {}, moins() {}, memoriser() {}, refuser() { return false; } };
function connexionGatt(device, ms = 15000) {                           // abandon au bout de ms si l'appareil ne répond pas
  return new Promise((ok, no) => {
    const t = setTimeout(() => { try { device.gatt.disconnect(); } catch (e) { /* déjà coupé */ } no(new Error("no answer from the Click (asleep, out of range, or already connected elsewhere?)")); }, ms);
    device.gatt.connect().then((s) => { clearTimeout(t); ok(s); }, (e) => { clearTimeout(t); no(e); });
  });
}
const CK = { connecte: false, connexion: false, device: null, batterie: null };
let session = 0, essais = 0, volontaire = false, minuteur = null;
let boutons = null;                                                     // état précédent de chaque bouton (true = enfoncé), null = pas encore vu

// Messages du Click : un octet de type, puis des champs « numéro + entier » (codage protobuf à entiers simples).
function champs(o) {
  const r = {}; let i = 1;
  while (i < o.length) {
    const cle = o[i++], num = cle >> 3;
    if ((cle & 7) !== 0) return null;                                  // on ne sait lire que les entiers simples
    let v = 0, dec = 0, b;
    do { if (i >= o.length) return null; b = o[i++]; v |= (b & 0x7f) << dec; dec += 7; } while (b & 0x80);
    r[num] = v;
  }
  return r;
}

function paquet(maSession, dv) {
  if (maSession !== session) return;                                    // message d'une ancienne connexion : ignoré
  const o = Array.from(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength));
  const f = o.length > 1 ? champs(o) : null;
  if (!f) return;
  if (o[0] === 0x37 && f[1] !== undefined && f[2] !== undefined) {
    const etat = [f[1] === 0, f[2] === 0];
    if (boutons) {
      if (etat[0] && !boutons[0]) crochets.plus();                       // on agit à l'appui, pas au relâchement
      if (etat[1] && !boutons[1]) crochets.moins();
    }
    boutons = etat;                                                      // le premier message fixe l'état sans rien déclencher
  } else if (o[0] === 0x19 && f[2] !== undefined && f[2] !== CK.batterie) {
    CK.batterie = f[2]; crochets.change();
  }
}

async function ouvrir(device) {
  // Le Zwift Hub expose le même service que le Click : s'y connecter lui ferait perdre le contrôle (FTMS « non autorisé »).
  if (crochets.refuser(device)) { const e = new Error("that is the trainer, not the Click"); e.name = "AppareilRefuse"; throw e; }
  session++; const maSession = session;
  boutons = null; CK.batterie = null;
  CK.device = device;
  device.addEventListener("gattserverdisconnected", () => {
    if (device !== CK.device || maSession !== session) return;
    CK.connecte = false; CK.connexion = false; crochets.change();
    if (volontaire) return;
    crochets.log("Click disconnected.");
    reessayer(device);
  });
  const serveur = await connexionGatt(device);
  const service = await serveur.getPrimaryService(ZWIFT);
  const notif = await service.getCharacteristic(car(2));
  const ecriture = await service.getCharacteristic(car(3));
  notif.addEventListener("characteristicvaluechanged", (e) => paquet(maSession, e.target.value));
  await notif.startNotifications();
  // Le Click se tait tant qu'il n'a pas reçu « RideOn » : c'est l'échange de départ.
  const data = Uint8Array.from(RIDEON);
  if (ecriture.properties.writeWithoutResponse && !ecriture.properties.write) await ecriture.writeValueWithoutResponse(data);
  else await ecriture.writeValueWithResponse(data);
  CK.connecte = true; CK.connexion = false; essais = 0;
  crochets.log("Click connected: " + (device.name || "unnamed") + ".");
  crochets.memoriser("click", device);
  crochets.change();
}

// Le Click se met en veille et se déconnecte facilement : trois nouveaux essais, sans refaire le choix de l'appareil.
function reessayer(device) {
  if (essais >= 3) { crochets.log("Click: reconnection abandoned (press a button to reconnect it)."); return; }
  essais++;
  CK.connexion = true; crochets.change();
  clearTimeout(minuteur);
  minuteur = setTimeout(async () => {
    if (volontaire || device !== CK.device) return;
    try { await ouvrir(device); crochets.log("Click reconnected."); }
    catch (e) {
      crochets.log("Click : reconnexion impossible (" + (e && e.name) + ").");
      CK.connexion = false;
      if (device.gatt.connected) device.gatt.disconnect(); else reessayer(device);
      crochets.change();
    }
  }, 3000);
}

async function connecter(connu) {
  volontaire = false; essais = 0; CK.connexion = true; crochets.change();
  try {
    let device = connu;
    if (device) crochets.log("Reconnecting to the remembered Click: " + (device.name || "unnamed") + "…");
    else {
      crochets.log("Looking for the Click…");
      device = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: "Zwift" }], exclusionFilters: [{ namePrefix: "Zwift Hub" }], optionalServices: [ZWIFT, 0x180f] });
    }
    await ouvrir(device);
  } catch (e) {
    CK.connexion = false;
    if (e && e.name === "NotFoundError") crochets.log("Aucun appareil Click choisi.");
    else if (e && e.name === "AppareilRefuse") { crochets.log("⚠ Click : " + e.message + " – pick “Zwift Click”."); crochets.info("You picked the trainer, not the Click. Wake the Click (press a button) then pick “Zwift Click”."); }
    else {
      crochets.log("⚠ Click : " + (e && e.name) + " – " + (e && e.message));
      crochets.info("Could not connect to the Click. It may already be connected to Zwift (phone, computer): close them, then press a Click button to wake it.");
      if (CK.device && CK.device.gatt && CK.device.gatt.connected) { volontaire = true; CK.device.gatt.disconnect(); }
    }
    crochets.change();
  }
}

function deconnecter() {
  volontaire = true; clearTimeout(minuteur); session++;
  const d = CK.device; CK.connecte = false; CK.connexion = false; CK.batterie = null; CK.device = null; boutons = null;
  if (d && d.gatt && d.gatt.connected) d.gatt.disconnect();
  crochets.log("Click disconnected (on purpose).");
  crochets.change();
}

crochets.info = () => {};
scope.Click = { crochets, CK, disponible: () => !!navigator.bluetooth, connecter, deconnecter, champs, hex };
if (typeof module !== "undefined") module.exports = scope.Click;
})(typeof window === "undefined" ? globalThis : window);
