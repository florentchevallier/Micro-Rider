"use strict";
/* =====================================================================
   MODE PROMENADE : rue horizontale en parallaxe (paysage), séance en bande de couleur dessous.
   Le dessin des couches vient du prototype « promenade-relief » (scene.js, dossier art).
   Ici il est branché sur les vraies valeurs : la distance parcourue (physique) fait défiler le décor,
   la cadence fait tourner le sprite, et la bande du bas montre la séance, la cible et la puissance réelle.
   Les images restent dans art/promenade-relief : on ne les copie pas.
   ===================================================================== */
(function (scope) {

const DOSSIER = ART + "promenade-relief/";
const FICHIERS = ["pedalage", "facades-asphalte", "facades-paves", "sol-asphalte", "asphalte-classique", "asphalte-raccord", "sol-paves", "lointain", "nuages"];
// Échelle du décor : le prototype faisait 1 m/s = 14,4 px/s (1 km/h = 4 px/s). Trop lent à l'œil (Florent, 2026-10-26 :
// « environ 50 % moins rapide que dans la réalité ») : on double. À ajuster ici (1,75 ? 1,5 ?) ; le réglage « Défilement »
// de l'écran s'applique en plus, par-dessus cette base.
const ECHELLE_DECOR = 2;
const PX_PAR_METRE = 14.4 * ECHELLE_DECOR;
const SCENE = { top: 64, height: 800, bottom: 864, width: 1200 };
const PROJECTION = { shear: .45, shadowDepth: .22 };
const COULEURS_ZONES = ["", "#858b9d", "#2bbbea", "#4bcd75", "#ffdc43", "#ff933b", "#fc585b"];

function chargerImage(url) {
  return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error("image introuvable : " + url)); im.src = url; });
}
function chargerScript(url) {
  return new Promise((ok, no) => { const s = document.createElement("script"); s.src = url; s.onload = ok; s.onerror = () => no(new Error("fichier introuvable : " + url)); document.head.append(s); });
}
const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

function creerPromenade(canvas) {
  const g = canvas.getContext("2d");
  canvas.width = 1200; canvas.height = 1022;
  const images = {};
  const st = { travel: 0, phase: 0, time: 0 };

  const text = (t, x, y, size = 14, c = "#fff") => { g.fillStyle = c; g.font = `bold ${size}px monospace`; g.fillText(t, x, y); };
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

  function positions(factor, width) {
    const world = st.travel * factor, index = Math.floor(world / width), offset = world - index * width;
    return [-1, 0, 1].map((i) => ({ index: index + i, x: i * width - offset }));
  }
  function layer(im, factor, width, y, height, mirror = true) {
    for (const tile of positions(factor, width)) {
      const x = tile.x, flip = mirror && ((tile.index % 2 + 2) % 2 === 1);
      g.save(); g.beginPath(); g.rect(x, y, width + 2, height); g.clip();
      if (flip) { g.translate(x + width, y); g.scale(-1, 1); g.drawImage(im, -2, 0, width + 4, height); }
      else g.drawImage(im, x - 2, y, width + 4, height);
      g.restore();
    }
  }
  function ground(surface, top) {
    g.save(); g.beginPath(); g.rect(0, top, 1200, 864 - top); g.clip();
    if (surface === "asphalte") {
      // L'asphalte illustré validé, avec sa lumière peinte ; chaque copie recouvre la précédente.
      const im = images["asphalte-raccord"], overlap = 200 * 1200 / 1536, period = 1200 - overlap;
      for (const tile of positions(1, period)) g.drawImage(im, tile.x, top, 1200, 864 - top);
    } else {
      const im = images[surface === "paves" ? "sol-paves" : "sol-asphalte"], tileW = 700, tileH = tileW * im.height / im.width;
      const compression = surface === "paves" ? .375 : 1;
      g.transform(1, 0, PROJECTION.shear, compression, 0, top);
      const shift = st.travel % tileW;
      for (let y = 0; y < (864 - top) / compression; y += tileH) { for (let x = -tileW - shift; x < 1500; x += tileW) g.drawImage(im, x - 1, y - 1, tileW + 2, tileH + 2); }
      if (surface === "asphalte-sombre") for (let x = -st.travel % 180 - 180; x < 1500; x += 180) { rect(x, 90, 83, 4, "#eadab5"); rect(x, 94, 83, 1, "#a99a83"); }
    }
    g.restore();
  }
  function nearShadows(im, baseY, roadTop) {
    const scale = 1200 / im.width, depth = PROJECTION.shadowDepth, side = depth * PROJECTION.shear;
    g.save(); g.beginPath(); g.rect(0, roadTop, 1200, 864 - roadTop); g.clip(); g.globalAlpha = .19; g.filter = "brightness(0)";
    for (const tile of positions(1, 1200)) {
      const flip = ((tile.index % 2 + 2) % 2 === 1), a = (flip ? -1 : 1) * scale;
      g.save(); g.transform(a, 0, -side * scale, -depth * scale, tile.x + (flip ? 1200 : 0) + side * scale * baseY, 64 + scale * baseY * (1 + depth)); g.drawImage(im, 0, 0); g.restore();
    }
    g.restore();
  }
  function birds() {
    // Une petite envolée indépendante : premier départ après 4 s, puis toutes les 28 s.
    const age = (st.time - 4) % 28; if (st.time < 4 || age > 13) return;
    g.save(); g.globalAlpha = Math.min(1, age / 1.2, (13 - age) / 2); g.strokeStyle = "#fff9dd"; g.lineWidth = 1.8; g.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const delay = i * .3, t = Math.max(0, age - delay), x = 560 + t * 31 + (i % 3) * 24, y = 330 - t * 12 - i * 7 + Math.sin(t * .8 + i) * 5;
      const span = 5 + (i % 3), wing = Math.sin(t * 7 + i) * 3.5;
      g.beginPath(); g.moveTo(x - span, y - wing); g.lineTo(x - span * .45, y - wing - 1.5); g.lineTo(x, y + 1); g.lineTo(x + span * .45, y - wing - 1.5); g.lineTo(x + span, y - wing); g.stroke();
    }
    g.restore();
  }
  function decor(surface) {
    const kind = surface === "paves" ? "paves" : "asphalte", fg = images["facades-" + kind], baseY = surface === "paves" ? 636 : 600, roadTop = 64 + (baseY - 12) * 800 / 1024;
    g.save(); g.beginPath(); g.rect(0, 64, 1200, 800); g.clip();
    const sky = g.createLinearGradient(0, 64, 0, 570); sky.addColorStop(0, "#39a9f6"); sky.addColorStop(1, "#a3e2fa"); g.fillStyle = sky; g.fillRect(0, 64, 1200, 800);
    layer(images.nuages, .045, 1800, -155, 600);
    layer(images.lointain, .15, 1440, 24, 480);
    birds();
    ground(surface, roadTop);
    if (surface !== "asphalte") nearShadows(fg, baseY, roadTop);
    layer(fg, 1, 1200, 64, 800);
    const feet = 64 + 800 * (surface === "paves" ? .83 : .81);
    g.fillStyle = "rgba(13,28,48,.23)"; g.beginPath(); g.ellipse(350, feet, 107, 6, 0, 0, Math.PI * 2); g.fill();
    const f = RIDER_ATLAS.pedalage.frames[Math.floor(st.phase) % 8];
    g.save(); g.translate(350, feet - 122); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(images.pedalage, f.x, f.y, f.w, f.h, -130, -130, 260, 260); g.restore();
    g.restore();
  }

  // Bande du bas : la séance (hauteur = puissance, largeur = durée, couleur = zone).
  function bande(S) {
    const L = S.lecteur, se = L.seance;
    rect(0, 864, 1200, 158, "#0c1c34"); rect(0, 864, 1200, 2, "#426581");
    if (!se) {
      text("LIBRE", 26, 954, 28, "#9db4d0"); text("Aucune séance chargée", 26, 982, 13, "#9db4d0");
      text("Choisis une séance, un dossier de séances ou charge un fichier .zwo / .json.", 100, 940, 14, "#91a8c4"); return;
    }
    const x0 = 66, width = 1032, bottom = 977, scale = 92 / Math.max(300, se.wMax * 1.05);
    // Échelle de temps non linéaire : dernière minute et 10 prochaines minutes en gros (voir Noyau.echelleTemps).
    const tNow = L.etat === "prete" || L.etat === "aucune" ? 0 : L.t, ech = Noyau.echelleTemps(se.duree, tNow);
    const X = (u) => x0 + ech.x(u) * width;
    if (ech.bornes) { g.fillStyle = "rgba(120,160,210,.09)"; g.fillRect(X(ech.bornes[0]), 866, X(ech.bornes[1]) - X(ech.bornes[0]), 111); }
    for (const e of se.etapes) {
      // chaque étape est découpée aux bornes de l'échelle : trois pentes de largeur différente au plus
      const coupes = [e.t0, ...(ech.bornes ? ech.bornes.filter((u) => u > e.t0 && u < e.t0 + e.dur) : []), e.t0 + e.dur];
      for (let k = 0; k < coupes.length - 1; k++) {
        const a = coupes[k], c = coupes[k + 1], x = X(a), w = Math.max(1, X(c) - x - (k === coupes.length - 2 ? 2 : -0.6));
        if (e.libre) { g.strokeStyle = "#72839e"; g.setLineDash([4, 3]); g.strokeRect(x + .5, bottom - 20, w, 20); g.setLineDash([]); continue; }
        const wa = e.w0 + (e.w1 - e.w0) * (a - e.t0) / e.dur, wc = e.w0 + (e.w1 - e.w0) * (c - e.t0) / e.dur;
        g.fillStyle = COULEURS_ZONES[Noyau.zoneDe((e.w0 + e.w1) / 2, se.ftp)];
        g.beginPath(); g.moveTo(x, bottom); g.lineTo(x, bottom - wa * scale); g.lineTo(x + w, bottom - wc * scale); g.lineTo(x + w, bottom); g.fill();
      }
    }
    rect(x0, bottom, width, 1, "#72839e");
    // Puissance réellement produite (trait blanc) par-dessus la cible.
    if (S.historique.length > 1) {
      g.save(); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 2; g.lineJoin = "round"; g.beginPath();
      S.historique.forEach((p, i) => { const x = X(p.t), y = bottom - Math.min(p.w * scale, 98); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      g.stroke(); g.restore();
    }
    // Cadence (cyan, 30–120 tr/min) et fréquence cardiaque (rose, 0–FC max) : deux courbes pleine hauteur, échelles à droite.
    const hTop = 893, hBas = bottom, hH = hBas - hTop, xr = x0 + width;
    const FC0 = 50, CAD0 = 30, CAD1 = 120, CCAD = "#6fe8df", CFC = "#ff8f8f";
    const courbe = (cle, v0, v1, coul) => {
      g.save(); g.strokeStyle = coul; g.lineWidth = 1.6; g.lineJoin = "round"; g.beginPath(); let debut = true;
      for (const p of S.historique) {
        const v = p[cle]; if (!(v > 0)) { debut = true; continue; }
        const x = X(p.t), y = hBas - Math.max(0, Math.min(1, (v - v0) / (v1 - v0))) * hH;
        if (debut) { g.moveTo(x, y); debut = false; } else g.lineTo(x, y);
      }
      g.stroke(); g.restore();
    };
    courbe("c", CAD0, CAD1, CCAD); courbe("f", FC0, S.fcMax, CFC);
    for (const v of [30, 60, 90, 120]) text(String(v), xr + 6, hBas - (v - CAD0) / (CAD1 - CAD0) * hH + 4, 10, CCAD);
    for (const v of [0, 0.5, 1]) text(String(Math.round(FC0 + v * (S.fcMax - FC0))), xr + 40, hBas - v * hH + 4, 10, CFC);
    text("RPM", xr + 6, 883, 9, CCAD); text("FC", xr + 40, 883, 9, CFC);
    // Échelle de puissance (watts), à gauche du graphique.
    const wH = hH / scale;
    for (const v of [0, 100, 200, 300, 400, 500, 600]) { if (v > wH) break; const y = hBas - v * scale; rect(x0 - 4, y, 4, 1, "#72839e"); text(String(v), x0 - 30, y + 4, 10, "#91a8c4"); }
    const px = X(tNow);
    rect(px - 1, 880, 3, 102, "#fff"); g.fillStyle = "#fff"; g.beginPath(); g.moveTo(px - 5, 876); g.lineTo(px + 5, 876); g.lineTo(px, 883); g.fill();
    // Repères de temps : maintenant, bornes de la zone grossie, début, fin, puis toutes les 2 min dans la zone grossie ; jamais trop serrés.
    const reps = [tNow, se.duree, 0]; if (ech.bornes) { reps.push(...ech.bornes); const [ta, tb] = ech.bornes; for (let u = Math.ceil(ta / 120) * 120; u < tb; u += 120) reps.push(u); }
    else for (let u = 0; u <= se.duree; u += se.duree <= 360 ? 60 : 300) reps.push(u);
    const poses = [];
    for (const u of reps) { const x = X(u); if (u < 0 || u > se.duree || poses.some((q) => Math.abs(q - x) < 46)) continue; poses.push(x); text(mmss(u), Math.min(x, x0 + width - 24) - 8, 997, 11, u === tNow ? "#fff" : "#91a8c4"); }
    text("blanc : puissance · cyan : cadence · rose : FC", x0, 1016, 10, "#91a8c4");
    for (let z = 1; z <= 6; z++) { rect(x0 + 520 + (z - 1) * 52, 1008, 8, 8, COULEURS_ZONES[z]); text("Z" + z, x0 + 531 + (z - 1) * 52, 1016, 10, "#91a8c4"); }
  }
  // Bloc « entraînement » en surimpression, en haut à gauche de la scène : cible, zone, temps restant (28 px).
  function bloc(S) {
    const L = S.lecteur, se = L.seance; if (!se) return;
    const tc = L.etat === "finie" ? null : Noyau.cibleA(se, L.etat === "prete" ? 0 : L.t);
    const ETATS = { prete: "PRÊTE", "en cours": "EN COURS", pause: "EN PAUSE", finie: "TERMINÉE" };
    g.fillStyle = "rgba(8,18,34,.42)"; g.beginPath(); g.roundRect(14, 76, 196, 128, 10); g.fill();
    g.save(); g.shadowColor = "rgba(0,0,0,.85)"; g.shadowBlur = 5;
    text("ENTRAÎNEMENT" + (ETATS[L.etat] ? " · " + ETATS[L.etat] : ""), 26, 96, 11, "#cfe2f7");
    const c = tc && !tc.libre ? COULEURS_ZONES[tc.zone] : "#9db4d0";
    if (tc && !tc.libre) { text(Math.round(tc.w) + " W", 26, 132, 28, c); text("ZONE " + tc.zone, 26, 162, 28, c); text(mmss(tc.reste), 26, 192, 28, c); }
    else if (tc) { text("LIBRE", 26, 132, 28, c); text(mmss(tc.reste), 26, 192, 28, c); }
    else text("—", 26, 132, 28, c);
    g.restore();
  }
  function haut(S) {
    rect(0, 0, 1200, 64, "#0b1930");
    text("MICRO RIDER", 24, 39, 23, "#4ee7e8");
    text(Math.round(S.puissance) + " W", 290, 39, 22, "#ffdd62");
    text(Math.round(S.cadence) + " RPM", 440, 39, 22, "#6fe8df");
    text(S.vitesseKmh.toFixed(1).replace(".", ",") + " KM/H", 610, 39, 22);
    text("♥ " + (S.fc > 0 ? Math.round(S.fc) : "--"), 790, 39, 22, "#ff8f8f");
    text(S.rapportActif ? "R " + S.rapport + "/24" : "ERG " + (100 + S.ajustErg) + "%", 890, 39, 20, S.rapportActif ? "#f3c6ff" : "#ffb86b");
  }

  return {
    async charger() {
      await chargerScript(DOSSIER + "atlas.js");
      const ims = await Promise.all(FICHIERS.map((k) => chargerImage(DOSSIER + k + (k === "asphalte-raccord" ? ".svg" : ".png"))));
      FICHIERS.forEach((k, i) => { images[k] = ims[i]; });
    },
    // dt en secondes ; S = valeurs courantes (voir app.js)
    maj(dt, S) {
      st.travel = S.distance * PX_PAR_METRE;
      if (S.cadence > 1 || S.vitesseKmh > 1 || S.cadenceAnim > 0) {
        st.phase = (st.phase + (S.cadenceAnim !== undefined ? S.cadenceAnim : S.cadence) / 60 * 8 * dt) % 8;
        st.time += dt;
      }
    },
    dessiner(S) {
      g.clearRect(0, 0, 1200, 1022);
      decor(S.surface); bande(S); haut(S); bloc(S);
    }
  };
}

scope.ModePromenade = { creer: creerPromenade, SURFACES: [["asphalte", "Asphalte (illustration validée)"], ["paves", "Pavés"], ["asphalte-sombre", "Asphalte sombre"]] };
})(window);
