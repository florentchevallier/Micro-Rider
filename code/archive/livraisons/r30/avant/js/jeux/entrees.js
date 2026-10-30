"use strict";
/* =====================================================================
   ENTRÉES DES JEUX : toutes les commandes sont ramenées à quelques « actions » communes, quelle que soit leur origine
   (clavier, boutons dessinés sur la borne, plus tard la manette Zwift). Les jeux ne connaissent que ces actions :
     haut, bas, gauche, droite — la croix directionnelle
     a (valider : Entrée, Espace, X), b (annuler : Retour arrière, Z), menu (Échap = bouton Start)
   « + » et « - » restent réservés aux rapports virtuels : ils ne sont pas des actions de jeu.
   ===================================================================== */
(function (scope) {

const TOUCHES = {
  ArrowLeft: "gauche", ArrowRight: "droite", ArrowUp: "haut", ArrowDown: "bas",
  Enter: "a", " ": "a", x: "a", X: "a", Backspace: "b", z: "b", Z: "b", Escape: "menu"
};

// Écoute le clavier de `cible` (document) et appelle `surAction(action)`. Retourne { injecter(action), arreter() }.
function creer(cible, surAction) {
  // Dans un champ de saisie, toutes les touches restent à la page ; sur un bouton ou un lien, seules Entrée et Espace lui restent (les flèches vont au jeu).
  const sujet = (e) => { const t = e.target; return t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t.isContentEditable || ((t.tagName === "BUTTON" || t.tagName === "A") && (e.key === "Enter" || e.key === " "))); };
  const ecouteur = (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || sujet(e)) return;
    const action = TOUCHES[e.key]; if (!action) return;
    e.preventDefault();                                          // pas de défilement de page ni de « retour »
    if (e.repeat && (action === "a" || action === "b" || action === "menu")) return;   // une touche tenue ne répète pas valider / annuler
    surAction(action);
  };
  cible.addEventListener("keydown", ecouteur);
  return { injecter: (action) => surAction(action), arreter: () => cible.removeEventListener("keydown", ecouteur) };
}

scope.Entrees = { TOUCHES, creer };
if (typeof module !== "undefined") module.exports = scope.Entrees;
})(typeof window === "undefined" ? globalThis : window);
