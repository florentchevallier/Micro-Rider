import sys
from playwright.sync_api import sync_playwright
MOCK = open('/home/claude/mr/tests/mock_ble.js').read()
URL = "http://localhost:8765/code/micro-rider.html"
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 1400, "height": 900}); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.add_init_script(MOCK); pg.goto(URL); pg.wait_for_timeout(1500)
    check("premier lancement : aucun appareil mémorisé", pg.text_content("#mTrainer") == "aucun" and pg.is_disabled("#oTrainer"))
    check("premier lancement : pas de reconnexion automatique", pg.evaluate("window.__opts.length") == 0 and not pg.evaluate("MR.click.CK.connecte"))
    # --- premières connexions par la liste de choix
    pg.evaluate("window.__next='hub'"); pg.click("#bTrainer"); pg.wait_for_timeout(800)
    pg.evaluate("window.__next='hr'"); pg.click("#bFc"); pg.wait_for_timeout(800)
    pg.evaluate("window.__next='click'"); pg.click("#bClick"); pg.wait_for_timeout(800)
    check("connexions par la liste : 3 requêtes de choix", pg.evaluate("window.__opts.length") == 3, pg.evaluate("window.__opts.length"))
    check("noms mémorisés affichés dans les options", pg.text_content("#mTrainer") == "Zwift Hub" and pg.text_content("#mCardio") == "HW9 20937" and pg.text_content("#mClick") == "Zwift Click", (pg.text_content("#mTrainer"), pg.text_content("#mCardio")))
    # --- reconnexion d'un clic, sans la liste
    pg.click("#bTrainer"); pg.wait_for_timeout(500)                       # déconnecte
    check("déconnexion volontaire du trainer", pg.evaluate("bTrainer.className") == "conn")
    n = pg.evaluate("window.__opts.length"); pg.click("#bTrainer"); pg.wait_for_timeout(900)
    check("reconnexion d'un clic : sans rouvrir la liste de choix", pg.evaluate("window.__opts.length") == n and pg.evaluate("bTrainer.className") == "conn ok", (pg.evaluate("window.__opts.length"), n))
    check("journal : reconnexion à l'appareil mémorisé", "Reconnexion au trainer mémorisé" in pg.evaluate("journal.textContent"))
    # --- rechargement : reconnexion automatique de tout
    pg.goto(URL); pg.wait_for_timeout(3500)
    check("rechargement : trainer, cardio et Click reconnectés tout seuls", pg.evaluate("[bTrainer.className, bFc.className, bClick.className]") == ["conn ok", "conn ok", "conn ok"], pg.evaluate("[bTrainer.className, bFc.className, bClick.className]"))
    check("rechargement : aucune liste de choix ouverte", pg.evaluate("window.__opts.length") == 0)
    j = pg.evaluate("journal.textContent")
    check("journal : appareils autorisés comptés", "déjà autorisés pour cette page : 3" in j, j[:400])
    # --- appareil absent : la reconnexion directe échoue, le clic suivant ouvre la liste
    pg.click("#bTrainer"); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.setItem('__fail', 'id-Zwift Hub')")
    pg.click("#bTrainer"); pg.wait_for_timeout(900)
    check("appareil mémorisé muet : message clair, pas de connexion", pg.evaluate("bTrainer.className") == "conn" and "mémorisé ne répond pas" in pg.inner_text("#info"), pg.inner_text("#info"))
    pg.evaluate("localStorage.removeItem('__fail')"); pg.evaluate("window.__next='hub'"); n = pg.evaluate("window.__opts.length")
    pg.click("#bTrainer"); pg.wait_for_timeout(900)
    check("clic suivant : la liste de choix s'ouvre", pg.evaluate("window.__opts.length") == n + 1 and pg.evaluate("bTrainer.className") == "conn ok", (pg.evaluate("window.__opts.length"), n))
    # --- oublier
    pg.evaluate("document.getElementById('optAppareils').open = true")
    pg.click("#oTrainer"); pg.wait_for_timeout(100)
    check("oublier : nom effacé", pg.text_content("#mTrainer") == "aucun" and pg.is_disabled("#oTrainer"))
    pg.click("#bTrainer"); pg.wait_for_timeout(400); n = pg.evaluate("window.__opts.length"); pg.click("#bTrainer"); pg.wait_for_timeout(900)
    check("après oubli : le clic rouvre la liste", pg.evaluate("window.__opts.length") == n + 1, (pg.evaluate("window.__opts.length"), n))
    # --- réglage de reconnexion automatique
    pg.evaluate("document.getElementById('optAppareils').open = true"); pg.uncheck("#btAuto"); pg.evaluate("Object.keys(localStorage).length"); pg.wait_for_timeout(300); pg.goto(URL); pg.wait_for_timeout(3000)
    check("reconnexion automatique désactivée : rien ne se connecte", pg.evaluate("[bFc.className, bClick.className]") == ["conn", "conn"], pg.evaluate("[bFc.className, bClick.className]"))
    check("la case reste décochée après rechargement", not pg.evaluate("btAuto.checked"), pg.evaluate("[btAuto.checked, localStorage.getItem('micro-rider.btAuto'), Object.keys(localStorage)]"))
    # --- navigateur sans getDevices
    pg.evaluate("localStorage.setItem('__nogd', '1')"); pg.evaluate("document.getElementById('optAppareils').open = true"); pg.check("#btAuto"); pg.evaluate("Object.keys(localStorage).length"); pg.wait_for_timeout(300); pg.goto(URL); pg.wait_for_timeout(2000)
    check("sans getDevices : message d'information, pas de plantage", "ne permet pas de se reconnecter" in pg.text_content("#infoAppareils") and "ne retrouve pas" in pg.evaluate("journal.textContent"), pg.text_content("#infoAppareils"))
    n = pg.evaluate("window.__opts.length"); pg.evaluate("window.__next='hr'"); pg.click("#bFc"); pg.wait_for_timeout(800)
    check("sans getDevices : le clic ouvre la liste comme avant", pg.evaluate("window.__opts.length") == n + 1 and pg.evaluate("bFc.className") == "conn ok")
    check("aucune erreur JavaScript", not errs, errs)
    b.close()
print(sum(res), "OK,", len(res) - sum(res), "KO"); sys.exit(0 if all(res) else 1)
