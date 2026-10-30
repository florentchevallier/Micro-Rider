# Zoom réglable et progressif du graphique de séance ; bouton plein écran.
from playwright.sync_api import sync_playwright
MOCK = open('/home/claude/mr/tests/mock_ble.js').read()
URL = "http://localhost:8765/code/micro-rider.html"
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1440, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.add_init_script(MOCK); pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1500)
    check("zoom : valeur par défaut 50 %", pg.input_value("#zoom") == "50" and pg.text_content("#zoomVal") == "50 %")
    pg.click("[data-zoom='33']"); check("raccourci 1/3 : 33 % mémorisé", pg.input_value("#zoom") == "35" or pg.input_value("#zoom") == "33", pg.input_value("#zoom"))
    pg.evaluate("document.getElementById('zoom').value = 60; document.getElementById('zoom').dispatchEvent(new Event('input'))")
    check("curseur : 60 % affiché et mémorisé", pg.text_content("#zoomVal") == "60 %" and pg.evaluate("localStorage.getItem('micro-rider.zoom')") == "60")
    pg.click("[data-zoom='70']"); check("raccourci 70 %", pg.text_content("#zoomVal") == "70 %")
    pg.click("[data-zoom='50']"); check("raccourci 1/2", pg.text_content("#zoomVal") == "50 %")
    pg.reload(); pg.wait_for_timeout(1200); check("zoom mémorisé après rechargement", pg.input_value("#zoom") == "50")
    # zoom progressif : 0 avant le départ, monte en ~3 s, reste en pause, redescend à la fin
    pg.select_option("#seance", "demo"); pg.wait_for_timeout(300)
    z0 = pg.evaluate("MR.promenade().etatZoom()"); check("avant le démarrage : pas de zoom", z0 == 0, z0)
    pg.click("#bDemarrer"); pg.wait_for_timeout(1000); z1 = pg.evaluate("MR.promenade().etatZoom()")
    pg.wait_for_timeout(3000); z2 = pg.evaluate("MR.promenade().etatZoom()")
    check("au démarrage : le zoom monte progressivement (partiel après 1 s, complet après 4 s)", 0.15 < z1 < 0.6 and z2 == 1, (z1, z2))
    pg.click("#bDemarrer"); pg.wait_for_timeout(500); check("en pause : le zoom reste", pg.evaluate("MR.promenade().etatZoom()") == 1)
    pg.click("#bDemarrer"); pg.wait_for_timeout(300)
    pg.click("#bArreter"); pg.wait_for_timeout(1000); z3 = pg.evaluate("MR.promenade().etatZoom()")
    pg.wait_for_timeout(3000); check("arrêt : le zoom redescend progressivement à 0", 0 < z3 < 1 and pg.evaluate("MR.promenade().etatZoom()") == 0, z3)
    # plein écran
    check("bouton plein écran présent", pg.is_visible("#bPleinEcran") and pg.text_content("#bPleinEcran") == "⤢ Plein écran")
    pg.click("#bPleinEcran"); pg.wait_for_timeout(600)
    plein = pg.evaluate("!!document.fullscreenElement"); check("clic : la page passe en plein écran, bouton « Quitter »", plein and "Quitter" in pg.text_content("#bPleinEcran"), pg.text_content("#bPleinEcran"))
    pg.click("#bPleinEcran"); pg.wait_for_timeout(600); check("second clic : retour à la fenêtre", not pg.evaluate("!!document.fullscreenElement") and pg.text_content("#bPleinEcran") == "⤢ Plein écran")
    check("pas d'erreur JS", not errs, errs); b.close()
print(f"\n{sum(res)}/{len(res)}")
