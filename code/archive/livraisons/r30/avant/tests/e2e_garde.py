# Garde du Click (refus du Hub) et reprise du contrôle du trainer après « non autorisé ».
from playwright.sync_api import sync_playwright
MOCK = open('/home/claude/mr/tests/mock_ble.js').read()
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1400, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.add_init_script(MOCK); pg.goto("file:///home/claude/mr/code/micro-rider.html"); pg.wait_for_timeout(2000)
    pg.evaluate("window.__next='hub'"); pg.click("#bTrainer"); pg.wait_for_timeout(1500)
    # 1) le chooser renvoie le Hub à la place du Click
    pg.evaluate("window.__next='hub'"); pg.click("#bClick"); pg.wait_for_timeout(1200)
    j = pg.evaluate("journal.textContent")
    check("requête Click : le Hub est exclu du sélecteur", "exclusionFilters" in pg.evaluate("window.__opts[window.__opts.length-1]"))
    check("Hub refusé comme Click", "c'est le trainer, pas le Click" in j, j[-400:])
    check("aucun RideOn envoyé au Hub", pg.evaluate("window.__cwrites.length") == 0)
    check("Click non connecté", not pg.evaluate("Click.CK.connecte"))
    # 2) le vrai Click passe ensuite
    pg.evaluate("window.__next='click'"); pg.click("#bClick"); pg.wait_for_timeout(1200)
    check("vrai Click accepté après refus", pg.evaluate("Click.CK.connecte"))
    # 3) perte de contrôle : le trainer répond 05 jusqu'à nouvelle demande de contrôle
    n0 = len(pg.evaluate("window.__writes"))
    pg.evaluate("window.__deny=true"); pg.evaluate("MR.fixerRapport(3,'test')"); pg.wait_for_timeout(3500)
    w = pg.evaluate("window.__writes")[n0:]
    ops = [x[0] for x in w]
    check("après « non autorisé » : Request Control renvoyé", 0 in ops, ops)
    check("puis consigne de pente renvoyée (0x11 après 0x00)", 0 in ops and 0x11 in ops[ops.index(0):], ops)
    j = pg.evaluate("journal.textContent")
    check("journal : contrôle retrouvé", "Contrôle du trainer retrouvé" in j)
    check("pas d'erreur JS", not errs, errs)
    b.close()
print(f"\n{sum(res)}/{len(res)}")
