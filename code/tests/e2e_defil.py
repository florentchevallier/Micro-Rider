from playwright.sync_api import sync_playwright
MOCK = open('/home/claude/mr/tests/mock_ble.js').read()
URL = "http://localhost:8765/code/micro-rider.html"
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
def dist(pg, coef):
    pg.evaluate("localStorage.setItem('micro-rider.defilement', '%s')" % coef)
    pg.goto(URL); pg.wait_for_timeout(800)
    pg.evaluate("window.MR.sim && 0")
    return pg
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.add_init_script(MOCK); pg.goto(URL); pg.wait_for_timeout(800)
    check("défaut : réel (0)", pg.input_value("#defilement") == "0")
    opts = pg.evaluate("[...document.querySelectorAll('#defilement option')].map(o=>o.value)")
    check("options 0…100 par 20", opts == [str(v) for v in range(0, 101, 20)], opts)
    pg.select_option("#defilement", "100"); pg.wait_for_timeout(200)
    check("valeur mémorisée", pg.evaluate("localStorage.getItem('micro-rider.defilement')") == "100")
    pg.goto(URL); pg.wait_for_timeout(800)
    check("valeur restaurée après rechargement", pg.input_value("#defilement") == "100")
    def parcours(coef):
        pg.evaluate("localStorage.setItem('micro-rider.defilement', '%s')" % coef); pg.evaluate("localStorage.length"); pg.wait_for_timeout(400); pg.goto(URL); pg.wait_for_timeout(800)
        check("coef %s bien appliqué" % coef, pg.evaluate("MR.defilement()") == int(coef))
        pg.evaluate("MR.sim.puissance = 200; MR.sim.cadence = 85"); pg.wait_for_timeout(6000)
        return pg.evaluate("[MR.valeurs().distance, MR.etat.d + MR.etat.bonusD]")
    d0, r0 = parcours("0"); d100, r100 = parcours("100")
    check("coef 0 : le décor suit la distance réelle", abs(d0 - r0) < 0.05 * max(r0, 1) + 3, (d0, r0))
    check("coef +100 % : le décor avance ~2x plus", 1.8 < d100 / max(r100, 0.1) < 2.2, (d100, r100))
    check("la distance réelle (physique) ne change pas avec le coef", abs(r100 - r0) < 0.15 * r0, (r0, r100))
    check("aucune erreur JavaScript", not errs, errs)
    b.close()
print(sum(res), "OK,", len(res) - sum(res), "KO")
