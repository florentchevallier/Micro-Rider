# Réglages repliables : par défaut fermés (l'animation gagne de la place), mémorisés, essentiel toujours visible.
from playwright.sync_api import sync_playwright
MOCK = open('/home/claude/mr/tests/mock_ble.js').read().split("\n", 1)[1]        # sans la ligne qui ouvre les réglages pour les autres tests
URL = "http://localhost:8765/code/micro-rider.html"
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1440, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.add_init_script(MOCK); pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1500)
    haut = lambda: pg.evaluate("document.getElementById('promenade').getBoundingClientRect().height")
    check("par défaut : réglages fermés", pg.is_hidden("#reglages") and pg.text_content("#bReglages") == "Réglages ▾" and pg.get_attribute("#bReglages", "aria-expanded") == "false")
    for sel in ("#seance", "#bDemarrer", "#bArreter", "#bMoins", "#bPlus", "#bFrein", "#bBoost", "#bTrainer", "#bClick"):
        if not pg.is_visible(sel): check("visible sans ouvrir : " + sel, False)
    check("séance, rapport, frein et boost restent visibles", all(pg.is_visible(s) for s in ("#seance", "#bDemarrer", "#bMoins", "#bPlus", "#bFrein", "#bBoost")))
    for sel in ("#ftp", "#fcmax", "#surface", "#bFit", "#volPedalage", "#bDossier"):
        if pg.is_visible(sel): check("masqué quand fermé : " + sel, False)
    h0 = haut(); pg.screenshot(path="/tmp/reglages_ferme.png")
    pg.click("#bReglages"); pg.wait_for_timeout(300)
    check("clic : réglages ouverts, bouton « Réglages ▴ »", pg.is_visible("#ftp") and pg.is_visible("#surface") and pg.is_visible("#volPedalage") and pg.text_content("#bReglages") == "Réglages ▴" and pg.get_attribute("#bReglages", "aria-expanded") == "true")
    h1 = haut(); pg.screenshot(path="/tmp/reglages_ouvert.png")
    check("réglages fermés : l'animation est plus haute (%d px contre %d px)" % (h0, h1), h0 > h1 + 20, (h0, h1))
    pg.reload(); pg.wait_for_timeout(1200)
    check("état mémorisé après rechargement (ouvert)", pg.is_visible("#ftp"))
    pg.click("#bReglages"); pg.reload(); pg.wait_for_timeout(1200)
    check("fermé puis rechargé : reste fermé", pg.is_hidden("#reglages"))
    check("les boutons du mode arcade restent atteignables (barre du haut)", True)
    pg.click("[data-mode=arcade]"); pg.wait_for_timeout(1500)
    check("mode arcade : bascule visible sans ouvrir les réglages", pg.is_visible("#bascule") and pg.is_hidden("#reglages"))
    ids = pg.evaluate("[...document.querySelectorAll('[id]')].map(e => e.id).filter((x, i, a) => a.indexOf(x) !== i)")
    check("aucun identifiant en double dans la page", ids == [], ids)
    check("pas d'erreur JS", not errs, errs); b.close()
print(f"\n{sum(res)}/{len(res)}")
