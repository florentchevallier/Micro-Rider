"use strict";
/* =====================================================================
   Séances d'entraînement : séances intégrées et lecture de fichiers.
   Formats lus : JSON (voir noyau.js) et .zwo (Zwift). Le .fit viendra plus tard.
   ===================================================================== */
(function (scope) {

const SEANCES = [
  { id: "essai", nom: "Essai ERG (3 min 30)", ftp: 250,
    etapes: [{ s: 60, w: 100 }, { s: 60, w: 150 }, { s: 60, w0: 150, w1: 200 }, { s: 30, w: 100 }] },
  { id: "demo", nom: "Séance de démonstration (38 min)", ftp: 250,
    etapes: (() => {
      // Les paliers du prototype de la promenade (en minutes et % de la FTP de 250 W).
      const b = [[5, 44], [3, 64], [3, 84], [2, 100], [2, 116], [1, 138], [4, 46], [2, 100], [2, 116], [1, 138], [4, 46], [2, 100], [2, 116], [1, 138], [4, 42]];
      return b.map(([min, pct]) => ({ s: min * 60, pct }));
    })() }
];

// Lecture d'un fichier .zwo (XML). Les puissances y sont des fractions de la FTP.
// Un élément inconnu provoque une erreur plutôt que d'être ignoré en silence :
// une séance dont il manque un morceau serait trompeuse.
function lireZwo(texte) {
  const doc = new DOMParser().parseFromString(texte, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("fichier .zwo illisible (XML invalide)");
  const w = doc.querySelector("workout");
  if (!w) throw new Error("pas d'élément <workout> dans ce fichier");
  const num = (el, a) => { const v = el.getAttribute(a); if (v === null) throw new Error("attribut " + a + " manquant dans <" + el.tagName + ">"); return Number(v); };
  const etapes = [];
  for (const el of Array.from(w.children)) {
    switch (el.tagName) {
      case "Warmup": case "Cooldown": case "Ramp":
        etapes.push({ s: num(el, "Duration"), pct0: num(el, "PowerLow") * 100, pct1: num(el, "PowerHigh") * 100 }); break;
      case "SteadyState":
        etapes.push({ s: num(el, "Duration"), pct: num(el, "Power") * 100 }); break;
      case "FreeRide":
        etapes.push({ s: num(el, "Duration"), libre: true }); break;
      case "IntervalsT": {
        const n = num(el, "Repeat");
        for (let i = 0; i < n; i++) {
          etapes.push({ s: num(el, "OnDuration"), pct: num(el, "OnPower") * 100 });
          etapes.push({ s: num(el, "OffDuration"), pct: num(el, "OffPower") * 100 });
        }
        break;
      }
      default: throw new Error("élément <" + el.tagName + "> non géré dans ce fichier .zwo");
    }
  }
  const nom = doc.querySelector("name");
  return { nom: (nom && nom.textContent.trim()) || "Séance Zwift", ftp: 250, etapes };
}

// Lecture d'un fichier choisi par l'utilisateur (nom + contenu texte).
function lireFichier(nom, texte) {
  if (/\.zwo$/i.test(nom)) return lireZwo(texte);
  if (/\.json$/i.test(nom)) { let d; try { d = JSON.parse(texte); } catch (e) { throw new Error("JSON invalide : " + e.message); } return d; }
  if (/\.fit$/i.test(nom)) throw new Error("le format .fit n'est pas encore géré : utilise un .zwo ou un .json");
  throw new Error("format non reconnu (attendu : .zwo ou .json)");
}

scope.Seances = { SEANCES, lireZwo, lireFichier };
if (typeof module !== "undefined") module.exports = scope.Seances;
})(typeof window === "undefined" ? globalThis : window);
