"use strict";
/* =====================================================================
   DOSSIER : un dossier de séances (.zwo, .mrc, .erg, .json) choisi une fois, mémorisé par le navigateur.
   Utilise l'API « File System Access » (Chrome, Edge) : la poignée du dossier est gardée dans IndexedDB.
   Chrome redemande l'autorisation de lecture à chaque nouvelle session : un clic suffit (requestPermission).
   Rien n'est copié ni envoyé : les fichiers sont lus à la demande, quand on choisit la séance.
   ===================================================================== */
(function (scope) {

const EXT = /\.(zwo|mrc|erg|json)$/i;
const BASE = "micro-rider-dossier", MAGASIN = "poignees", CLE = "seances";
let enMemoire = null;                                          // repli quand IndexedDB refuse la poignée (ou n'existe pas)

const disponible = () => typeof scope.showDirectoryPicker === "function";

function ouvrirBase() {
  return new Promise((ok, no) => {
    if (!scope.indexedDB) return no(new Error("no IndexedDB"));
    const r = scope.indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(MAGASIN);
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
  });
}
async function ecrireBase(valeur) {
  const db = await ouvrirBase();
  return new Promise((ok, no) => {
    const tx = db.transaction(MAGASIN, "readwrite"); const q = valeur ? tx.objectStore(MAGASIN).put(valeur, CLE) : tx.objectStore(MAGASIN).delete(CLE);
    tx.oncomplete = () => { db.close(); ok(); }; tx.onerror = tx.onabort = () => { db.close(); no(tx.error); };
  });
}
async function lireBase() {
  const db = await ouvrirBase();
  return new Promise((ok, no) => {
    const q = db.transaction(MAGASIN, "readonly").objectStore(MAGASIN).get(CLE);
    q.onsuccess = () => { db.close(); ok(q.result || null); }; q.onerror = () => { db.close(); no(q.error); };
  });
}

async function choisir() {
  const h = await scope.showDirectoryPicker({ id: "micro-rider-seances", mode: "read" });
  enMemoire = h;
  try { await ecrireBase(h); } catch (e) { /* mémorisation impossible : le dossier reste utilisable jusqu'au rechargement */ }
  return h;
}
async function restaurer() {
  if (enMemoire) return enMemoire;
  try { return (enMemoire = await lireBase()); } catch (e) { return null; }
}
async function oublier() { enMemoire = null; try { await ecrireBase(null); } catch (e) { /* rien à faire */ } }

// État de l'autorisation : "granted" (lisible), "prompt" (un clic doit la redonner) ou "denied".
async function permission(h, demander) {
  if (!h) return "denied";
  try {
    const o = { mode: "read" };
    if (h.queryPermission) { const p = await h.queryPermission(o); if (p === "granted" || !demander) return p; }
    if (demander && h.requestPermission) return await h.requestPermission(o);
    return h.queryPermission ? "prompt" : "granted";
  } catch (e) { return "denied"; }
}

// Tous les fichiers de séance, sous-dossiers compris : [{ chemin: "Sufferfest/The Hunted.zwo", nom: "Sufferfest / The Hunted", handle }]
async function lister(h, profondeurMax) {
  const max = profondeurMax == null ? 6 : profondeurMax, sorties = [];
  async function visiter(dir, prefixe, niveau) {
    for await (const [nom, e] of dir.entries()) {
      if (nom.startsWith(".")) continue;
      if (e.kind === "directory") { if (niveau < max) await visiter(e, prefixe + nom + "/", niveau + 1); }
      else if (EXT.test(nom)) sorties.push({ chemin: prefixe + nom, nom: (prefixe + nom).replace(EXT, "").split("/").join(" / "), handle: e });
    }
  }
  await visiter(h, "", 0);
  sorties.sort((a, b) => a.nom.localeCompare(b.nom, "fr", { numeric: true, sensitivity: "base" }));
  return sorties;
}

scope.Dossier = { disponible, choisir, restaurer, oublier, permission, lister };
if (typeof module !== "undefined") module.exports = scope.Dossier;
})(typeof window === "undefined" ? globalThis : window);
