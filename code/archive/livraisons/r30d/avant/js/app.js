"use strict";
/* =====================================================================
   APPLICATION : relie les entrées (Bluetooth ou curseurs de simulation), le noyau (physique, séance)
   et le mode d'affichage choisi. Le calcul tourne dans un "tick" cadencé par un Worker (non ralenti
   quand la fenêtre est masquée) ; le dessin suit requestAnimationFrame.
   ===================================================================== */
(function () {
const $ = (id) => document.getElementById(id);
const memo = {
  lire(k, d) { try { const v = localStorage.getItem("micro-rider." + k); return v === null ? d : v; } catch (e) { return d; } },
  ecrire(k, v) { try { localStorage.setItem("micro-rider." + k, v); } catch (e) { /* stockage indisponible : sans conséquence */ } }
};
const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

// ---------------- état ----------------
const etat = Noyau.creerEtat();
const entree = { puissance: 0, cadence: 0, fc: 0 };
const lecteur = Noyau.creerLecteur();
const sim = { puissance: 150, cadence: 85, fc: 130, suivreCible: false };
let historique = [], pauseAuto = false, derniereSeconde = -1;
let defs = {}, defCourante = null;
let consigneErg = false;
let ajustErg = 0;                                           // ajustement de la cible ERG, en % (multiple de 5, −50 à +50)
const PAS_ERG = 5, LIMITE_ERG = 50;
const cibleAjustee = (w) => Math.max(0, Math.min(1000, Math.round(w * (1 + ajustErg / 100))));
const signe = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n);
let sortie = Sortie.creer(), derniereSecondeEnr = -1, confirmeNouvelle = null;
let rapport = Noyau.RAPPORTS.defaut;                         // rapport virtuel, 1 à 24
let modeNom = "promenade", arcadeOuverte = false, borneJeux = null, entrees = null, surface = "asphalte", cyclistes = "garcon", voiture = "rare", zoomPart = 0.5;
const modes = {};

// ---------------- journal et messages ----------------
const lignes = [];
function log(msg) {
  const t = new Date();
  lignes.push(t.toLocaleTimeString("en-GB") + "." + String(t.getMilliseconds()).padStart(3, "0") + "  " + msg);
  if (lignes.length > 600) lignes.shift();
  try { localStorage.setItem("micro-rider.journal", lignes.slice(-300).join("\n")); } catch (e) { /* stockage indisponible */ }   // lu par start.html (rapport à envoyer)
  const j = $("journal"); j.textContent = lignes.join("\n"); j.scrollTop = j.scrollHeight;
}
const info = (t) => { $("info").textContent = t || ""; };
$("bCopierJournal").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(lignes.join("\n")); log("Log copied to the clipboard."); }
  catch (e) { log("Automatic copy failed: select the log text by hand."); }
});

// ---------------- séances ----------------
function fcMax() { const v = Number($("fcmax").value); return v >= 100 ? v : 190; }
function ftp() { const v = Number($("ftp").value); return v > 0 ? v : 250; }
function chargerDef(def) {
  try {
    const s = Noyau.construireSeance(def, ftp());
    defCourante = def; lecteur.charger(s); remettreErg(); historique = []; pauseAuto = false;
    log("Workout loaded: " + s.nom + " (" + mmss(s.duree) + ", FTP " + s.ftp + " W).");
    info("");
  } catch (e) { info("⚠ Workout rejected: " + e.message); log("⚠ workout rejected: " + e.message); }
  majTextes();
}
function remplirSeances(selection) {
  const sel = $("seance"); sel.innerHTML = '<option value="">No workout (free ride)</option>';
  let groupe = null;
  for (const id in defs) {
    const o = document.createElement("option"); o.value = id; o.textContent = defs[id].nom;
    if (id.startsWith("dossier:")) {
      if (!groupe) { groupe = document.createElement("optgroup"); groupe.label = "Folder: " + (dossierH ? dossierH.name : ""); sel.append(groupe); }
      groupe.append(o);
    } else sel.append(o);
  }
  sel.value = selection || "";
}
for (const s of Seances.SEANCES) defs[s.id] = s;
$("seance").addEventListener("change", async (e) => {
  const id = e.target.value; memo.ecrire("seance", id);
  if (id && defs[id] && defs[id].paresseux && !(await lireDefDossier(id))) { e.target.value = ""; return; }
  if (id) chargerDef(defs[id]); else { defCourante = null; lecteur.charger(null); historique = []; majTextes(); }
});
// Séance d'un fichier du dossier : lue seulement quand on la choisit.
async function lireDefDossier(id) {
  const d = defs[id];
  try {
    const f = await d.paresseux.getFile();
    defs[id] = Object.assign({}, Seances.lireFichier(f.name, await f.text()), { nom: d.nom });
    return true;
  } catch (err) { info("⚠ " + d.nom + " : " + err.message); log("⚠ folder, " + d.nom + " : " + err.message); return false; }
}
// ---------------- dossier de séances (Chrome / Edge) ----------------
let dossierH = null;
function majBoutonsDossier(texte) {
  const dispo = Dossier.disponible();
  $("bDossier").hidden = !dispo; $("bDossierAutre").hidden = !dispo || !dossierH;
  if (dispo) $("bDossier").textContent = texte || (dossierH ? "↻ “" + dossierH.name + "”" : "Workout folder…");
}
async function listerDossier() {
  try {
    const liste = await Dossier.lister(dossierH);
    const courant = $("seance").value || memo.lire("seance", "");
    for (const id of Object.keys(defs)) if (id.startsWith("dossier:")) delete defs[id];
    for (const f of liste) defs["dossier:" + f.chemin] = { paresseux: f.handle, nom: f.nom };
    const garde = defs[courant] ? courant : "";
    remplirSeances(garde);
    majBoutonsDossier("↻ « " + dossierH.name + " » (" + liste.length + ")");
    log("Workout folder “" + dossierH.name + "”: " + liste.length + " file(s).");
    if (garde && garde.startsWith("dossier:") && !defCourante && await lireDefDossier(garde)) chargerDef(defs[garde]);
    info("");
  } catch (e) { info("⚠ Unreadable folder: " + e.message); log("⚠ folder: " + e.message); }
}
async function choisirDossier() {
  try { dossierH = await Dossier.choisir(); } catch (e) { if (e && e.name !== "AbortError") { info("⚠ Folder: " + e.message); log("⚠ folder: " + e.message); } return; }
  await listerDossier();
}
$("bDossier").addEventListener("click", async () => {
  if (!dossierH) return choisirDossier();
  if (await Dossier.permission(dossierH, true) === "granted") await listerDossier(); else info("Permission denied for folder “" + dossierH.name + "”.");
});
$("bDossierAutre").addEventListener("click", choisirDossier);
async function initDossier() {
  if (!Dossier.disponible()) { majBoutonsDossier(); return; }
  dossierH = await Dossier.restaurer(); majBoutonsDossier();
  if (!dossierH) return;
  if (await Dossier.permission(dossierH, false) === "granted") await listerDossier();
  else majBoutonsDossier("Allow “" + dossierH.name + " »");
}
$("ftp").addEventListener("change", () => { memo.ecrire("ftp", $("ftp").value); if (defCourante && lecteur.etat !== "en cours" && lecteur.etat !== "pause") chargerDef(defCourante); });
$("fichier").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const def = Seances.lireFichier(f.name, await f.text());
    const id = "fichier:" + f.name; defs[id] = Object.assign({}, def, { nom: def.nom || f.name });
    remplirSeances(id); chargerDef(defs[id]);
  } catch (err) { info("⚠ " + f.name + " : " + err.message); log("⚠ file " + f.name + " : " + err.message); }
});
$("bDemarrer").addEventListener("click", () => {
  if (lecteur.etat === "prete" || lecteur.etat === "finie") {
    historique = []; derniereSeconde = -1; lecteur.demarrer(); log("Workout started.");
    fixerRapport(Noyau.RAPPORTS.defaut, "workout start"); remettreErg();
  }
  else if (lecteur.etat === "en cours") { lecteur.pause(); pauseAuto = false; log("Workout paused."); }
  else if (lecteur.etat === "pause") { lecteur.reprendre(); pauseAuto = false; log("Workout resumed."); }
  majTextes();
});
$("bArreter").addEventListener("click", () => { remettreErg(); lecteur.arreter(); historique = []; pauseAuto = false; log("Workout stopped."); majTextes(); });

// ---------------- Bluetooth ----------------
BLE.crochets.log = log; BLE.crochets.info = info;
BLE.crochets.change = majBoutonsBle;
BLE.crochets.trainerPerdu = () => {
  if (lecteur.etat === "en cours") { lecteur.pause(); pauseAuto = true; info("Trainer disconnected: workout paused."); }
  majSources();
};
BLE.crochets.trainerConnecte = () => {
  if (pauseAuto && lecteur.etat === "pause") { lecteur.reprendre(); pauseAuto = false; log("Workout resumed after reconnecting."); }
  majSources();
};
function majBoutonsBle() {
  for (const [id, S, nom, libre, titre] of [
    ["bTrainer", BLE.TR, "Trainer", "Connect trainer", "Zwift Hub or another FTMS trainer"],
    ["bFc", BLE.FC, "Cardio", "Connect heart rate", "Bluetooth heart-rate sensor (HW9, watch in broadcast mode…)"],
    ["bCad", BLE.CAD, "Cadence", "Connect cadence", "Standalone Bluetooth cadence sensor (Garmin, Wahoo…): takes priority over the trainer cadence"]
  ]) {
    const b = $(id);
    b.className = "conn" + (S.connecte ? " ok" : S.connexion ? " att" : "");
    b.querySelector(".txt").textContent = S.connecte ? ((S.device && S.device.name) || nom) + "  ✕" : S.connexion ? "Connecting…" : libre;
    b.title = S.connecte ? "Click to disconnect" : titre;
  }
  majSources();
}
function majSources() {
  const tr = BLE.TR.connecte, fc = BLE.FC.connecte, cad = BLE.CAD.connecte;
  $("sP").disabled = tr; $("sC").disabled = tr || cad; $("sF").disabled = fc; $("suivre").disabled = tr;
  if (tr) $("sim").open = false;
}
// ---- mémoire des appareils Bluetooth ----
// À chaque connexion réussie, on retient l'appareil (identifiant + nom). Au clic sur le bouton de connexion, si Chrome
// connaît encore l'appareil (navigator.bluetooth.getDevices), on s'y reconnecte sans rouvrir la liste de choix ;
// sinon, ou si cette reconnexion échoue, le clic suivant ouvre la liste. Au démarrage, on tente la même reconnexion
// (désactivable dans les options). Les identifiants sont ceux de Chrome pour cette page : rien ne sort de l'ordinateur.
const ROLES = { trainer: "Trainer", fc: "Cardio", click: "Click", cad: "Cadence" };
const memoire = {
  lire(role) { try { const v = JSON.parse(memo.lire("bt." + role, "")); return v && v.id ? v : null; } catch (e) { return null; } },
  ecrire(role, d) { memo.ecrire("bt." + role, JSON.stringify({ id: d.id, nom: d.name || "" })); },
  oublier(role) { memo.ecrire("bt." + role, ""); }
};
const forcerChoix = {};                                      // rôle → true quand la reconnexion directe a échoué : le prochain clic ouvre la liste
function crochetMemoriser(role, device) { memoire.ecrire(role, device); delete forcerChoix[role]; majAppareils(); }
BLE.crochets.memoriser = crochetMemoriser; Click.crochets.memoriser = crochetMemoriser;
async function appareilMemorise(role) {
  const m = memoire.lire(role); if (!m || forcerChoix[role]) return null;
  const liste = await BLE.appareilsAutorises();
  return (liste && liste.find((d) => d.id === m.id)) || null;
}
const lanceurs = {
  trainer: (d) => BLE.connecterTrainer(d), fc: (d) => BLE.connecterFc(d), click: (d) => Click.connecter(d), cad: (d) => BLE.connecterCadence(d)
};
const connecte = { trainer: () => BLE.TR.connecte, fc: () => BLE.FC.connecte, click: () => Click.CK.connecte, cad: () => BLE.CAD.connecte };
const enCours = { trainer: () => BLE.TR.connexion, fc: () => BLE.FC.connexion, click: () => Click.CK.connexion, cad: () => BLE.CAD.connexion };
async function connecterRole(role) {
  const d = await appareilMemorise(role);
  await lanceurs[role](d || undefined);
  if (d && !connecte[role]()) { forcerChoix[role] = true; info(ROLES[role] + ": the remembered device does not respond. Click again to pick one from the list."); }
}
$("bTrainer").addEventListener("click", () => { if (BLE.TR.connexion) return; if (BLE.TR.connecte) BLE.deconnecterTrainer(); else connecterRole("trainer"); });
$("bFc").addEventListener("click", () => { if (BLE.FC.connexion) return; if (BLE.FC.connecte) BLE.deconnecterFc(); else connecterRole("fc"); });
$("bCad").addEventListener("click", () => { if (BLE.CAD.connexion) return; if (BLE.CAD.connecte) BLE.deconnecterCadence(); else connecterRole("cad"); });
async function reconnexionAuto() {
  if (memo.lire("btAuto", "1") !== "1" || !BLE.disponible()) return;
  const liste = await BLE.appareilsAutorises();
  if (liste === null) { log("Automatic reconnection impossible: this browser cannot find the already-authorised devices."); return; }
  log("Bluetooth devices already authorised for this page: " + liste.length + ".");
  for (const role of ["trainer", "fc", "cad", "click"]) {
    const m = memoire.lire(role); if (!m || connecte[role]() || enCours[role]()) continue;
    const d = liste.find((x) => x.id === m.id);
    if (!d) { log("Automatic reconnection: " + ROLES[role] + " “" + m.nom + "” is no longer authorised, it must be picked again."); continue; }
    await lanceurs[role](d);
    if (!connecte[role]()) log("Automatic reconnection: " + ROLES[role] + " “" + m.nom + "” does not respond.");
  }
  info("");
}
function majAppareils() {
  for (const role of Object.keys(ROLES)) {
    const m = memoire.lire(role);
    $("m" + ROLES[role]).textContent = m ? (m.nom || "(unnamed)") : "aucun";
    $("o" + ROLES[role]).disabled = !m;
  }
}
for (const role of Object.keys(ROLES)) $("o" + ROLES[role]).addEventListener("click", () => { memoire.oublier(role); delete forcerChoix[role]; log(ROLES[role] + ": remembered device forgotten."); majAppareils(); });
$("btAuto").checked = memo.lire("btAuto", "1") === "1";
$("btAuto").addEventListener("change", (e) => memo.ecrire("btAuto", e.target.checked ? "1" : "0"));
if (!(navigator.bluetooth && navigator.bluetooth.getDevices)) $("infoAppareils").textContent = "This browser cannot reconnect without asking again: only the name of the last device is remembered.";
// Zwift Click : ses deux boutons changent de rapport (voir plus bas).
Click.crochets.log = log; Click.crochets.info = info; Click.crochets.change = majBoutonClick;
function majBoutonClick() {
  const K = Click.CK, b = $("bClick");
  b.className = "conn" + (K.connecte ? " ok" : K.connexion ? " att" : "");
  b.querySelector(".txt").textContent = K.connecte ? ((K.device && K.device.name) || "Zwift Click") + "  ✕" : K.connexion ? "Connecting…" : "Connect Click";
  b.title = K.connecte ? "Buttons: 1 = harder gear, 2 = easier" + (K.batterie !== null ? " · battery " + K.batterie + " %" : "") + " · click to disconnect" : "Zwift Click: changes the virtual gear";
}
$("bClick").addEventListener("click", () => { if (Click.CK.connexion && !Click.CK.connecte) return; if (Click.CK.connecte) Click.deconnecter(); else connecterRole("click"); });
if (!BLE.disponible()) {
  $("bTrainer").disabled = true; $("bFc").disabled = true; $("bCad").disabled = true; $("bClick").disabled = true;
  info("Web Bluetooth is not available in this browser: use Chrome (or Edge). The simulation sliders remain usable.");
}

// ---------------- simulation (sans matériel) ----------------
for (const [id, cle, sortie] of [["sP", "puissance", "oP"], ["sC", "cadence", "oC"], ["sF", "fc", "oF"]]) {
  const el = $(id), out = $(sortie);
  const lire = () => { sim[cle] = Number(el.value); out.textContent = el.value; };
  el.addEventListener("input", lire); lire();
}
$("suivre").addEventListener("change", (e) => { sim.suivreCible = e.target.checked; });

// ---------------- rapports virtuels et touches ----------------
// Le Hub n'a qu'un pignon : un rapport (1 à 24) est traduit en pente simulée (Noyau.penteDuRapport).
// Il ne joue qu'en résistance libre ; pendant un palier ERG la puissance est imposée par la séance.
const NOMS_TOUCHES = { "+": "+ (plus)", "-": "− (minus)", ArrowUp: "↑ Up", ArrowDown: "↓ Down", ArrowLeft: "← Left", ArrowRight: "→ Right", PageUp: "Page ↑", PageDown: "Page ↓" };
const nomTouche = (k) => NOMS_TOUCHES[k] || (k.length === 1 ? k.toUpperCase() : k);
// Les rapports vont aux deux boutons pressoirs de la borne (touches + et −, comme le Zwift Click) ; le joystick fait
// haut = boost, bas = frein ; gauche/droite (changer de file) n'ont pas encore d'action : seul le halo réagit.
const DEFAUT_TOUCHES = { plus: "+", moins: "-", boost: "ArrowUp", frein: "ArrowDown", gauche: "ArrowLeft", droite: "ArrowRight" };
const ACTIONS = Object.keys(DEFAUT_TOUCHES);
const cap = (a) => a[0].toUpperCase() + a.slice(1);
const touches = {}; for (const a of ACTIONS) touches[a] = memo.lire("touche." + a, DEFAUT_TOUCHES[a]);
const minuscule = (k) => (k.length === 1 ? k.toLowerCase() : k);
const minuteurs = {};
function flash(id, cls = "flash", ms = 180) {
  const b = $(id); b.classList.add(cls); clearTimeout(minuteurs[id + cls]);
  minuteurs[id + cls] = setTimeout(() => b.classList.remove(cls), ms);
}
// Résistance libre : « 10/24 » (rapport virtuel = pente simulée). Palier ERG : « ERG 110 % » (la cible de la séance multipliée par 100 % + l'ajustement).
function majRapport() {
  const html = consigneErg ? "ERG " + (100 + ajustErg) + "<small> %</small>" : rapport + "<small>/" + Noyau.RAPPORTS.max + "</small>";
  if ($("rapport").innerHTML !== html) $("rapport").innerHTML = html;
  const p = Noyau.penteDuRapport(rapport);
  $("rapport").title = consigneErg ? "ERG target at " + (100 + ajustErg) + " % of the workout (− and +: " + PAS_ERG + " % per notch)"
    : "Simulated slope: " + (p > 0 ? "+" : "") + String(p) + " %";
  $("groupeRapport").classList.toggle("erg", consigneErg);
}
function ajusterErg(delta, source) {
  const n = Math.max(-LIMITE_ERG, Math.min(LIMITE_ERG, ajustErg + delta));
  if (n === ajustErg) return false;
  ajustErg = n; majRapport();
  log("ERG target: " + (100 + n) + " % of the workout (" + source + ").");
  return true;
}
function remettreErg() { if (ajustErg !== 0) { ajustErg = 0; majRapport(); } }
function arcadeJoystick(dir) { if (modes.arcade && modes.arcade.pret && modes.arcade.obj.joystick) modes.arcade.obj.joystick(dir); }
function arcadeHaut(v) { if (modes.arcade && modes.arcade.pret && modes.arcade.obj.joystickHaut) modes.arcade.obj.joystickHaut(v); }
function arcadeSignal(nom) { if (modes.arcade && modes.arcade.pret && modes.arcade.obj.signal) modes.arcade.obj.signal(nom); }
function fixerRapport(g, source) {
  const n = Math.min(Noyau.RAPPORTS.max, Math.max(Noyau.RAPPORTS.min, g));
  if (n === rapport) return false;
  rapport = n; majRapport();
  const p = Noyau.penteDuRapport(n);
  log("Gear " + n + "/" + Noyau.RAPPORTS.max + " (simulated slope " + (p > 0 ? "+" : "") + String(p) + " %), " + source + ".");
  return true;
}
function changerRapport(delta, source) {
  flash(delta > 0 ? "bPlus" : "bMoins");
  arcadeSignal(delta > 0 ? "plus" : "moins");
  if (consigneErg) return ajusterErg(delta * PAS_ERG, source);        // pendant un palier ERG : la cible change, pas la pente
  return fixerRapport(rapport + delta, source);
}
$("bPlus").addEventListener("click", () => changerRapport(+1, "button"));
$("bMoins").addEventListener("click", () => changerRapport(-1, "button"));

// Frein (tenu) et boost (une impulsion, puis pause) : uniquement le vélo virtuel.
let frein = false;
function tenirFrein(v) {
  if (frein === v) return;
  frein = v; $("bFrein").classList.toggle("frein-actif", v);
  if (v) log("Brake."); 
}
function lancerBoost(source) {
  arcadeSignal("boost");                                      // le joystick de la borne se pousse vers l'écran un instant, qu'il y ait boost ou refus
  if (Noyau.declencherBoost(etat)) { log("Boost (" + source + "): +" + Math.round(Noyau.BOOST.facteur * 100) + " % for " + Noyau.BOOST.duree + " s."); majBoost(); return true; }
  flash("bBoost", "refus", 200);
  return false;
}
function majBoost() {
  const b = Noyau.etatBoost(etat), el = $("bBoost");
  const texte = b.actif ? "Boost " + Math.ceil(b.reste) + " s" : !b.pret ? "Boost (" + Math.ceil(b.attente) + " s)" : "Boost";
  if (el.textContent !== texte) el.textContent = texte;
  el.classList.toggle("boost-actif", b.actif); el.classList.toggle("boost-attente", !b.actif && !b.pret);
}
$("bBoost").addEventListener("click", () => lancerBoost("button"));
$("bFrein").addEventListener("pointerdown", (e) => { $("bFrein").setPointerCapture(e.pointerId); tenirFrein(true); });
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) $("bFrein").addEventListener(ev, () => tenirFrein(false));
window.addEventListener("blur", () => { tenirFrein(false); arcadeJoystick(0); arcadeHaut(false); });

let capture = null;                                             // action en cours de choix d'une touche
function majTouches() {
  for (const a of ACTIONS) {
    $("k" + cap(a)).textContent = nomTouche(touches[a]);
    $("c" + cap(a)).textContent = capture === a ? "Press a key…" : "Change…";
  }
  $("bPlus").title = "Harder (key: " + nomTouche(touches.plus) + ")"; $("bMoins").title = "Easier (key: " + nomTouche(touches.moins) + ")";
}
const LIBELLES = { plus: "harder gear", moins: "easier gear", boost: "boost", frein: "brake", gauche: "joystick left", droite: "joystick right" };
for (const a of ACTIONS) $("c" + cap(a)).addEventListener("click", () => { capture = capture === a ? null : a; majTouches(); });
document.addEventListener("keydown", (e) => {
  if (capture) {
    if (["Shift", "Control", "Alt", "Meta", "CapsLock", "AltGraph"].includes(e.key)) return;     // on attend la vraie touche
    e.preventDefault(); e.stopPropagation();
    if (e.key === "Escape") { capture = null; majTouches(); return; }
    if (["Tab", "Enter", " "].includes(e.key)) { info("This key is already used to navigate the page: pick another one."); return; }
    if (ACTIONS.some((a) => a !== capture && minuscule(e.key) === minuscule(touches[a]))) { info("This key is already used by another setting."); return; }
    touches[capture] = e.key; memo.ecrire("touche." + capture, e.key);
    log("Key “" + LIBELLES[capture] + " » : " + nomTouche(e.key) + ".");
    capture = null; info(""); majTouches(); return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;      // ne pas voler les flèches d'un champ
  if (arcadeOuverte && Entrees.TOUCHES[e.key]) return;                // borne ouverte : flèches, Entrée, Espace, X, Z, Retour arrière, Échap vont aux jeux
  const k = minuscule(e.key);
  const action = ACTIONS.find((a) => k === minuscule(touches[a]));
  if (!action) return;
  e.preventDefault();
  if (e.repeat) return;
  if (action === "plus") changerRapport(+1, "keyboard");
  else if (action === "moins") changerRapport(-1, "keyboard");
  else if (action === "boost") { arcadeHaut(true); lancerBoost("keyboard"); }
  else if (action === "frein") tenirFrein(true);
  else arcadeJoystick(action === "gauche" ? -1 : 1);                 // changer de file : pas encore d'action, seulement le halo
}, true);
document.addEventListener("keyup", (e) => {
  const k = minuscule(e.key);
  if (k === minuscule(touches.frein)) tenirFrein(false);
  if (k === minuscule(touches.boost)) arcadeHaut(false);
  if (k === minuscule(touches.gauche) || k === minuscule(touches.droite)) arcadeJoystick(0);
});
document.addEventListener("change", (e) => { if (e.target.tagName === "SELECT") e.target.blur(); });
document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("button"); if (b) b.blur(); });          // après un clic, le clavier revient aux flèches (jeux, rapports)   // rendre les flèches au rapport
Click.crochets.refuser = (d) => !!(BLE.TR.device && BLE.TR.device.id === d.id);
Click.crochets.plus = () => changerRapport(+1, "Click");
Click.crochets.moins = () => changerRapport(-1, "Click");
majRapport(); majTouches(); majBoost();

// ---------------- enregistrement de la sortie et export .tcx ----------------
// Une mesure par seconde, seulement avec un vrai trainer connecté, et seulement quand on pédale
// ou que la séance tourne (comme Zwift, le temps d'une séance continue si on s'arrête de pédaler).
const CLE_SORTIE = "sortie";
function enregistrer(maintenant) {
  if (!BLE.TR.connecte) return;
  const actif = lecteur.etat === "en cours" || entree.puissance > 0 || entree.cadence > 0;
  if (!actif) return;
  const sec = Math.floor(Date.now() / 1000);
  if (sec === derniereSecondeEnr) return;
  derniereSecondeEnr = sec;
  if (!sortie.points.length) sortie.seance = lecteur.seance && lecteur.etat === "en cours" ? lecteur.seance.nom : "";
  sortie.ajouter(Date.now(), entree.puissance, entree.cadence, entree.fc, etat.d, etat.v);
  if (sortie.points.length % 30 === 1) sauverSortie();
  majSortie();
}
function sauverSortie() { if (sortie.points.length) memo.ecrire(CLE_SORTIE, sortie.serialiser()); else memo.ecrire(CLE_SORTIE, ""); }
function majSortie() {
  const st = sortie.stats(), n = st.n;
  const texte = n ? "Ride: " + mmss(st.secondes) + " · " + (st.distance / 1000).toFixed(1) + " km · " + Math.round(st.wMoy) + " W avg." : "Ride: nothing recorded";
  if ($("etatSortie").textContent !== texte) $("etatSortie").textContent = texte;
  $("bTcx").disabled = n < 5; $("bFit").disabled = n < 5; $("bCopier").disabled = n < 5;
  const tt = n >= 5 ? "Title: " + texteSortie().replace("\n", "\nDescription: ") : "";
  if ($("texteSortie").textContent !== tt) { $("texteSortie").textContent = tt.replace("\nDescription", "  ·  Description"); $("texteSortie").title = tt; $("texteSortie").hidden = !tt; } $("bNouvelle").disabled = n === 0;
}
function nomFichier(ext) {
  const d = new Date(sortie.points[0][0]), z = (x) => String(x).padStart(2, "0");
  return "micro-rider-" + d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + "-" + z(d.getHours()) + z(d.getMinutes()) + "." + ext;
}
function telecharger(ext, contenu, type) {
  try {
    const url = URL.createObjectURL(new Blob([contenu()], { type }));
    const a = document.createElement("a"); a.href = url; a.download = nomFichier(ext); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    log("Ride exported: " + a.download + " (" + sortie.points.length + " samples).");
  } catch (e) { info("⚠ Export failed: " + e.message); log("⚠ export ." + ext + " : " + e.message); }
}
$("bTcx").addEventListener("click", () => telecharger("tcx", () => sortie.tcx(appareils()), "application/vnd.garmin.tcx+xml"));
// .fit : porte le sous-sport « activité virtuelle » (Strava classe en « Vélo virtuel ») ; liste les capteurs connectés.
const nom = (x) => (x.connecte && x.device && x.device.name) || "";
const appareils = () => ({ trainer: nom(BLE.TR), click: nom(Click.CK), fc: nom(BLE.FC), cad: nom(BLE.CAD) });
const nomsAppareils = () => { const a = appareils(); return [a.trainer, a.click, a.fc, a.cad].filter(Boolean); };
// Titre + description proposés pour Strava (qui ne les lit pas dans le fichier) : affichés, et copiés par le bouton dédié.
const texteSortie = () => Sortie.titre(sortie) + "\n" + Sortie.description(appareils());
let retourCopie = null;
$("bCopier").addEventListener("click", async () => {
  const b = $("bCopier"), txt = texteSortie();
  let ok = false;
  try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) { log("⚠ clipboard denied: " + e.message); }
  b.textContent = ok ? "Copied ✓" : "Copy failed: select the text";
  if (ok) log("Title and description copied: " + txt.replace("\n", " — "));
  clearTimeout(retourCopie); retourCopie = setTimeout(() => { b.textContent = "Copy title + description"; }, 2500);
});
$("bFit").addEventListener("click", () => telecharger("fit", () => Fit.versFit(sortie, nomsAppareils(), Sortie.titre(sortie)), "application/octet-stream"));
$("bNouvelle").addEventListener("click", () => {
  const b = $("bNouvelle");
  if (confirmeNouvelle === null) {                                   // premier clic : demande confirmation, sans fenêtre
    b.textContent = "Erase? Confirm"; confirmeNouvelle = setTimeout(() => { confirmeNouvelle = null; b.textContent = "New ride"; }, 4000);
    return;
  }
  clearTimeout(confirmeNouvelle); confirmeNouvelle = null; b.textContent = "New ride";
  sortie.vider(); sauverSortie(); log("Ride erased."); majSortie();
});
window.addEventListener("pagehide", sauverSortie);
const sortieSauvee = Sortie.restaurer(memo.lire(CLE_SORTIE, ""));
if (sortieSauvee && sortieSauvee.points.length) {
  sortie = sortieSauvee; log("Previous ride recovered: " + sortie.points.length + " samples (“Download .tcx” or “New ride”).");
}
majSortie();

// ---------------- le tick : lecture des entrées, physique, séance, commandes ----------------
let dernierTick = performance.now();
function tick() {
  const maintenant = performance.now();
  const dt = Math.min((maintenant - dernierTick) / 1000, 5);       // plafond : sortie de veille, pas de grand saut
  dernierTick = maintenant;

  const r = BLE.lire(maintenant);
  const c = lecteur.etat === "en cours" ? Noyau.cibleA(lecteur.seance, lecteur.t) : null;
  entree.puissance = r.puissance !== undefined ? r.puissance : (sim.suivreCible && c && !c.libre ? c.w : sim.puissance);
  entree.cadence = r.cadence !== undefined ? r.cadence : sim.cadence;
  entree.fc = r.fc !== undefined ? r.fc : sim.fc;

  enregistrer(maintenant);
  const pente = Noyau.penteDuRapport(rapport), cons = lecteur.consigne(pente);
  const pedale = entree.puissance >= 5 || entree.cadence >= 5;
  Noyau.avancer(etat, entree.puissance, cons.mode === "libre" ? cons.pente : 0, dt, pedale, frein);
  majBoost();
  lecteur.avancer(dt);
  if (lecteur.etat === "en cours") {                              // trace de la puissance réelle, une fois par seconde
    const s = Math.floor(lecteur.t);
    if (s !== derniereSeconde) { derniereSeconde = s; historique.push({ t: lecteur.t, w: entree.puissance, c: entree.cadence, f: entree.fc }); }
  }
  const consigne = lecteur.consigne(pente);
  if (consigne.mode === "erg") consigne.w = cibleAjustee(consigne.w);
  BLE.majConsigne(consigne, maintenant);
  if (consigneErg !== (consigne.mode === "erg")) { consigneErg = consigne.mode === "erg"; majRapport(); }
  majTextes();
}

// ---------------- affichage ----------------
// Le calcul ne tourne que 5 fois par seconde : entre deux ticks, on prolonge la distance avec la vitesse
// pour que le décor avance à chaque image (sinon il avance par à-coups). Jamais de retour en arrière.
// La distance « de décor » = distance réelle × (1 + coefficient de défilement) : le décor peut aller plus vite que
// la vitesse affichée si l'impression de vitesse est trop faible. Elle est cumulée par morceaux, pour que changer le
// coefficient en route ne fasse sauter ni reculer le décor.
let dAff = 0, dBase = 0, coefDefil = 0;
function distanceAffichee(maintenant) {
  const d = etat.d + etat.bonusD + Noyau.vitesseVirtuelle(etat) * Math.min(0.5, Math.max(0, (maintenant - dernierTick) / 1000));
  if (d > dBase) { dAff += (d - dBase) * (1 + coefDefil / 100); dBase = d; }
  return dAff;
}
// Le Hub met plusieurs tours de pédale à détecter la cadence : dès que la puissance dépasse 0, le cycliste dessiné
// pédale au moins à la cadence d'animation minimale, pour que le vélo ne roule pas jambes immobiles.
const CADENCE_ANIM_MINI = 30;
function cadenceAnimee() {
  if (entree.cadence >= 5) return entree.cadence;
  return entree.puissance >= 5 ? CADENCE_ANIM_MINI : 0;
}
function valeurs() {
  const tc = (lecteur.etat === "en cours" || lecteur.etat === "pause") && lecteur.seance ? Noyau.cibleA(lecteur.seance, lecteur.t) : null;
  return { puissance: entree.puissance, cadence: entree.cadence, cadenceAnim: cadenceAnimee(), fc: entree.fc, vitesseKmh: Noyau.vitesseVirtuelle(etat) * 3.6, distance: distanceAffichee(performance.now()),
           surface, cyclistes, voiture, zoomPart, lecteur, historique, fcMax: fcMax(), cible: tc && !tc.libre ? cibleAjustee(tc.w) : null, ajustErg,
           rapport, rapportActif: !consigneErg, frein, boost: Noyau.etatBoost(etat) };
}
function majTextes() {
  const l = lecteur, b = $("bDemarrer");
  const libelle = { aucune: "Start", prete: "Start", "en cours": "Pause", pause: "Resume", finie: "Restart" }[l.etat];
  const ecrire = (el, t) => { if (el.textContent !== t) el.textContent = t; };       // on n'écrit dans la page que si le texte change
  ecrire(b, libelle); b.disabled = l.etat === "aucune";
  $("bArreter").disabled = !(l.etat === "en cours" || l.etat === "pause");
  $("ftp").disabled = l.etat === "en cours" || l.etat === "pause";
  ecrire($("etatSeance"), l.seance ? ({ prete: "ready", "en cours": "running", pause: "paused", finie: "finished" }[l.etat]) + " · " + mmss(l.t) + " / " + mmss(l.seance.duree) : "no workout");
}
let dernierDessin = performance.now();
function dessiner(maintenant) {
  const dt = Math.min((maintenant - dernierDessin) / 1000, 0.25); dernierDessin = maintenant;
  const S = valeurs();
  for (const nom in modes) if (modes[nom].pret) modes[nom].obj.maj(dt, S);      // les deux modes suivent, même le masqué
  if (modes.promenade.pret) modes.promenade.obj.dessiner(S);
  if (arcadeOuverte && modes.arcade.pret) modes.arcade.obj.dessiner(S);
  requestAnimationFrame(dessiner);
}

// ---------------- borne d'arcade ----------------
// Le bouton 🕹️ ouvre la borne à gauche de l'animation (menu des jeux, veille avec les « mondes »). La promenade est toujours là.
async function ouvrirBorne(ouvrir) {
  arcadeOuverte = !!ouvrir; memo.ecrire("borne.ouverte", ouvrir ? "1" : "0");
  $("bBorne").setAttribute("aria-pressed", String(arcadeOuverte)); $("colBorne").hidden = !arcadeOuverte;
  if (borneJeux) borneJeux.activer(arcadeOuverte);
  if (arcadeOuverte && !entrees && borneJeux) entrees = Entrees.creer(document, (a) => { borneJeux.action(a); if (modes.arcade.pret) modes.arcade.obj.animerAction(a); }, { echap: "quitter" });
  if (!arcadeOuverte && entrees) { entrees.arreter(); entrees = null; }
  if (arcadeOuverte) info("Cabinet open: arrows and Enter drive the games (Boost and Brake: bar buttons).");
  else if ($("info").textContent.startsWith("Borne ouverte")) info("");
  ajusterTaille();
  if (arcadeOuverte) await chargerMode("arcade");
}
async function chargerMode(nom) {
  const m = modes[nom];
  if (m.pret || m.charge) return;
  m.charge = true; info("Loading images…");
  try { await m.obj.charger(); m.pret = true; info(arcadeOuverte && nom === "arcade" ? "Cabinet open: arrows and Enter drive the games (Boost and Brake: bar buttons)." : ""); log("Loaded: " + nom + "."); }
  catch (e) { m.charge = false; info("⚠ " + e.message + " (the art folder must sit next to the code folder)"); log("⚠ loading " + nom + " : " + e.message); }
}
function majBascule(v) {
  $("bascule").setAttribute("aria-checked", String(v === "jeu"));
  $("libelleVue").innerHTML = v === "jeu" ? "Large<small>screen</small>" : "Small<small>screen</small>";
}
function remplir(select, items, valeur) {
  select.innerHTML = ""; for (const [id, nom] of items) { const o = document.createElement("option"); o.value = id; o.textContent = nom; select.append(o); }
  select.value = valeur;
}
// ---------------- sons (art/sons) ----------------
const sons = Sons.creer({ base: ART + "sons/", memo, log });
function initSons() {
  const activer = () => sons.activer();                                      // Chrome n'autorise le son qu'après un geste
  document.addEventListener("pointerdown", activer); document.addEventListener("keydown", activer);
  for (const [nom, id] of [["pedalage", "volPedalage"], ["rouelibre", "volRouelibre"], ["oiseaux", "volOiseaux"], ["voiture", "volVoiture"], ["jeux", "volJeux"]]) {
    $(id).value = String(Math.round(sons.volume(nom) * 100));
    $(id).addEventListener("input", (e) => sons.fixerVolume(nom, Number(e.target.value) / 100));
  }
  const majMuet = () => { $("bMuet").textContent = sons.muet() ? "🔇" : "🔊"; $("bMuet").setAttribute("aria-pressed", String(sons.muet())); };
  $("bMuet").addEventListener("click", () => { sons.fixerMuet(!sons.muet()); majMuet(); }); majMuet();
  setInterval(() => { const S = valeurs(); sons.maj(0.1, { cadence: S.cadenceAnim, vitesseKmh: S.vitesseKmh }); }, 100);   // indépendant de l'affichage
}
// Réglages repliables : la barre du haut ne garde que l'essentiel (séance, rapport, frein, boost) ; le reste s'ouvre à la demande.
function initReglages() {
  const maj = (ouvert) => { $("reglages").hidden = !ouvert; $("bReglages").setAttribute("aria-expanded", String(ouvert)); $("bReglages").textContent = ouvert ? "Settings ▴" : "Settings ▾"; ajusterTaille(); };
  maj(memo.lire("reglages", "0") === "1");
  $("bReglages").addEventListener("click", () => { const ouvert = $("reglages").hidden; memo.ecrire("reglages", ouvert ? "1" : "0"); maj(ouvert); });
}
// Zoom du graphique de séance : part de la largeur occupée par la zone zoomée ; curseur + raccourcis 1/3, 1/2, 70 % (réglage à affiner).
function initZoom() {
  const maj = (v, memoriser) => { zoomPart = Math.max(0, Math.min(0.8, v / 100)); $("zoom").value = String(Math.round(zoomPart * 100)); $("zoomVal").textContent = Math.round(zoomPart * 100) + " %"; if (memoriser) memo.ecrire("zoom", String(Math.round(zoomPart * 100))); };
  maj(Number(memo.lire("zoom", "50")), false);
  $("zoom").addEventListener("input", (e) => maj(Number(e.target.value), true));
  document.querySelectorAll("[data-zoom]").forEach((b) => b.addEventListener("click", () => maj(Number(b.dataset.zoom), true)));
}
// Plein écran : toute la page ; l'animation se redimensionne seule (ResizeObserver).
function initPleinEcran() {
  const b = $("bPleinEcran");
  if (!document.documentElement.requestFullscreen) { b.hidden = true; return; }
  const maj = () => { const plein = !!document.fullscreenElement; b.textContent = plein ? "⤡ Exit" : "⤢ Full screen"; b.setAttribute("aria-pressed", String(plein)); };
  b.addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch((e) => log("Full screen denied: " + e.message)); });
  document.addEventListener("fullscreenchange", () => { maj(); ajusterTaille(); }); maj();
}
function initModes() {
  modes.promenade = { obj: ModePromenade.creer($("promenade"), { surOiseaux: () => { if (modeNom === "promenade") sons.jouer("oiseaux"); }, surVoiture: () => { if (modeNom === "promenade") sons.jouer("voiture"); }, surVoiturePause: (p) => sons.pauseVoiture(p) }), pret: false, charge: false };
  initSons(); initReglages(); initZoom(); initPleinEcran();
  modes.arcade = { obj: ModeArcade.creer($("arcade")), pret: false, charge: false };
  surface = memo.lire("surface", "asphalte");
  if (!ModePromenade.SURFACES.some((s) => s[0] === surface)) surface = "asphalte";
  remplir($("surface"), ModePromenade.SURFACES, surface);
  $("surface").addEventListener("change", (e) => { surface = e.target.value; memo.ecrire("surface", surface); });
  cyclistes = memo.lire("cyclistes", "garcon"); if (!ModePromenade.CYCLISTES_LISTE.some((c) => c[0] === cyclistes)) cyclistes = "garcon";
  remplir($("cyclistes"), ModePromenade.CYCLISTES_LISTE, cyclistes);
  $("cyclistes").addEventListener("change", (e) => { cyclistes = e.target.value; memo.ecrire("cyclistes", cyclistes); });
  voiture = memo.lire("voiture", "rare"); if (!ModePromenade.FREQUENCES_LISTE.some((c) => c[0] === voiture)) voiture = "rare";
  remplir($("voiture"), ModePromenade.FREQUENCES_LISTE, voiture);
  $("voiture").addEventListener("change", (e) => { voiture = e.target.value; memo.ecrire("voiture", voiture); });
  $("bVoiture").addEventListener("click", () => { if (modes.promenade.pret) modes.promenade.obj.lancerVoiture(); });
  const c0 = Number(memo.lire("defilement", "0"));
  coefDefil = [0, 20, 40, 60, 80, 100].includes(c0) ? c0 : 0; $("defilement").value = String(coefDefil);
  $("defilement").addEventListener("change", (e) => { coefDefil = Number(e.target.value); memo.ecrire("defilement", e.target.value); log("Scenery scrolling: " + (coefDefil ? "+" + coefDefil + " %" : "base") + "."); });
  const a = modes.arcade.obj;
  remplir($("borne"), a.bornes().map((b) => [b.id, b.nom]), a.borneId());
  remplir($("monde"), a.mondes().map((x) => [x.id, x.nom]), a.mondeId());
  const b0 = memo.lire("borne", a.borneId()), m0 = memo.lire("monde", a.mondeId());
  if (a.bornes().some((b) => b.id === b0)) { a.choisirBorne(b0); $("borne").value = b0; }
  if (a.mondes().some((m) => m.id === m0)) { a.choisirMonde(m0); $("monde").value = m0; }
  $("borne").addEventListener("change", (e) => { a.choisirBorne(e.target.value); memo.ecrire("borne", e.target.value); });
  const v0 = memo.lire("vue", "menu") === "jeu" ? "jeu" : "menu";
  a.choisirVue(v0); majBascule(v0);
  $("bascule").addEventListener("click", () => { const v = a.vue() === "jeu" ? "menu" : "jeu"; a.choisirVue(v); majBascule(v); memo.ecrire("vue", v); });
  $("monde").addEventListener("change", (e) => { a.choisirMonde(e.target.value); memo.ecrire("monde", e.target.value); });
  const cm0 = memo.lire("commandes", "sprites");
  $("commandes").value = ["sprites-halos", "sprites", "halos"].includes(cm0) ? cm0 : "sprites"; a.reglerCommandes($("commandes").value);
  $("commandes").addEventListener("change", (e) => { a.reglerCommandes(e.target.value); memo.ecrire("commandes", e.target.value); log("Cabinet controls: " + e.target.selectedOptions[0].textContent + "."); });
  // Menu des jeux sur l'écran de la borne ; les commandes (souris ou doigt sur la borne Années 90 et la console portable) lui envoient des actions :
  // jaune « − » = b, orange « + » = a, joystick = haut / bas / gauche / droite. Les autres bornes restent décoratives.
  borneJeux = BorneJeux.creer(a.zoneJeux(), { langue: "en", son: (n) => sons.effet(n), inactiviteMs: Number(memo.lire("borne.veille", "45")) * 1000, diapoMs: Number(memo.lire("borne.diapo", "9")) * 1000, suivant: () => { const l = a.mondes(), i = l.findIndex((m) => m.id === a.mondeId()); a.choisirMonde(l[(i + 1) % l.length].id); $("monde").value = a.mondeId(); },
    surVeille: (v) => a.afficherJeux(!v), surVue: (v) => { a.choisirVue(v); majBascule(v); memo.ecrire("vue", v); } });
  const jeu = (act) => borneJeux.action(act);
  a.actions.moins = () => jeu("b"); a.actions.plus = () => jeu("a"); a.actions.boost = () => jeu("haut"); a.actions.frein = (v) => { if (v) jeu("bas"); };
  a.actions.gauche = () => jeu("gauche"); a.actions.droite = () => jeu("droite"); a.actions.jeu = jeu;
  $("bRetourJeux").addEventListener("click", () => borneJeux.quitter());
  // pastilles : changer l'apparence de la borne
  const zonePastilles = $("pastilles"), majPastilles = () => zonePastilles.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.borne === a.borneId())));
  for (const p of a.pastilles()) {
    const b = document.createElement("button"); b.className = "pastille"; b.dataset.borne = p.id; b.style.background = p.couleur; b.title = p.nom; b.setAttribute("aria-label", p.nom);
    b.addEventListener("click", () => { a.choisirBorne(p.id); $("borne").value = p.id; memo.ecrire("borne", p.id); });
    zonePastilles.append(b);
  }
  a.surChangement(() => majPastilles()); majPastilles();
  $("bBorne").addEventListener("click", () => ouvrirBorne(!arcadeOuverte));
}

// ---------------- taille du graphisme ----------------
// Le graphisme prend toute la hauteur laissée par les commandes : on mesure ce qui est au-dessus (barres d'outils, textes)
// et on le donne au CSS (--haut), à chaque changement de taille ou de contenu de ces zones.
function ajusterTaille() {
  const stage = document.querySelector(".stage"), haut = Math.ceil(stage.getBoundingClientRect().top + window.scrollY + 10);
  if (haut > 0 && haut !== Number(document.documentElement.dataset.haut)) { document.documentElement.dataset.haut = haut; document.documentElement.style.setProperty("--haut", haut + "px"); }
  // Borne ouverte : l'animation (principale) et la borne ont la même hauteur h ; la borne (2:3) est plus basse du bandeau de ses boutons.
  const anim = $("colAnim"), BANDEAU = 46, GAP = 14, RATIO = 1200 / 1022;
  document.body.classList.toggle("borne-ouverte", !!arcadeOuverte);
  if (arcadeOuverte) {
    const W = stage.clientWidth, Hmax = Math.max(300, window.innerHeight - haut);
    const Wmin = 1400;                                          // hauteur maximale tant que la page ne dépasse pas la fenêtre de trop : en dessous de Wmin, on réduit
    const h = Math.max(300, Math.min(Hmax, (Math.max(W, Wmin) - GAP + BANDEAU * 2 / 3) / (RATIO + 2 / 3)));
    anim.style.flex = "none"; anim.style.maxWidth = "none"; anim.style.width = Math.floor(h * RATIO) + "px";
    $("colBorne").style.setProperty("--hm", Math.floor(h - BANDEAU) + "px");
  } else { anim.style.flex = ""; anim.style.maxWidth = ""; anim.style.width = ""; $("colBorne").style.removeProperty("--hm"); }
}
window.addEventListener("resize", ajusterTaille);
if (window.ResizeObserver) { const ro = new ResizeObserver(ajusterTaille); for (const e of document.querySelectorAll("header, .barre, #info, #texteSortie")) ro.observe(e); }
// ---------------- démarrage ----------------
$("ftp").value = memo.lire("ftp", "250");
$("fcmax").value = memo.lire("fcmax", "190");
$("fcmax").addEventListener("change", () => memo.ecrire("fcmax", $("fcmax").value));
remplirSeances(""); initModes();
const idSeance = memo.lire("seance", "");
if (idSeance && defs[idSeance]) { $("seance").value = idSeance; chargerDef(defs[idSeance]); }
majBoutonsBle(); majBoutonClick(); majAppareils(); majTextes(); initDossier(); ajusterTaille();
chargerMode("promenade"); ouvrirBorne(memo.lire("borne.ouverte", "0") === "1");
requestAnimationFrame(dessiner);

// Le tick est cadencé par un Worker : les minuteurs d'un onglet masqué ou recouvert sont ralentis par
// le navigateur, ceux d'un Worker non. Si le Worker est impossible, repli sur setInterval.
let cadence = null;
try {
  const w = new Worker(URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),200)"], { type: "text/javascript" })));
  w.onmessage = tick; w.onerror = () => { log("⚠ Worker unavailable: falling back to setInterval."); w.terminate(); cadence = setInterval(tick, 200); };
  cadence = w;
} catch (e) { log("Worker unavailable (" + e.message + "): falling back to setInterval."); cadence = setInterval(tick, 200); }
log("Page ready.");
setTimeout(reconnexionAuto, 600);

window.MR = { borne: ouvrirBorne, borneJeux: () => borneJeux, memoire, reconnexionAuto, defilement: () => coefDefil, ajustErg: () => ajustErg, lancerBoost, tenirFrein, sortie: () => sortie, click: Click, rapport: () => rapport, changerRapport, fixerRapport, touches, etat, entree, lecteur, sim, valeurs, tick, chargerDef, defs: () => defs, mode: () => modeNom, sons, promenade: () => modes.promenade.obj };
})();
