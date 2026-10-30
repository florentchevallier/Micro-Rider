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
let sortie = Sortie.creer(), derniereSecondeEnr = -1, confirmeNouvelle = null;
let rapport = Noyau.RAPPORTS.defaut;                         // rapport virtuel, 1 à 24
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
  if (lecteur.etat === "prete" || lecteur.etat === "finie") {
    historique = []; derniereSeconde = -1; lecteur.demarrer(); log("Séance démarrée.");
    fixerRapport(Noyau.RAPPORTS.defaut, "début de séance");
  }
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
// Zwift Click : ses deux boutons changent de rapport (voir plus bas).
Click.crochets.log = log; Click.crochets.info = info; Click.crochets.change = majBoutonClick;
function majBoutonClick() {
  const K = Click.CK, b = $("bClick");
  b.className = "conn" + (K.connecte ? " ok" : K.connexion ? " att" : "");
  b.querySelector(".txt").textContent = K.connecte ? ((K.device && K.device.name) || "Zwift Click") + "  ✕" : K.connexion ? "Connexion…" : "Connecter le Click";
  b.title = K.connecte ? "Boutons : 1 = rapport plus dur, 2 = plus facile" + (K.batterie !== null ? " · batterie " + K.batterie + " %" : "") + " · cliquer pour déconnecter" : "Zwift Click : change de rapport virtuel";
}
$("bClick").addEventListener("click", () => { if (Click.CK.connexion && !Click.CK.connecte) return; if (Click.CK.connecte) Click.deconnecter(); else Click.connecter(); });
if (!BLE.disponible()) {
  $("bTrainer").disabled = true; $("bFc").disabled = true; $("bClick").disabled = true;
  info("Web Bluetooth n'est pas disponible dans ce navigateur : utilise Chrome (ou Edge). Les curseurs de simulation restent utilisables.");
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
const NOMS_TOUCHES = { ArrowUp: "↑ Haut", ArrowDown: "↓ Bas", ArrowLeft: "← Gauche", ArrowRight: "→ Droite", PageUp: "Page ↑", PageDown: "Page ↓" };
const nomTouche = (k) => NOMS_TOUCHES[k] || (k.length === 1 ? k.toUpperCase() : k);
const touches = { plus: memo.lire("touchePlus", "ArrowUp"), moins: memo.lire("toucheMoins", "ArrowDown") };
const minuscule = (k) => (k.length === 1 ? k.toLowerCase() : k);
const minuteurs = {};
function flash(id) {
  const b = $(id); b.classList.add("flash"); clearTimeout(minuteurs[id]);
  minuteurs[id] = setTimeout(() => b.classList.remove("flash"), 180);
}
function majRapport() {
  const html = rapport + "<small>/" + Noyau.RAPPORTS.max + "</small>";
  if ($("rapport").innerHTML !== html) $("rapport").innerHTML = html;
  const p = Noyau.penteDuRapport(rapport);
  $("rapport").title = "Pente simulée : " + (p > 0 ? "+" : "") + String(p).replace(".", ",") + " %";
  $("bPlus").disabled = false; $("bMoins").disabled = false;           // restent actifs aux limites pour le retour visuel
}
function fixerRapport(g, source) {
  const n = Math.min(Noyau.RAPPORTS.max, Math.max(Noyau.RAPPORTS.min, g));
  if (n === rapport) return false;
  rapport = n; majRapport();
  const p = Noyau.penteDuRapport(n);
  log("Rapport " + n + "/" + Noyau.RAPPORTS.max + " (pente simulée " + (p > 0 ? "+" : "") + String(p).replace(".", ",") + " %), " + source + ".");
  return true;
}
function changerRapport(delta, source) {
  flash(delta > 0 ? "bPlus" : "bMoins");
  return fixerRapport(rapport + delta, source);
}
$("bPlus").addEventListener("click", () => changerRapport(+1, "bouton"));
$("bMoins").addEventListener("click", () => changerRapport(-1, "bouton"));

let capture = null;                                             // "plus" ou "moins" pendant le choix d'une touche
function majTouches() {
  $("kPlus").textContent = nomTouche(touches.plus); $("kMoins").textContent = nomTouche(touches.moins);
  $("bPlus").title = "Plus dur (touche : " + nomTouche(touches.plus) + ")"; $("bMoins").title = "Plus facile (touche : " + nomTouche(touches.moins) + ")";
  $("cPlus").textContent = capture === "plus" ? "Appuie sur une touche…" : "Changer…";
  $("cMoins").textContent = capture === "moins" ? "Appuie sur une touche…" : "Changer…";
}
$("cPlus").addEventListener("click", () => { capture = capture === "plus" ? null : "plus"; majTouches(); });
$("cMoins").addEventListener("click", () => { capture = capture === "moins" ? null : "moins"; majTouches(); });
document.addEventListener("keydown", (e) => {
  if (capture) {
    if (["Shift", "Control", "Alt", "Meta", "CapsLock", "AltGraph"].includes(e.key)) return;     // on attend la vraie touche
    e.preventDefault(); e.stopPropagation();
    const autre = capture === "plus" ? touches.moins : touches.plus;
    if (e.key === "Escape") { capture = null; majTouches(); return; }
    if (["Tab", "Enter", " "].includes(e.key)) { info("Cette touche sert déjà à naviguer dans la page : choisis-en une autre."); return; }
    if (minuscule(e.key) === minuscule(autre)) { info("Cette touche est déjà prise par l'autre réglage."); return; }
    touches[capture] = e.key; memo.ecrire(capture === "plus" ? "touchePlus" : "toucheMoins", e.key);
    log("Touche « rapport " + (capture === "plus" ? "plus dur" : "plus facile") + " » : " + nomTouche(e.key) + ".");
    capture = null; info(""); majTouches(); return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;      // ne pas voler les flèches d'un champ
  const k = minuscule(e.key);
  const sens = k === minuscule(touches.plus) ? 1 : k === minuscule(touches.moins) ? -1 : 0;
  if (!sens) return;
  e.preventDefault();
  if (!e.repeat) changerRapport(sens, "clavier");
}, true);
document.addEventListener("change", (e) => { if (e.target.tagName === "SELECT") e.target.blur(); });   // rendre les flèches au rapport
Click.crochets.plus = () => changerRapport(+1, "Click");
Click.crochets.moins = () => changerRapport(-1, "Click");
majRapport(); majTouches();

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
  const texte = n ? "Sortie : " + mmss(st.secondes) + " · " + (st.distance / 1000).toFixed(1).replace(".", ",") + " km · " + Math.round(st.wMoy) + " W moy." : "Sortie : rien d'enregistré";
  if ($("etatSortie").textContent !== texte) $("etatSortie").textContent = texte;
  $("bTcx").disabled = n < 5; $("bNouvelle").disabled = n === 0;
}
function nomFichierTcx() {
  const d = new Date(sortie.points[0][0]), z = (x) => String(x).padStart(2, "0");
  return "micro-rider-" + d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + "-" + z(d.getHours()) + z(d.getMinutes()) + ".tcx";
}
$("bTcx").addEventListener("click", () => {
  try {
    const url = URL.createObjectURL(new Blob([sortie.tcx()], { type: "application/vnd.garmin.tcx+xml" }));
    const a = document.createElement("a"); a.href = url; a.download = nomFichierTcx(); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    log("Sortie exportée : " + a.download + " (" + sortie.points.length + " mesures).");
  } catch (e) { info("⚠ Export impossible : " + e.message); log("⚠ export .tcx : " + e.message); }
});
$("bNouvelle").addEventListener("click", () => {
  const b = $("bNouvelle");
  if (confirmeNouvelle === null) {                                   // premier clic : demande confirmation, sans fenêtre
    b.textContent = "Effacer ? Confirmer"; confirmeNouvelle = setTimeout(() => { confirmeNouvelle = null; b.textContent = "Nouvelle sortie"; }, 4000);
    return;
  }
  clearTimeout(confirmeNouvelle); confirmeNouvelle = null; b.textContent = "Nouvelle sortie";
  sortie.vider(); sauverSortie(); log("Sortie effacée."); majSortie();
});
window.addEventListener("pagehide", sauverSortie);
const sortieSauvee = Sortie.restaurer(memo.lire(CLE_SORTIE, ""));
if (sortieSauvee && sortieSauvee.points.length) {
  sortie = sortieSauvee; log("Sortie précédente récupérée : " + sortie.points.length + " mesures (« Télécharger .tcx » ou « Nouvelle sortie »).");
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
  Noyau.avancer(etat, entree.puissance, cons.mode === "libre" ? cons.pente : 0, dt, pedale);
  lecteur.avancer(dt);
  if (lecteur.etat === "en cours") {                              // trace de la puissance réelle, une fois par seconde
    const s = Math.floor(lecteur.t);
    if (s !== derniereSeconde) { derniereSeconde = s; historique.push({ t: lecteur.t, w: entree.puissance }); }
  }
  const consigne = lecteur.consigne(pente);
  BLE.majConsigne(consigne, maintenant);
  const sansEffet = consigneErg = consigne.mode === "erg";
  if ($("groupeRapport").classList.contains("sans-effet") !== sansEffet) {
    $("groupeRapport").classList.toggle("sans-effet", sansEffet);
    $("groupeRapport").title = sansEffet ? "Sans effet pendant un palier ERG : la séance impose la puissance" : "";
  }
  majTextes();
}

// ---------------- affichage ----------------
// Le calcul ne tourne que 5 fois par seconde : entre deux ticks, on prolonge la distance avec la vitesse
// pour que le décor avance à chaque image (sinon il avance par à-coups). Jamais de retour en arrière.
let dAff = 0;
function distanceAffichee(maintenant) {
  const d = etat.d + etat.v * Math.min(0.5, Math.max(0, (maintenant - dernierTick) / 1000));
  if (d > dAff) dAff = d;
  return dAff;
}
function valeurs() {
  const tc = (lecteur.etat === "en cours" || lecteur.etat === "pause") && lecteur.seance ? Noyau.cibleA(lecteur.seance, lecteur.t) : null;
  return { puissance: entree.puissance, cadence: entree.cadence, fc: entree.fc, vitesseKmh: etat.v * 3.6, distance: distanceAffichee(performance.now()),
           surface, lecteur, historique, cible: tc && !tc.libre ? Math.round(tc.w) : null,
           rapport, rapportActif: !consigneErg };
}
function majTextes() {
  const l = lecteur, b = $("bDemarrer");
  const libelle = { aucune: "Démarrer", prete: "Démarrer", "en cours": "Pause", pause: "Reprendre", finie: "Recommencer" }[l.etat];
  const ecrire = (el, t) => { if (el.textContent !== t) el.textContent = t; };       // on n'écrit dans la page que si le texte change
  ecrire(b, libelle); b.disabled = l.etat === "aucune";
  $("bArreter").disabled = !(l.etat === "en cours" || l.etat === "pause");
  $("ftp").disabled = l.etat === "en cours" || l.etat === "pause";
  ecrire($("etatSeance"), l.seance ? ({ prete: "prête", "en cours": "en cours", pause: "en pause", finie: "terminée" }[l.etat]) + " · " + mmss(l.t) + " / " + mmss(l.seance.duree) : "pas de séance");
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
function majBascule(v) {
  $("bascule").setAttribute("aria-checked", String(v === "jeu"));
  $("libelleVue").innerHTML = v === "jeu" ? "Mode jeu<small>Grand écran : pour regarder une vidéo</small>" : "Vue entière<small>Borne complète : choix et menus</small>";
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
  const v0 = memo.lire("vue", "menu") === "jeu" ? "jeu" : "menu";
  a.choisirVue(v0); majBascule(v0);
  $("bascule").addEventListener("click", () => { const v = a.vue() === "jeu" ? "menu" : "jeu"; a.choisirVue(v); majBascule(v); memo.ecrire("vue", v); });
  $("monde").addEventListener("change", (e) => { a.choisirMonde(e.target.value); memo.ecrire("monde", e.target.value); });
  document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => activerMode(b.dataset.mode)));
}

// ---------------- démarrage ----------------
$("ftp").value = memo.lire("ftp", "250");
remplirSeances(""); initModes();
const idSeance = memo.lire("seance", "");
if (idSeance && defs[idSeance]) { $("seance").value = idSeance; chargerDef(defs[idSeance]); }
majBoutonsBle(); majBoutonClick(); majTextes();
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

window.MR = { sortie: () => sortie, click: Click, rapport: () => rapport, changerRapport, fixerRapport, touches, etat, entree, lecteur, sim, valeurs, tick, chargerDef, defs: () => defs, mode: () => modeNom };
})();
