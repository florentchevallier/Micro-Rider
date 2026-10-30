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
let modeNom = "promenade", surface = "asphalte";
const modes = {};

// ---------------- journal et messages ----------------
const lignes = [];
function log(msg) {
  const t = new Date();
  lignes.push(t.toLocaleTimeString("fr-FR") + "." + String(t.getMilliseconds()).padStart(3, "0") + "  " + msg);
  if (lignes.length > 600) lignes.shift();
  const j = $("journal"); j.textContent = lignes.join("\n"); j.scrollTop = j.scrollHeight;
}
const info = (t) => { $("info").textContent = t || ""; };
$("bCopier").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(lignes.join("\n")); log("Journal copié dans le presse-papiers."); }
  catch (e) { log("Copie automatique impossible : sélectionne le texte du journal à la main."); }
});

// ---------------- séances ----------------
function ftp() { const v = Number($("ftp").value); return v > 0 ? v : 250; }
function chargerDef(def) {
  try {
    const s = Noyau.construireSeance(def, ftp());
    defCourante = def; lecteur.charger(s); historique = []; pauseAuto = false;
    log("Séance chargée : " + s.nom + " (" + mmss(s.duree) + ", FTP " + s.ftp + " W).");
    info("");
  } catch (e) { info("⚠ Séance refusée : " + e.message); log("⚠ séance refusée : " + e.message); }
  majTextes();
}
function remplirSeances(selection) {
  const sel = $("seance"); sel.innerHTML = '<option value="">Aucune séance (libre)</option>';
  for (const id in defs) { const o = document.createElement("option"); o.value = id; o.textContent = defs[id].nom; sel.append(o); }
  sel.value = selection || "";
}
for (const s of Seances.SEANCES) defs[s.id] = s;
$("seance").addEventListener("change", (e) => {
  const id = e.target.value; memo.ecrire("seance", id);
  if (id) chargerDef(defs[id]); else { defCourante = null; lecteur.charger(null); historique = []; majTextes(); }
});
$("ftp").addEventListener("change", () => { memo.ecrire("ftp", $("ftp").value); if (defCourante && lecteur.etat !== "en cours" && lecteur.etat !== "pause") chargerDef(defCourante); });
$("fichier").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const def = Seances.lireFichier(f.name, await f.text());
    const id = "fichier:" + f.name; defs[id] = Object.assign({}, def, { nom: def.nom || f.name });
    remplirSeances(id); chargerDef(defs[id]);
  } catch (err) { info("⚠ " + f.name + " : " + err.message); log("⚠ fichier " + f.name + " : " + err.message); }
});
$("bDemarrer").addEventListener("click", () => {
  if (lecteur.etat === "prete" || lecteur.etat === "finie") { historique = []; derniereSeconde = -1; lecteur.demarrer(); log("Séance démarrée."); }
  else if (lecteur.etat === "en cours") { lecteur.pause(); pauseAuto = false; log("Séance en pause."); }
  else if (lecteur.etat === "pause") { lecteur.reprendre(); pauseAuto = false; log("Séance reprise."); }
  majTextes();
});
$("bArreter").addEventListener("click", () => { lecteur.arreter(); historique = []; pauseAuto = false; log("Séance arrêtée."); majTextes(); });

// ---------------- Bluetooth ----------------
BLE.crochets.log = log; BLE.crochets.info = info;
BLE.crochets.change = majBoutonsBle;
BLE.crochets.trainerPerdu = () => {
  if (lecteur.etat === "en cours") { lecteur.pause(); pauseAuto = true; info("Trainer déconnecté : séance en pause."); }
  majSources();
};
BLE.crochets.trainerConnecte = () => {
  if (pauseAuto && lecteur.etat === "pause") { lecteur.reprendre(); pauseAuto = false; log("Séance reprise après reconnexion."); }
  majSources();
};
function majBoutonsBle() {
  for (const [id, S, nom, libre, titre] of [
    ["bTrainer", BLE.TR, "Trainer", "Connecter le trainer", "Zwift Hub ou autre trainer FTMS"],
    ["bFc", BLE.FC, "Cardio", "Connecter le cardio", "Capteur cardio Bluetooth (HW9, montre en diffusion…)"]
  ]) {
    const b = $(id);
    b.className = "conn" + (S.connecte ? " ok" : S.connexion ? " att" : "");
    b.querySelector(".txt").textContent = S.connecte ? ((S.device && S.device.name) || nom) + "  ✕" : S.connexion ? "Connexion…" : libre;
    b.title = S.connecte ? "Cliquer pour déconnecter" : titre;
  }
  majSources();
}
function majSources() {
  const tr = BLE.TR.connecte, fc = BLE.FC.connecte;
  $("sP").disabled = tr; $("sC").disabled = tr; $("sF").disabled = fc; $("suivre").disabled = tr;
  if (tr) $("sim").open = false;
}
$("bTrainer").addEventListener("click", () => { if (BLE.TR.connexion) return; if (BLE.TR.connecte) BLE.deconnecterTrainer(); else BLE.connecterTrainer(); });
$("bFc").addEventListener("click", () => { if (BLE.FC.connexion) return; if (BLE.FC.connecte) BLE.deconnecterFc(); else BLE.connecterFc(); });
if (!BLE.disponible()) {
  $("bTrainer").disabled = true; $("bFc").disabled = true;
  info("Web Bluetooth n'est pas disponible dans ce navigateur : utilise Chrome (ou Edge). Les curseurs de simulation restent utilisables.");
}

// ---------------- simulation (sans matériel) ----------------
for (const [id, cle, sortie] of [["sP", "puissance", "oP"], ["sC", "cadence", "oC"], ["sF", "fc", "oF"]]) {
  const el = $(id), out = $(sortie);
  const lire = () => { sim[cle] = Number(el.value); out.textContent = el.value; };
  el.addEventListener("input", lire); lire();
}
$("suivre").addEventListener("change", (e) => { sim.suivreCible = e.target.checked; });

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

  Noyau.avancer(etat, entree.puissance, 0, dt);
  lecteur.avancer(dt);
  if (lecteur.etat === "en cours") {                              // trace de la puissance réelle, une fois par seconde
    const s = Math.floor(lecteur.t);
    if (s !== derniereSeconde) { derniereSeconde = s; historique.push({ t: lecteur.t, w: entree.puissance }); }
  }
  BLE.majConsigne(lecteur.consigne(0), maintenant);
  majTextes();
}

// ---------------- affichage ----------------
function valeurs() {
  const tc = (lecteur.etat === "en cours" || lecteur.etat === "pause") && lecteur.seance ? Noyau.cibleA(lecteur.seance, lecteur.t) : null;
  return { puissance: entree.puissance, cadence: entree.cadence, fc: entree.fc, vitesseKmh: etat.v * 3.6, distance: etat.d,
           surface, lecteur, historique, cible: tc && !tc.libre ? Math.round(tc.w) : null };
}
function majTextes() {
  const l = lecteur, b = $("bDemarrer");
  const libelle = { aucune: "Démarrer", prete: "Démarrer", "en cours": "Pause", pause: "Reprendre", finie: "Recommencer" }[l.etat];
  b.textContent = libelle; b.disabled = l.etat === "aucune";
  $("bArreter").disabled = !(l.etat === "en cours" || l.etat === "pause");
  $("ftp").disabled = l.etat === "en cours" || l.etat === "pause";
  $("etatSeance").textContent = l.seance ? ({ prete: "prête", "en cours": "en cours", pause: "en pause", finie: "terminée" }[l.etat]) + " · " + mmss(l.t) + " / " + mmss(l.seance.duree) : "pas de séance";
}
let dernierDessin = performance.now();
function dessiner(maintenant) {
  const dt = Math.min((maintenant - dernierDessin) / 1000, 0.25); dernierDessin = maintenant;
  const S = valeurs();
  for (const nom in modes) if (modes[nom].pret) modes[nom].obj.maj(dt, S);      // les deux modes suivent, même le masqué
  if (modes[modeNom].pret) modes[modeNom].obj.dessiner(S);
  requestAnimationFrame(dessiner);
}

// ---------------- modes ----------------
async function activerMode(nom) {
  modeNom = nom; memo.ecrire("mode", nom);
  document.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === nom)));
  $("promenade").hidden = nom !== "promenade"; $("arcade").hidden = nom !== "arcade";
  $("optPromenade").hidden = nom !== "promenade"; $("optArcade").hidden = nom !== "arcade";
  const m = modes[nom];
  if (m.pret || m.charge) return;
  m.charge = true; info("Chargement des images…");
  try { await m.obj.charger(); m.pret = true; info(""); log("Mode " + nom + " chargé."); }
  catch (e) { m.charge = false; info("⚠ " + e.message + " (le dossier art doit être voisin du dossier code)"); log("⚠ chargement du mode " + nom + " : " + e.message); }
}
function remplir(select, items, valeur) {
  select.innerHTML = ""; for (const [id, nom] of items) { const o = document.createElement("option"); o.value = id; o.textContent = nom; select.append(o); }
  select.value = valeur;
}
function initModes() {
  modes.promenade = { obj: ModePromenade.creer($("promenade")), pret: false, charge: false };
  modes.arcade = { obj: ModeArcade.creer($("arcade")), pret: false, charge: false };
  surface = memo.lire("surface", "asphalte");
  if (!ModePromenade.SURFACES.some((s) => s[0] === surface)) surface = "asphalte";
  remplir($("surface"), ModePromenade.SURFACES, surface);
  $("surface").addEventListener("change", (e) => { surface = e.target.value; memo.ecrire("surface", surface); });
  const a = modes.arcade.obj;
  remplir($("borne"), a.bornes().map((b) => [b.id, b.nom]), a.borneId());
  remplir($("monde"), a.mondes().map((x) => [x.id, x.nom]), a.mondeId());
  const b0 = memo.lire("borne", a.borneId()), m0 = memo.lire("monde", a.mondeId());
  if (a.bornes().some((b) => b.id === b0)) { a.choisirBorne(b0); $("borne").value = b0; }
  if (a.mondes().some((m) => m.id === m0)) { a.choisirMonde(m0); $("monde").value = m0; }
  $("borne").addEventListener("change", (e) => { a.choisirBorne(e.target.value); memo.ecrire("borne", e.target.value); });
  $("monde").addEventListener("change", (e) => { a.choisirMonde(e.target.value); memo.ecrire("monde", e.target.value); });
  document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => activerMode(b.dataset.mode)));
}

// ---------------- démarrage ----------------
$("ftp").value = memo.lire("ftp", "250");
remplirSeances(""); initModes();
const idSeance = memo.lire("seance", "");
if (idSeance && defs[idSeance]) { $("seance").value = idSeance; chargerDef(defs[idSeance]); }
majBoutonsBle(); majTextes();
activerMode(memo.lire("mode", "promenade") === "arcade" ? "arcade" : "promenade");
requestAnimationFrame(dessiner);

// Le tick est cadencé par un Worker : les minuteurs d'un onglet masqué ou recouvert sont ralentis par
// le navigateur, ceux d'un Worker non. Si le Worker est impossible, repli sur setInterval.
let cadence = null;
try {
  const w = new Worker(URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),200)"], { type: "text/javascript" })));
  w.onmessage = tick; w.onerror = () => { log("⚠ Worker indisponible : repli sur setInterval."); w.terminate(); cadence = setInterval(tick, 200); };
  cadence = w;
} catch (e) { log("Worker indisponible (" + e.message + ") : repli sur setInterval."); cadence = setInterval(tick, 200); }
log("Page prête.");

window.MR = { etat, entree, lecteur, sim, valeurs, tick, chargerDef, defs: () => defs, mode: () => modeNom };
})();
