"use strict";
/* =====================================================================
   Séances d'entraînement : séances intégrées et lecture de fichiers.
   Formats lus : JSON (voir noyau.js), .zwo (Zwift), .mrc et .erg. Le .fit n'est pas prévu (inutile pour les séances en puissance).
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
  const doc = new DOMParser().parseFromString(String(texte).replace(/^\uFEFF/, ""), "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("fichier .zwo illisible (XML invalide)");
  const w = doc.querySelector("workout");
  if (!w) throw new Error("pas d'élément <workout> dans ce fichier");
  const num = (el, a) => { const v = el.getAttribute(a); if (v === null) throw new Error("attribut " + a + " manquant dans <" + el.tagName + ">"); return Number(v); };
  const etapes = [];
  for (const el of Array.from(w.children)) {
    switch (el.tagName) {
      case "Warmup": case "Cooldown": case "Ramp":
        etapes.push({ s: num(el, "Duration"), pct0: num(el, "PowerLow") * 100, pct1: num(el, "PowerHigh") * 100 }); break;
      case "SteadyState": {
        // Certains exports (ex. Sufferfest) écrivent PowerLow/PowerHigh au lieu de Power : égaux = palier, différents = rampe.
        if (el.hasAttribute("Power")) { etapes.push({ s: num(el, "Duration"), pct: num(el, "Power") * 100 }); break; }
        const bas = num(el, "PowerLow") * 100, haut = num(el, "PowerHigh") * 100;
        etapes.push(bas === haut ? { s: num(el, "Duration"), pct: bas } : { s: num(el, "Duration"), pct0: bas, pct1: haut }); break;
      }
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

// Lecture d'un fichier .mrc (puissance en % de la FTP) ou .erg (puissance en watts) : du texte simple.
// Une section [COURSE DATA] de lignes « minutes valeur » : la puissance varie en ligne droite d'un point au suivant
// (deux points au même instant = saut d'un palier à l'autre). La ligne « MINUTES PERCENT » ou « MINUTES WATTS »
// de l'en-tête donne l'unité. Le reste (texte de coaching, [COURSE TEXT]) est ignoré.
function lireMrc(texte, nomFichier) {
  const lignes = String(texte).replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim());
  const enteteFin = lignes.findIndex((l) => /^\[END COURSE HEADER\]/i.test(l)), debut = lignes.findIndex((l) => /^\[COURSE DATA\]/i.test(l));
  if (debut < 0) throw new Error("pas de section [COURSE DATA] : ce n'est pas un fichier .mrc/.erg");
  const entete = lignes.slice(0, debut);
  const unite = entete.map((l) => /^MINUTES\s+(PERCENT|WATTS)\s*$/i.exec(l)).find(Boolean);
  if (!unite) throw new Error("unité introuvable (attendu « MINUTES PERCENT » ou « MINUTES WATTS » dans l'en-tête)");
  const pourcent = unite[1].toUpperCase() === "PERCENT";
  const points = [];
  for (let i = debut + 1; i < lignes.length; i++) {
    const l = lignes[i];
    if (!l) continue;
    if (/^\[/.test(l)) break;                                           // [END COURSE DATA] ou section suivante
    const m = /^(-?[\d.,]+)\s+(-?[\d.,]+)$/.exec(l);
    if (!m) throw new Error("ligne illisible dans [COURSE DATA] : « " + l.slice(0, 40) + " »");
    const t = Number(m[1].replace(",", ".")), v = Number(m[2].replace(",", "."));
    if (!isFinite(t) || !isFinite(v) || v < 0) throw new Error("valeur invalide dans [COURSE DATA] : « " + l + " »");
    if (points.length && t < points[points.length - 1][0]) throw new Error("les minutes doivent croître (« " + l + " »)");
    points.push([t, v]);
  }
  if (points.length < 2) throw new Error("[COURSE DATA] contient moins de deux points");
  const etapes = [];
  for (let i = 1; i < points.length; i++) {
    const [t0, v0] = points[i - 1], [t1, v1] = points[i];
    const s = Math.round((t1 - t0) * 60 * 1000) / 1000;
    if (s <= 0) continue;                                                // saut instantané : pas de durée
    const e = { s };
    if (v0 === v1) e[pourcent ? "pct" : "w"] = v0; else { e[pourcent ? "pct0" : "w0"] = v0; e[pourcent ? "pct1" : "w1"] = v1; }
    etapes.push(e);
  }
  if (!etapes.length) throw new Error("aucune durée dans [COURSE DATA]");
  const nom = entete.map((l) => /^(?:DESCRIPTION|FILE NAME)\s*=\s*(.+)$/i.exec(l)).find((m) => m && m[1].trim());
  return { nom: nom ? nom[1].trim() : String(nomFichier || "Séance").replace(/\.[^.]+$/, ""), ftp: 250, etapes };
}

// Lecture d'un fichier choisi par l'utilisateur (nom + contenu texte).
function lireFichier(nom, texte) {
  if (/\.zwo$/i.test(nom)) return lireZwo(texte);
  if (/\.(mrc|erg)$/i.test(nom)) return lireMrc(texte, nom);
  if (/\.json$/i.test(nom)) { let d; try { d = JSON.parse(texte); } catch (e) { throw new Error("JSON invalide : " + e.message); } return d; }
  if (/\.fit$/i.test(nom)) throw new Error("le format .fit n'est pas encore géré : utilise un .zwo, .mrc, .erg ou un .json");
  throw new Error("format non reconnu (attendu : .zwo, .mrc, .erg ou .json)");
}

scope.Seances = { SEANCES, lireZwo, lireMrc, lireFichier };
if (typeof module !== "undefined") module.exports = scope.Seances;
})(typeof window === "undefined" ? globalThis : window);
