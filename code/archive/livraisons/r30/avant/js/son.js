"use strict";
/* =====================================================================
   SONS DE L'ANIMATION (art/sons) : pédalage, roue libre, oiseaux, voiture. Quatre volumes indépendants + un bouton muet.
   - Pédalage : boucle de 12 tours de pédalier (85 tr/min de référence) ; la vitesse de lecture suit la cadence (bornée).
   - Roue libre : enregistrement de décélération (cliquetis de 40 ms à 93 ms). On le lit en suivant la vitesse réelle : la position
     dans le fichier est celle où la cadence des cliquetis correspond à la vitesse, et la vitesse de lecture la corrige en continu.
   - Oiseaux : ponctuel, au départ de la volée dessinée. Voiture : ponctuelle ; le fichier contient déjà le déplacement stéréo.
   La logique de décision (fonctions pures) est séparée du Web Audio pour pouvoir être testée sans navigateur.
   ===================================================================== */
(function (scope) {

const FICHIERS = { pedalage: "pedalage-85-rpm-alpha.wav", rouelibre: "roue-libre-deceleration-alpha.wav", oiseaux: "oiseaux-ambiance.wav", voiture: "voiture-spider-passage-droite-gauche.wav" };
// Gain de mise à niveau (les fichiers « alpha » sont plus faibles que les autres ; la roue libre culmine à -3 dBFS : pas plus de +1,6 dB) ; le curseur de l'utilisateur s'applique en plus.
const NIVEAU = { pedalage: 4, rouelibre: 1.2, oiseaux: 1, voiture: 1 };
const NOMS = ["pedalage", "rouelibre", "oiseaux", "voiture"];

// Pédalage : 12 tours à 85 tr/min = 8,4706 s ; on boucle entre 0,25 s et 8,72 s (hors des fondus du fichier).
const PEDALAGE = { debut: 0.25, tours: 12, cadenceRef: 85 };
PEDALAGE.fin = PEDALAGE.debut + PEDALAGE.tours * 60 / PEDALAGE.cadenceRef;

// Roue libre : période des cliquetis (ms) mesurée au début de chaque seconde du fichier de 10 s ; la vitesse du fichier lui est inverse.
const PERIODE_MS = [39.9, 42.5, 45.2, 49.6, 53.4, 58.2, 64.2, 71.5, 81.0, 93.4, 100];
const VITESSE_DEBUT_KMH = 25;               // vitesse supposée au début du fichier (à ajuster à l'oreille)
const ROUELIBRE = { debutBoucle: 6, finBoucle: 9.5, duree: 10 };

function periodeAt(t) {
  const c = Math.max(0, Math.min(PERIODE_MS.length - 1.0001, t)), i = Math.floor(c), f = c - i;
  return PERIODE_MS[i] * (1 - f) + PERIODE_MS[i + 1] * f;
}
// Vitesse (km/h) que représente le fichier à l'instant t.
const vitesseFichier = (t) => VITESSE_DEBUT_KMH * PERIODE_MS[0] / periodeAt(t);
// Instant du fichier où la vitesse représentée vaut v (borné au fichier).
function positionPourVitesse(v) {
  if (v >= vitesseFichier(0)) return 0;
  if (v <= vitesseFichier(ROUELIBRE.finBoucle)) return ROUELIBRE.finBoucle - 1.5;
  let a = 0, b = ROUELIBRE.finBoucle;
  for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (vitesseFichier(m) > v) a = m; else b = m; }
  return (a + b) / 2;
}
const borner = (x, a, b) => Math.max(a, Math.min(b, x));

// Que faut-il entendre ? mode : "silence" | "pedale" | "rouelibre", avec un peu d'hystérésis sur la cadence.
function decider(precedent, cadence, vitesseKmh) {
  if (!(vitesseKmh >= 1.5)) return "silence";
  if (cadence >= 20 || (precedent === "pedale" && cadence >= 8)) return "pedale";
  return "rouelibre";
}
const tauxPedalage = (cadence) => borner(cadence / PEDALAGE.cadenceRef, 0.7, 1.4);
const gainVitesse = (v) => borner(v / 15, 0.35, 1);          // plus doux à basse vitesse
// Vitesse de lecture de la roue libre à la position t du fichier pour suivre la vitesse réelle v.
const tauxRouelibre = (v, t) => borner(v / vitesseFichier(t), 0.5, 2);

function creer(opts) {
  const base = opts.base, memo = opts.memo || { lire: (c, d) => d, ecrire() {} }, log = opts.log || (() => {});
  const vol = {}; for (const n of NOMS) vol[n] = borner(Number(memo.lire("vol-" + n, "0.7")), 0, 1);
  let muet = memo.lire("muet", "0") === "1";
  let ctx = null, maitre = null, tampons = {}, chargement = null, echec = false;
  const bus = {}, couches = {};                        // bus[n] : volume utilisateur ; couches : gain automatique pédalage / roue libre
  const st = { mode: "silence", pedale: null, rl: null, pos: 0, taux: 1 };

  function construire() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    maitre = ctx.createGain(); maitre.gain.value = muet ? 0 : 1; maitre.connect(ctx.destination);
    for (const n of NOMS) { bus[n] = ctx.createGain(); bus[n].gain.value = vol[n] * NIVEAU[n]; bus[n].connect(maitre); }
    for (const n of ["pedalage", "rouelibre"]) { couches[n] = ctx.createGain(); couches[n].gain.value = 0; couches[n].connect(bus[n]); }
  }
  async function charger() {
    if (location.protocol === "file:") { echec = true; log("⚠ Sons non chargés : Chrome refuse de lire les fichiers son depuis file://. Ouvre l'application via un serveur local (python3 -m http.server, puis http://localhost:8000/code/micro-rider.html)."); return; }
    try {
      const lots = await Promise.all(NOMS.map(async (n) => { const r = await fetch(base + FICHIERS[n]); if (!r.ok) throw new Error(FICHIERS[n] + " : " + r.status); return ctx.decodeAudioData(await r.arrayBuffer()); }));
      NOMS.forEach((n, i) => { tampons[n] = lots[i]; });
      log("Sons chargés.");
    } catch (e) {
      echec = true; log("⚠ Sons non chargés : " + (e && e.message || e) + " — ouvre l'application via un serveur local (http://localhost…) : Chrome refuse de lire des fichiers son depuis file://.");
    }
  }
  // À appeler lors d'un geste de l'utilisateur (clic, touche) : Chrome n'autorise le son qu'ensuite.
  function activer() {
    if (!ctx) { try { construire(); } catch (e) { echec = true; log("⚠ Web Audio indisponible : " + e.message); return; } chargement = charger(); }
    if (ctx.state === "suspended") ctx.resume();
  }
  function source(n, boucle) { const s = ctx.createBufferSource(); s.buffer = tampons[n]; s.loop = !!boucle; return s; }
  const rampe = (param, v, tau = 0.15) => param.setTargetAtTime(v, ctx.currentTime, tau);

  function demarrerPedalage() {
    const s = source("pedalage", true); s.loopStart = PEDALAGE.debut; s.loopEnd = PEDALAGE.fin; s.connect(couches.pedalage); s.start(0, PEDALAGE.debut); st.pedale = s;
  }
  function demarrerRouelibre(v) {
    const s = source("rouelibre", true); s.loopStart = ROUELIBRE.debutBoucle; s.loopEnd = ROUELIBRE.finBoucle; s.connect(couches.rouelibre);
    st.pos = positionPourVitesse(v); s.start(0, st.pos); st.rl = s;
  }
  function arreter(cle, apres) { const s = st[cle]; if (!s) return; st[cle] = null; try { s.stop(ctx.currentTime + apres); } catch (e) { /* déjà arrêtée */ } }

  // Appelé à chaque image : cadence (tr/min) et vitesse (km/h) réelles.
  function maj(dt, v) {
    if (!ctx || !tampons.pedalage) return;
    const mode = decider(st.mode, v.cadence, v.vitesseKmh);
    if (mode !== st.mode) {
      if (st.mode === "pedale") arreter("pedale", 0.6);            // l'ancienne source finit en fondu, la nouvelle démarre
      if (st.mode === "rouelibre") arreter("rl", 0.6);
      if (mode === "pedale") demarrerPedalage();
      if (mode === "rouelibre") demarrerRouelibre(v.vitesseKmh);
      rampe(couches.pedalage.gain, mode === "pedale" ? 1 : 0, 0.12); rampe(couches.rouelibre.gain, mode === "rouelibre" ? 1 : 0, 0.12);
      st.mode = mode;
    }
    if (mode === "pedale" && st.pedale) { st.taux = tauxPedalage(v.cadence); st.pedale.playbackRate.setTargetAtTime(st.taux, ctx.currentTime, 0.1); rampe(couches.pedalage.gain, gainVitesse(v.vitesseKmh), 0.15); }
    if (mode === "rouelibre" && st.rl) {
      st.taux = tauxRouelibre(v.vitesseKmh, st.pos); st.rl.playbackRate.setTargetAtTime(st.taux, ctx.currentTime, 0.1);
      st.pos += st.taux * dt; if (st.pos >= ROUELIBRE.finBoucle) st.pos = ROUELIBRE.debutBoucle + (st.pos - ROUELIBRE.finBoucle);
      rampe(couches.rouelibre.gain, gainVitesse(v.vitesseKmh), 0.15);
    }
  }
  // Sons ponctuels : « oiseaux » (fondu final après 13 s, comme la volée dessinée) et « voiture ».
  function jouer(nom) {
    if (!ctx || !tampons[nom]) return false;
    const s = source(nom, false), g = ctx.createGain(); s.connect(g); g.connect(bus[nom]);
    if (nom === "oiseaux") { g.gain.setValueAtTime(1, ctx.currentTime + 10); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 13); s.start(); s.stop(ctx.currentTime + 13.1); }
    else { s.start(); st.voiture = s; s.onended = () => { if (st.voiture === s) st.voiture = null; }; }
    return true;
  }
  // La voiture s'arrête quand on arrête de pédaler (elle reste figée sur l'écran) : le son se fige avec elle (vitesse de lecture 0).
  function pauseVoiture(pause) { if (st.voiture && ctx) st.voiture.playbackRate.setValueAtTime(pause ? 0 : 1, ctx.currentTime); }
  function fixerVolume(nom, v) { vol[nom] = borner(v, 0, 1); memo.ecrire("vol-" + nom, String(vol[nom])); if (ctx) rampe(bus[nom].gain, vol[nom] * NIVEAU[nom], 0.05); }
  function fixerMuet(m) { muet = !!m; memo.ecrire("muet", muet ? "1" : "0"); if (ctx) rampe(maitre.gain, muet ? 0 : 1, 0.05); }

  return { activer, maj, jouer, pauseVoiture, fixerVolume, fixerMuet, volume: (n) => vol[n], muet: () => muet,
           etat: () => ({ pret: !!tampons.pedalage, echec, contexte: ctx ? ctx.state : null, mode: st.mode, taux: st.taux, pos: st.pos, volumes: Object.assign({}, vol), muet }),
           attendre: () => chargement };
}

scope.Sons = { creer, decider, tauxPedalage, tauxRouelibre, vitesseFichier, positionPourVitesse, periodeAt, gainVitesse, PEDALAGE, ROUELIBRE, FICHIERS };
if (typeof module !== "undefined") module.exports = scope.Sons;
})(typeof window === "undefined" ? globalThis : window);
