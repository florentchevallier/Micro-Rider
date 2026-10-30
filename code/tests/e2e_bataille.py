# Bataille navale : placement / mélange, clavier, tir et réponse de l'ordinateur, annulation, sauvegarde, victoire / score, nouvelle partie.
from playwright.sync_api import sync_playwright
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
URL = "http://localhost:8765/code/jeu-bataille.html"
def st(pg): return pg.evaluate("JEU.etat()")
def attendre_ordi(pg):
    for _ in range(40):
        pg.wait_for_timeout(100)
        if st(pg)["etat"] != "ia": return st(pg)
    return st(pg)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 700, "height": 1000}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(600)
    check("départ : placement de la flotte, viseur au centre", st(pg)["etat"] == "placement" and st(pg)["curseur"] == [4, 3], st(pg))
    f0 = pg.evaluate("JSON.stringify(JEU.partie().flotte.j)")
    ch = False
    for _ in range(5):
        pg.keyboard.press("Backspace")
        if pg.evaluate("JSON.stringify(JEU.partie().flotte.j)") != f0: ch = True; break
    check("Retour arrière (B) au placement : mélange la flotte du joueur", ch)
    pg.keyboard.press("ArrowLeft"); check("la croix ne bouge pas le viseur pendant le placement", st(pg)["curseur"] == [4, 3])
    pg.keyboard.press("Enter"); check("Entrée (A) : la partie commence", st(pg)["etat"] == "jeu")
    for _ in range(10): pg.keyboard.press("ArrowLeft"); pg.keyboard.press("ArrowUp")
    check("viseur borné en haut à gauche", st(pg)["curseur"] == [0, 0], st(pg))
    for _ in range(10): pg.keyboard.press("ArrowRight"); pg.keyboard.press("ArrowDown")
    check("viseur borné en bas à droite (8 rangées × 6 colonnes)", st(pg)["curseur"] == [7, 5], st(pg))
    pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
    check("Entrée : le tir est joué", st(pg)["tours"] == 1, st(pg))
    s = attendre_ordi(pg)
    check("l'ordinateur répond ; c'est de nouveau au joueur", s["etat"] == "jeu" and pg.evaluate("JEU.partie().tours[0].o !== null"), s)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
    check("tirer deux fois sur la même case : refusé", st(pg)["tours"] == 1)
    pg.reload(); pg.wait_for_timeout(600)
    check("sauvegarde : la partie est reprise après rechargement", st(pg)["etat"] == "jeu" and st(pg)["tours"] == 1, st(pg))
    pg.keyboard.press("Backspace"); pg.wait_for_timeout(100)
    check("Retour arrière : annule le tour complet", st(pg)["tours"] == 0, st(pg))
    # victoire : on prépare une partie où il ne reste qu'un tir à jouer
    pg.evaluate("""() => { const e = JEU.partie(), cases = e.flotte.o.flatMap((b) => b.cases); const derniere = cases.pop();
      const libres = []; for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) if (!e.flotte.j.some((b) => b.cases.some((p) => p[0] === r && p[1] === c))) libres.push([r, c]);
      cases.forEach((p, i) => e.tours.push({ j: p, o: libres[i] })); window.__derniere = derniere; }""")
    d = pg.evaluate("window.__derniere")
    for _ in range(12): pg.keyboard.press("ArrowLeft"); pg.keyboard.press("ArrowUp")
    for _ in range(d[1]): pg.keyboard.press("ArrowRight")
    for _ in range(d[0]): pg.keyboard.press("ArrowDown")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    s = st(pg)
    check("dernier bateau coulé : victoire, score +1", s["etat"] == "fin" and s["gagnant"] == 1 and s["score"]["v"] == 1, s)
    pg.keyboard.press("Backspace"); pg.wait_for_timeout(100)
    s = st(pg); check("annuler la victoire : la partie reprend, score remis à 0", s["etat"] == "jeu" and s["gagnant"] == 0 and s["score"]["v"] == 0, s)
    pg.keyboard.press("Escape"); check("Échap : demande confirmation", st(pg)["etat"] == "confirme")
    pg.keyboard.press("Backspace"); check("Retour : refuse la nouvelle partie", st(pg)["etat"] == "jeu")
    pg.keyboard.press("Escape"); pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
    s = st(pg); check("Entrée : nouvelle partie, retour au placement", s["etat"] == "placement" and s["tours"] == 0, s)
    # boutons dessinés sur la borne : un clic sur A lance le jeu
    pg.evaluate("localStorage.clear()")
    box = pg.locator("#pupitre").bounding_box()
    ax, ay = pg.evaluate("[PUPITRES.grand.a.x, PUPITRES.grand.a.y]")
    pg.mouse.click(box["x"] + box["width"] * ax / 1024, box["y"] + box["height"] * ay / 1536); pg.wait_for_timeout(200)
    check("clic sur le bouton A de la borne grand écran : la partie commence", st(pg)["etat"] == "jeu", st(pg))
    pg.screenshot(path="/tmp/bataille-e2e.png")
    check("pas d'erreur JS", not errs, errs); b.close()
print(f"\n{sum(res)}/{len(res)}")
