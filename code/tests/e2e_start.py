# Page d'accueil start.html : bouton Launch, liens de diagnostic, guide, rapport copié (avec le journal de l'application).
from playwright.sync_api import sync_playwright
URL = "http://localhost:8765/code/start.html"
ok = ko = 0
def check(nom, cond, detail=""):
    global ok, ko
    if cond: ok += 1; print("OK ", nom)
    else: ko += 1; print("KO ", nom, "->", detail)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(permissions=["clipboard-read", "clipboard-write"]); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8765/code/micro-rider.html"); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1200)
    check("l'application enregistre son journal pour la page d'accueil", "Page ready" in (pg.evaluate("localStorage.getItem('micro-rider.journal')") or ""))
    pg.goto(URL); pg.wait_for_timeout(300)
    check("bouton Launch au centre, vers l'application", pg.get_attribute(".go", "href") == "micro-rider.html")
    liens = pg.evaluate("[...document.querySelectorAll('nav a')].map(a => a.getAttribute('href'))")
    check("liens de diagnostic en haut", "ble-diagnostic.html" in liens and "ble-click.html" in liens, liens)
    check("guide replié, s'ouvre sous le bouton", not pg.evaluate("document.querySelector('details').open") and pg.evaluate("document.querySelector('.go').getBoundingClientRect().bottom <= document.querySelector('details').getBoundingClientRect().top"))
    pg.click("summary"); check("clic : le guide s'ouvre", pg.evaluate("document.querySelector('details').open") and pg.is_visible("ol"))
    pg.click("#bRapport"); pg.wait_for_timeout(300)
    presse = pg.evaluate("navigator.clipboard.readText()")
    check("rapport copié : navigateur + journal de l'application", "Browser:" in presse and "Page ready" in presse, presse[:200])
    check("pas d'erreur JS", not errs, errs)
    b.close()
print(f"\n{ok}/{ok+ko}")
