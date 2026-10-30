"use strict";
/* =====================================================================
   PUPITRE : la borne « console portable » (art/bornes-jeux/console-portable) dessinée sur un canevas 1024×1536, avec ses
   commandes animées (croix à 5 états, boutons A et B, touches Start et Select). Les sprites et leurs placements viennent des
   fichiers de Florent (atlas.js, mecanique.js, dessin-commandes.js) : ils sont lus tels quels, jamais modifiés.
   Correspondance avec les actions des jeux : croix = haut/bas/gauche/droite, A = a, B = b, Start = menu, Select = (sans action).
   Les touches du clavier ne font qu'allumer les commandes ; les actions viennent de Entrees. Les clics, eux, déclenchent l'action.
   ===================================================================== */
(function (scope) {

const VISUEL = { ArrowUp: "haut", ArrowDown: "bas", ArrowLeft: "gauche", ArrowRight: "droite",
  Enter: "a", Space: "a", KeyX: "a", Backspace: "b", KeyZ: "b", Escape: "start", ShiftLeft: "select", ShiftRight: "select" };
const ACTION = { haut: "haut", bas: "bas", gauche: "gauche", droite: "droite", a: "a", b: "b", start: "menu", select: "quitter" };   // select : retour au menu des jeux (dans la borne ; les jeux seuls l'ignorent)

// Quelle commande se trouve sous le point (x, y) en pixels de l'image 1024×1536 ?
function commandeSous(p, x, y) {
  const dx = x - p.cross.x, dy = y - p.cross.y;
  if (Math.abs(dx) < 63 && Math.abs(dy) < 57) {
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "gauche" : "droite") : (dy < 0 ? "haut" : "bas");
  }
  for (const k of ["a", "b", "start", "select"]) {
    const s = p[k], rx = k === "a" || k === "b" ? 44 : 29, ry = k === "a" || k === "b" ? 32 : 18;
    if (((x - s.x) / rx) ** 2 + ((y - s.y) / ry) ** 2 <= 1) return k;
  }
  return null;
}

// modele : "classique" | "grand". base : dossier console-portable (avec « / » final). Les scripts atlas.js, mecanique.js et
// dessin-commandes.js doivent être chargés avant. Retourne une promesse { allumer(commande, actif), etat }.
function creer(canvas, { modele = "classique", base, surAction }) {
  const g = canvas.getContext("2d"), images = {}, tenu = new Set(), pointeurs = new Map();
  let pret = false, signature = "";
  const etat = () => {
    const h = new Set(tenu); for (const v of pointeurs.values()) if (v) h.add(v);
    return { direction: ["haut", "bas", "gauche", "droite"].find((d) => h.has(d)) || "neutre", a: h.has("a"), b: h.has("b"), start: h.has("start"), select: h.has("select") };
  };
  function dessiner() {
    if (!pret) return;
    const e = etat(), sig = JSON.stringify(e);
    if (sig === signature) return; signature = sig;                 // redessiné seulement quand une commande change
    dessinerPupitre(g, modele, e, images, POCKET_ATLAS);
  }
  const fichiers = { [modele]: modele + "-sans-commandes.png" };
  for (const a of Object.values(POCKET_ATLAS)) fichiers[a.image] = a.image;
  const chargement = Promise.all(Object.entries(fichiers).map(([nom, src]) => new Promise((ok, ko) => {
    const im = new Image(); im.onload = () => { images[nom] = im; ok(); }; im.onerror = () => ko(new Error("Image introuvable : " + base + src)); im.src = base + src;
  }))).then(() => { pret = true; dessiner(); });

  const point = (e) => { const b = canvas.getBoundingClientRect(); return [(e.clientX - b.left) * 1024 / b.width, (e.clientY - b.top) * 1536 / b.height]; };
  canvas.addEventListener("pointerdown", (e) => {
    if (!pret) return;
    const c = commandeSous(PUPITRES[modele], ...point(e)); if (!c) return;
    e.preventDefault(); canvas.setPointerCapture(e.pointerId); pointeurs.set(e.pointerId, c); dessiner();
    if (ACTION[c]) surAction(ACTION[c]);
  });
  const relacher = (e) => { if (pointeurs.delete(e.pointerId)) dessiner(); };
  canvas.addEventListener("pointerup", relacher); canvas.addEventListener("pointercancel", relacher); canvas.addEventListener("lostpointercapture", relacher);
  document.addEventListener("keydown", (e) => { const c = VISUEL[e.code]; if (c && !e.ctrlKey && !e.metaKey && !e.altKey) { tenu.add(e.code === "Space" ? "a" : c); dessiner(); } });
  document.addEventListener("keyup", (e) => { const c = VISUEL[e.code]; if (c) { tenu.delete(e.code === "Space" ? "a" : c); dessiner(); } });
  window.addEventListener("blur", () => { tenu.clear(); pointeurs.clear(); dessiner(); });
  return chargement.then(() => ({ etat }));
}

scope.Pupitre = { creer, commandeSous, ACTION };
})(typeof window === "undefined" ? globalThis : window);
