from playwright.sync_api import sync_playwright
MOCK = open('/home/claude/mr/tests/mock_ble.js').read()
URL = "http://localhost:8765/code/micro-rider.html"
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
FTMS = lambda w, rpm: "[0x44,0x00,0xC4,0x09,%d,0x00,%d,%d]" % (rpm * 2, w & 255, w >> 8)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1400, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.add_init_script(MOCK); pg.goto(URL); pg.wait_for_timeout(1000)
    pg.evaluate("window.__next='hub'"); pg.click("#bTrainer"); pg.wait_for_timeout(1200)
    pg.evaluate("window.__iv = setInterval(()=>__m.emit(__m.bike,%s), 250)" % FTMS(150, 60)); pg.wait_for_timeout(1500)
    check("sans capteur : cadence du Hub (60)", abs(pg.evaluate("MR.valeurs().cadence") - 60) < 1, pg.evaluate("MR.valeurs().cadence"))
    check("bouton « Connecter la cadence » présent", "cadence" in pg.inner_text("#bCad").lower())
    # --- connexion du capteur de cadence
    pg.evaluate("window.__next='cad'"); pg.click("#bCad"); pg.wait_for_timeout(1000)
    check("capteur connecté : bouton vert avec son nom", pg.evaluate("bCad.className") == "conn ok" and "Wahoo CADENCE" in pg.inner_text("#bCad"), pg.inner_text("#bCad"))
    check("la requête demande le service vitesse/cadence 0x1816", '"services":[6166]' in pg.evaluate("window.__opts[window.__opts.length-1]").replace(" ", ""), pg.evaluate("window.__opts[window.__opts.length-1]"))
    check("curseur de cadence simulée grisé", pg.evaluate("sC.disabled"))
    check("appareil retenu en mémoire", pg.text_content("#mCadence") == "Wahoo CADENCE" and not pg.is_disabled("#oCadence"), pg.text_content("#mCadence"))
    # 2 tours par 1,5 s = 80 tr/min : paquets toutes les 400 ms avec compteurs cohérents
    pg.evaluate("""window.__t = 0; window.__rev = 100; window.__tm = 1000;
      window.__ivc = setInterval(()=>{ window.__rev += 1; window.__tm = (window.__tm + 768) % 65536; __m.emit(__m.csc,[0x02, window.__rev & 255, window.__rev >> 8, window.__tm & 255, window.__tm >> 8]); }, 500)""")
    pg.wait_for_timeout(2600)
    v = pg.evaluate("MR.valeurs().cadence")
    check("capteur prioritaire : cadence 80 (le Hub dit 60)", abs(v - 80) < 1, v)
    check("l'animation suit la cadence du capteur", abs(pg.evaluate("MR.valeurs().cadenceAnim") - 80) < 1)
    pg.evaluate("clearInterval(window.__ivc)"); pg.wait_for_timeout(3200)
    check("capteur muet > 2,5 s : cadence 0 (arrêt de pédalage détecté)", pg.evaluate("MR.valeurs().cadence") == 0, pg.evaluate("MR.valeurs().cadence"))
    check("puissance toujours celle du Hub", abs(pg.evaluate("MR.valeurs().puissance") - 150) < 1)
    # --- déconnexion : le Hub reprend la main
    pg.click("#bCad"); pg.wait_for_timeout(500)
    check("déconnecté : bouton revenu à « Connecter »", pg.evaluate("bCad.className") == "conn", pg.evaluate("bCad.className"))
    check("déconnecté : la cadence du Hub reprend (60)", abs(pg.evaluate("MR.valeurs().cadence") - 60) < 1, pg.evaluate("MR.valeurs().cadence"))
    # --- capteur de vitesse de roue seul : refusé
    pg.evaluate("document.getElementById('optAppareils').open = true"); pg.click("#oCadence"); pg.wait_for_timeout(100)
    pg.evaluate("window.__next='cadroue'"); pg.click("#bCad"); pg.wait_for_timeout(1000)
    check("capteur de roue seul : refusé avec un message clair", pg.evaluate("bCad.className") == "conn" and "vitesse de roue" in pg.inner_text("#info"), (pg.evaluate("bCad.className"), pg.inner_text("#info")))
    # --- reconnexion automatique au rechargement
    pg.evaluate("localStorage.length"); pg.wait_for_timeout(300)
    pg.evaluate("window.__next='cad'"); pg.click("#bCad"); pg.wait_for_timeout(800)
    check("reconnexion manuelle par la liste (après avoir oublié)", pg.evaluate("bCad.className") == "conn ok" and pg.text_content("#mCadence") == "Wahoo CADENCE", (pg.evaluate("bCad.className"), pg.text_content("#mCadence"), pg.inner_text("#info")))
    pg.evaluate("localStorage.length"); pg.wait_for_timeout(400)
    pg.goto(URL); pg.wait_for_timeout(3000)
    check("rechargement : capteur de cadence reconnecté tout seul", pg.evaluate("bCad.className") == "conn ok", pg.evaluate("bCad.className"))
    check("aucune erreur JavaScript", not errs, errs)
    b.close()
print(sum(res), "OK,", len(res) - sum(res), "KO")
