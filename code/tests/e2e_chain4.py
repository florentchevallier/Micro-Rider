# Chain Four : clavier, boutons de la borne, adversaire, annulation, sauvegarde, victoire / score, nouvelle partie.
from playwright.sync_api import sync_playwright
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
URL = "http://localhost:8765/code/jeu-chain4.html"
def st(pg): return pg.evaluate("JEU.etat()")
def attendre_ordi(pg):
    for _ in range(40):
        pg.wait_for_timeout(100)
        s = st(pg)
        if s["etat"] != "ia" and not s["enChute"]: return s
    return st(pg)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 700, "height": 1000}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(600)
    check("écran : formats (carré), colonne centrale au départ", st(pg)["colonne"] == 3 and st(pg)["etat"] == "jeu")
    pg.keyboard.press("ArrowLeft"); pg.keyboard.press("ArrowLeft"); pg.keyboard.press("ArrowRight")
    check("gauche / droite : changent la colonne", st(pg)["colonne"] == 2, st(pg))
    for _ in range(10): pg.keyboard.press("ArrowLeft")
    for _ in range(10): pg.keyboard.press("ArrowRight")
    check("la colonne reste dans la grille", st(pg)["colonne"] == 6)
    pg.keyboard.press("ArrowUp"); check("haut : sans effet en Chain Four", st(pg)["historique"] == [])
    pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
    check("Entrée : le pion tombe dans la colonne choisie (6)", st(pg)["historique"] == [6], st(pg))
    s = attendre_ordi(pg)
    check("l'ordinateur répond (2 coups, c'est de nouveau au joueur)", len(s["historique"]) == 2 and s["tour"] == 1 and s["etat"] == "jeu", s)
    pg.keyboard.press("Backspace"); pg.wait_for_timeout(150)
    check("Retour arrière : annule le tour complet", st(pg)["historique"] == [], st(pg))
    pg.keyboard.press("ArrowDown"); s = attendre_ordi(pg)
    check("bas : lâche aussi le pion", len(s["historique"]) == 2, s)
    pg.reload(); pg.wait_for_timeout(700)
    s2 = st(pg)
    check("sauvegarde : la partie est reprise après rechargement", s2["historique"] == s["historique"], (s["historique"], s2["historique"]))
    # commandes dessinées sur la borne (croix, A, B, Start) : clics sur le canevas du pupitre
    pg.wait_for_function("window.PUPITRE !== undefined"); pg.wait_for_timeout(500)
    POS = {"gauche": (300, 977), "droite": (380, 977), "haut": (340, 940), "bas": (340, 1015), "b": (644, 987), "a": (735, 987), "start": (549, 999), "select": (477, 999)}
    def clic(nom):
        r = pg.evaluate("(() => { const b = document.getElementById('pupitre').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; })()")
        x, y = POS[nom]; pg.mouse.click(r[0] + x * r[2] / 1024, r[1] + y * r[3] / 1536)
    clic("droite"); c0 = st(pg)["colonne"]; clic("gauche")
    check("croix de la borne : droite puis gauche déplacent la colonne", st(pg)["colonne"] == c0 - 1, (c0, st(pg)["colonne"]))
    n0 = len(st(pg)["historique"]); clic("a"); s = attendre_ordi(pg)
    check("bouton A : joue", len(s["historique"]) == n0 + 2, s)
    clic("b"); pg.wait_for_timeout(150)
    check("bouton B : annule", len(st(pg)["historique"]) == n0, st(pg))
    clic("bas"); s = attendre_ordi(pg)
    check("croix vers le bas : lâche aussi le pion", len(s["historique"]) == n0 + 2, s)
    clic("b"); pg.wait_for_timeout(150)
    clic("select"); check("Select : sans effet", len(st(pg)["historique"]) == n0 and st(pg)["etat"] == "jeu")
    clic("start"); check("Start : demande confirmation (comme Échap)", st(pg)["etat"] == "confirme")
    pg.keyboard.press("Backspace"); check("Retour : refuse", st(pg)["etat"] == "jeu")
    # touches X / Z, et allumage visuel de la commande tenue
    pg.keyboard.down("ArrowLeft"); pg.wait_for_timeout(60)
    cvs = pg.evaluate("(() => { const c = document.getElementById('pupitre'); return c.toDataURL().length; })()")
    pg.screenshot(path="/tmp/chain4_gauche.png"); pg.keyboard.up("ArrowLeft")
    pg.keyboard.press("x"); s = attendre_ordi(pg); check("touche X = A : joue", len(s["historique"]) == n0 + 2, s)
    pg.keyboard.press("z"); pg.wait_for_timeout(150); check("touche Z = B : annule", len(st(pg)["historique"]) == n0, st(pg))
    # nouvelle partie avec confirmation
    pg.keyboard.press("Escape"); check("Échap : demande confirmation", st(pg)["etat"] == "confirme")
    pg.keyboard.press("Backspace"); check("Retour : refuse, la partie continue", st(pg)["etat"] == "jeu" and len(st(pg)["historique"]) == n0)
    pg.keyboard.press("Escape"); pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
    check("Échap puis Entrée : nouvelle partie", st(pg)["historique"] == [] and st(pg)["etat"] == "jeu")
    # victoire du joueur : partie préparée (0,0,1,1,2,2 -> il joue 3)
    pg.evaluate("localStorage.setItem('micro-rider.jeu.chain4', JSON.stringify({v:1,historique:[0,0,1,1,2,2]}))"); pg.reload(); pg.wait_for_timeout(600)
    for _ in range(3): pg.keyboard.press("ArrowLeft")
    pg.keyboard.press("ArrowRight"); pg.keyboard.press("ArrowRight"); pg.keyboard.press("ArrowLeft"); pg.keyboard.press("ArrowLeft"); pg.keyboard.press("ArrowLeft")
    c = st(pg)["colonne"]
    for _ in range(3 - c): pg.keyboard.press("ArrowRight")
    for _ in range(c - 3): pg.keyboard.press("ArrowLeft")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(900)
    s = st(pg)
    check("victoire : état « fin », gagnant = joueur, score 1-0", s["etat"] == "fin" and s["gagnant"] == 1 and s["score"]["v"] == 1, s)
    pg.screenshot(path="/tmp/chain4_fin.png")
    pg.keyboard.press("Backspace"); pg.wait_for_timeout(150); s = st(pg)
    check("annuler après la victoire : la partie reprend, le score est corrigé", s["etat"] == "jeu" and s["gagnant"] == 0 and s["score"]["v"] == 0, s)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(900); s = st(pg)
    check("rejouer le coup gagnant : score 1-0 à nouveau", s["etat"] == "fin" and s["score"]["v"] == 1, s)
    pg.reload(); pg.wait_for_timeout(600); s = st(pg)
    check("après rechargement : partie terminée et score conservés", s["etat"] == "fin" and s["score"]["v"] == 1, s)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
    check("Entrée sur l'écran de fin : nouvelle partie", st(pg)["historique"] == [] and st(pg)["etat"] == "jeu")
    # reprise « pendant la réflexion » : l'ordinateur joue tout seul
    pg.evaluate("localStorage.setItem('micro-rider.jeu.chain4', JSON.stringify({v:1,historique:[3]}))"); pg.reload(); pg.wait_for_timeout(1500)
    check("partie reprise à l'ordinateur : il joue", len(st(pg)["historique"]) == 2 and st(pg)["etat"] == "jeu", st(pg))
    # colonne pleine
    pg.evaluate("localStorage.setItem('micro-rider.jeu.chain4', JSON.stringify({v:1,historique:[0,0,0,0,0,0]}))"); pg.reload(); pg.wait_for_timeout(600)
    for _ in range(3): pg.keyboard.press("ArrowLeft")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    check("colonne pleine : refusé, rien ne tombe", len(st(pg)["historique"]) == 6 and not st(pg)["enChute"], st(pg))
    # + et - restent libres (rapports) : pas capturés par les jeux
    pg.keyboard.press("+"); check("« + » n'est pas une touche de jeu", len(st(pg)["historique"]) == 6)
    pg.screenshot(path="/tmp/chain4.png")
    check("pas d'erreur JS", not errs, errs)
    b.close()
print(f"\n{sum(res)}/{len(res)}")
