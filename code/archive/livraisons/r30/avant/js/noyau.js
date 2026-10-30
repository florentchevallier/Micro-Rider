"use strict";
/* =====================================================================
   NOYAU de Micro-Rider : physique, séances d'entraînement, zones.
   Aucune dépendance au navigateur : ni écran, ni Bluetooth. Les modes d'affichage et
   le Bluetooth lisent et remplissent ces objets (voir app.js).
   ===================================================================== */
(function (scope) {

// --- Physique : bilan des forces (identique à celui de index.html, validé).
// "inertie" : masse utilisée seulement pour accélérer/ralentir. Les forces (pente, roulement) gardent la vraie masse,
// donc la vitesse en régime stable est celle de la réalité, mais on y arrive beaucoup plus vite (physique « dessin animé »).
const PHYS = { g: 9.81, crr: 0.005, cda: 0.32, rho: 1.2, rendement: 0.975, inertie: 25 };

function pasPhysique(v, puissance, pentePct, masse, dt) {
  const tan = pentePct / 100;
  const cos = 1 / Math.sqrt(1 + tan * tan);
  const sin = tan * cos;
  const fMotrice = PHYS.rendement * puissance / Math.max(v, 1);   // max(v,1) évite la division par ~0 au départ
  const fResist = masse * PHYS.g * (sin + PHYS.crr * cos) + 0.5 * PHYS.rho * PHYS.cda * v * v;
  const a = (fMotrice - fResist) / (PHYS.inertie || masse);
  return Math.max(0, v + a * dt);                                 // on ne recule pas
}

// La puissance reçue (1 valeur par seconde) est lissée avant d'entrer dans la physique.
const LISSAGE_S = 0.6;
// Frein et boost : ne concernent que le vélo virtuel, jamais la résistance du trainer.
// Le frein ralentit tant qu'il est tenu. Le boost augmente la vitesse affichée (et le décor), pas la distance
// enregistrée dans la sortie ; il dure 5 s puis une pause de 10 s (valeur provisoire de développement) l'empêche de repartir.
const FREIN = { decel: 3.0 };                                       // m/s² en plus de la physique
const BOOST = { facteur: 0.2, duree: 5, pause: 10, vMini: 1 };      // +20 % ; refusé en dessous de 1 m/s
function creerEtat() { return { d: 0, v: 0, t: 0, pLisse: 0, masse: 80, bonusD: 0, niveauBoost: 0, boostFin: 0, boostPret: 0 }; }
function declencherBoost(etat) {
  if (etat.t < etat.boostPret || etat.v < BOOST.vMini) return false;
  etat.boostFin = etat.t + BOOST.duree; etat.boostPret = etat.boostFin + BOOST.pause;
  return true;
}
function etatBoost(etat) {
  return { actif: etat.t < etat.boostFin, reste: Math.max(0, etat.boostFin - etat.t), pret: etat.t >= etat.boostPret, attente: Math.max(0, etat.boostPret - etat.t), niveau: etat.niveauBoost };
}
const vitesseVirtuelle = (etat) => etat.v * (1 + BOOST.facteur * etat.niveauBoost);
// Quand on ne pédale pas, le vélo virtuel s'arrête vite, sauf en vraie descente : le trainer, lui, n'a plus
// de roue qui tourne, et un vélo qui « roule tout seul » à 16 km/h sans pédaler est trompeur.
// Seuil : on ne laisse rouler que si la pente est inférieure à −1 % (rapports 7 et moins).
const ARRET = { decel: 2.0, penteRoueLibre: -1 };                   // décélération supplémentaire (m/s²)
function avancer(etat, puissance, pentePct, dtTotal, pedale = true, frein = false) {
  const pas = 0.05;
  let reste = dtTotal;
  while (reste > 1e-9) {
    const h = Math.min(pas, reste);
    reste -= h;
    etat.pLisse += (puissance - etat.pLisse) * (1 - Math.exp(-h / LISSAGE_S));
    etat.v = pasPhysique(etat.v, etat.pLisse, pentePct, etat.masse, h);
    if (!pedale && pentePct >= ARRET.penteRoueLibre) etat.v = Math.max(0, etat.v - ARRET.decel * h);
    if (frein) etat.v = Math.max(0, etat.v - FREIN.decel * h);
    etat.niveauBoost += ((etat.t < etat.boostFin ? 1 : 0) - etat.niveauBoost) * (1 - Math.exp(-h / 0.25));    // montée et descente douces
    etat.bonusD += etat.v * BOOST.facteur * etat.niveauBoost * h;
    etat.d += etat.v * h;
    etat.t += h;
  }
}

// --- Zones de puissance (% de la FTP, échelle de Coggan à 6 zones).
const ZONES_MAX = [55, 75, 90, 105, 120];          // limites hautes des zones 1 à 5 ; la zone 6 est au-dessus
function zoneDe(w, ftp) {
  const pct = Math.round(w / ftp * 10000) / 100;     // arrondi : 137,5 / 250 doit donner exactement 55 %
  for (let i = 0; i < ZONES_MAX.length; i++) if (pct <= ZONES_MAX[i]) return i + 1;
  return 6;
}

// --- Rapports virtuels (1 à 24) : le Hub n'a qu'un pignon, on fait varier la pente simulée.
// Le rapport 10 (par défaut) donne 0 %. Au-dessus, 0,8 % par cran (rapport 24 : +11,2 %) ;
// en dessous, 0,5 % par cran (rapport 1 : −4,5 %). Ces deux pas se règlent ici, au ressenti.
const RAPPORTS = { min: 1, max: 24, defaut: 10, pasHaut: 0.8, pasBas: 0.5 };
function penteDuRapport(g) {
  const r = Math.min(RAPPORTS.max, Math.max(RAPPORTS.min, Math.round(g)));
  const d = r - RAPPORTS.defaut;
  return Math.round((d >= 0 ? d * RAPPORTS.pasHaut : d * RAPPORTS.pasBas) * 100) / 100;
}

// --- Séances.
// Définition (JSON) : { nom, ftp, etapes: [ étape, ... ] }
// Étape : { s: durée en secondes, et UNE de ces formes de puissance :
//   w | pct            palier constant (watts, ou % de la FTP)
//   w0,w1 | pct0,pct1  rampe linéaire du début à la fin de l'étape
//   libre: true        pas de cible : résistance libre }
function construireSeance(def, ftpDefaut) {
  if (!def || !Array.isArray(def.etapes) || !def.etapes.length) throw new Error("séance vide ou illisible");
  const ftp = Number(ftpDefaut || def.ftp || 250);
  if (!(ftp > 0)) throw new Error("FTP invalide");
  const etapes = []; let t0 = 0;
  def.etapes.forEach((e, i) => {
    const s = Number(e.s);
    if (!(s > 0) || !isFinite(s)) throw new Error("étape " + (i + 1) + " : durée invalide");
    const conv = (w, pct) => w !== undefined ? Number(w) : pct !== undefined ? Number(pct) / 100 * ftp : undefined;
    let w0, w1, libre = false;
    if (e.libre) libre = true;
    else if (e.w0 !== undefined || e.pct0 !== undefined) { w0 = conv(e.w0, e.pct0); w1 = conv(e.w1, e.pct1); }
    else { w0 = w1 = conv(e.w, e.pct); }
    if (!libre && !(w0 >= 0 && w1 >= 0 && isFinite(w0) && isFinite(w1))) throw new Error("étape " + (i + 1) + " : puissance manquante ou invalide");
    etapes.push({ index: i, t0, dur: s, w0, w1, libre });
    t0 += s;
  });
  return { nom: def.nom || "Séance", ftp, etapes, duree: t0,
           wMax: Math.max(...etapes.filter((e) => !e.libre).map((e) => Math.max(e.w0, e.w1)), 0) };
}
// Cible à l'instant t de la séance (secondes), ou null si la séance est terminée.
function cibleA(seance, t) {
  if (!seance || t < 0 || t >= seance.duree) return null;
  for (const e of seance.etapes) {
    if (t < e.t0 + e.dur) {
      if (e.libre) return { index: e.index, w: null, libre: true, zone: 0, reste: e.t0 + e.dur - t };
      const w = e.w0 + (e.w1 - e.w0) * (t - e.t0) / e.dur;
      return { index: e.index, w, libre: false, zone: zoneDe(w, seance.ftp), reste: e.t0 + e.dur - t };
    }
  }
  return null;
}

// --- Le lecteur de séance : l'horloge de la séance et son état.
// États : "aucune" (pas de séance chargée), "prete", "en cours", "pause", "finie".
function creerLecteur() {
  return {
    seance: null, t: 0, etat: "aucune",
    charger(seance) { this.seance = seance; this.t = 0; this.etat = seance ? "prete" : "aucune"; },
    demarrer() { if (this.seance && (this.etat === "prete" || this.etat === "finie")) { this.t = 0; this.etat = "en cours"; } },
    pause() { if (this.etat === "en cours") this.etat = "pause"; },
    reprendre() { if (this.etat === "pause") this.etat = "en cours"; },
    arreter() { if (this.seance) { this.t = 0; this.etat = "prete"; } },
    avancer(dt) {
      if (this.etat !== "en cours") return;
      this.t += dt;
      if (this.t >= this.seance.duree) { this.t = this.seance.duree; this.etat = "finie"; }
    },
    cible() { return this.etat === "en cours" ? cibleA(this.seance, this.t) : null; },
    // Ce qu'on demande au trainer : puissance cible (ERG) pendant la séance, résistance libre sinon.
    consigne(pentePct = 0) {
      const c = this.cible();
      return c && !c.libre ? { mode: "erg", w: Math.round(c.w), index: c.index } : { mode: "libre", pente: pentePct };
    }
  };
}


// Échelle de temps non linéaire du graphique de séance : on grossit la dernière minute et les 10 prochaines minutes,
// le reste (début lointain, fin lointaine) est comprimé. Continue : le curseur glisse sans saut. Séances courtes : linéaire.
// Retourne { x(t) -> 0..1, bornes: [tA, tB] } (tA = début de la minute passée, tB = fin des 10 minutes à venir).
const ECHELLE = { passe: 60, futur: 600, minLineaire: 780, pLoin: 0.10, pPasse: 0.22, pFutur: 0.48, pFin: 0.20 };
// opts (facultatif) : { part, anim }
//   part : part de la largeur occupée par la zone zoomée (dernière minute + 10 prochaines minutes), 0 à 0,9 ; sans `part`, poids d'origine (70 %)
//   anim : 0 = échelle linéaire (séance vue « normalement »), 1 = échelle zoomée ; entre les deux, mélange progressif (zoom au démarrage)
function echelleTemps(duree, t, opts) {
  const E = ECHELLE, lin = { x: (u) => Math.max(0, Math.min(1, u / duree)), bornes: null };
  const anim = opts && opts.anim !== undefined ? Math.max(0, Math.min(1, opts.anim)) : 1;
  if (!(duree > E.minLineaire) || anim <= 0 || (opts && opts.part !== undefined && !(opts.part > 0))) return lin;
  let pLoin = E.pLoin, pPasse = E.pPasse, pFutur = E.pFutur, pFin = E.pFin;
  if (opts && opts.part !== undefined) {
    const part = Math.max(0, Math.min(0.9, opts.part)), reste = 1 - part, zone = E.pPasse + E.pFutur;
    pPasse = part * E.pPasse / zone; pFutur = part * E.pFutur / zone; pLoin = reste / 3; pFin = reste * 2 / 3;   // le reste : 1/3 avant, 2/3 après
  }
  t = Math.max(0, Math.min(duree, t));
  const tA = Math.max(0, t - E.passe), tB = Math.min(duree, t + E.futur);
  const seg = [
    { a: 0, b: tA, w: pLoin * Math.min(1, tA / 180) },
    { a: tA, b: t, w: pPasse * (t - tA) / E.passe },
    { a: t, b: tB, w: pFutur * (tB - t) / E.futur },
    { a: tB, b: duree, w: pFin * Math.min(1, (duree - tB) / 180) }
  ].filter((q) => q.b > q.a && q.w > 0);
  const somme = seg.reduce((n, q) => n + q.w, 0); let cum = 0;
  for (const q of seg) q.w = (1 - anim) * (q.b - q.a) / duree + anim * q.w / somme;       // mélange linéaire ↔ zoomé (somme = 1)
  for (const q of seg) { q.x0 = cum; cum += q.w; q.x1 = cum; }
  return { x(u) {
    u = Math.max(0, Math.min(duree, u));
    for (const q of seg) if (u <= q.b) return q.x0 + (q.x1 - q.x0) * (u - q.a) / (q.b - q.a);
    return 1;
  }, bornes: anim < 0.02 ? null : [tA, tB] };
}
scope.Noyau = { echelleTemps, FREIN, BOOST, declencherBoost, etatBoost, vitesseVirtuelle, ARRET, RAPPORTS, penteDuRapport, PHYS, pasPhysique, LISSAGE_S, creerEtat, avancer, ZONES_MAX, zoneDe, construireSeance, cibleA, creerLecteur };
if (typeof module !== "undefined") module.exports = scope.Noyau;
})(typeof window === "undefined" ? globalThis : window);
