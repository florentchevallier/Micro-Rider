# Séances .zwo d'un dépôt GitHub : bouton, liste (API mockée), groupe dans la liste, chargement paresseux, mémorisation, erreurs.
from playwright.sync_api import sync_playwright
URL = "http://localhost:8765/code/micro-rider.html"
ok = ko = 0
def check(nom, cond, detail=""):
    global ok, ko
    if cond: ok += 1; print("OK ", nom)
    else: ko += 1; print("KO ", nom, "->", detail)
ZWO = "<workout_file><name>Test Pyramid</name><workout><Warmup Duration='120' PowerLow='0.5' PowerHigh='0.75'/><SteadyState Duration='300' Power='0.9'/><Cooldown Duration='60' PowerLow='0.7' PowerHigh='0.4'/></workout></workout_file>"
ARBRE = {"tree": [{"path": "Active_Recovery.zwo", "type": "blob"}, {"path": "Sufferfest - There Is No Try (joth).zwo", "type": "blob"}, {"path": "README.md", "type": "blob"}, {"path": "dossier", "type": "tree"}]}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []; reqs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    def api(route):
        reqs.append(route.request.url); route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=__import__("json").dumps(ARBRE))
    def raw(route):
        reqs.append(route.request.url); route.fulfill(status=200, content_type="text/plain", headers={"access-control-allow-origin": "*"}, body=ZWO)
    pg.route("https://api.github.com/**", api); pg.route("https://raw.githubusercontent.com/**", raw)
    pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1000)
    pg.evaluate("document.querySelector('#bReglages').click()"); pg.wait_for_timeout(200)
    check("bouton « Zwift workouts (GitHub) » présent", pg.is_visible("#bGithub") and "GitHub" in pg.inner_text("#bGithub"))
    pg.click("#bGithub"); pg.wait_for_timeout(600)
    opts = pg.evaluate("[...document.querySelectorAll('#seance optgroup option')].map(o => o.textContent)")
    check("liste : seulement les .zwo, sans l'extension, dans un groupe GitHub", opts == ["Active_Recovery", "Sufferfest - There Is No Try (joth)"], opts)
    check("groupe nommé d'après le dépôt", "bdcheung/zwift_workouts" in pg.evaluate("document.querySelector('#seance optgroup').label"))
    check("un seul appel API, aucun téléchargement avant le choix", len(reqs) == 1 and "api.github.com" in reqs[0], reqs)
    check("bouton : compteur affiché", "(2)" in pg.inner_text("#bGithub"), pg.inner_text("#bGithub"))
    pg.select_option("#seance", "github:Sufferfest - There Is No Try (joth).zwo"); pg.wait_for_timeout(600)
    check("choix : fichier téléchargé (nom encodé) et séance chargée", len(reqs) == 2 and "Sufferfest%20-%20There%20Is%20No%20Try%20(joth).zwo" in reqs[1] and pg.evaluate("MR.lecteur.seance && MR.lecteur.seance.nom") != "", reqs)
    check("séance lue : 8 min (120 + 300 + 60 s)", pg.evaluate("Math.round(MR.lecteur.seance.duree)") == 480, pg.evaluate("MR.lecteur.seance && MR.lecteur.seance.duree"))
    check("nom affiché = nom du fichier", pg.evaluate("document.querySelector('#seance').selectedOptions[0].textContent") == "Sufferfest - There Is No Try (joth)")
    pg.reload(); pg.wait_for_timeout(1500)
    check("rechargement : liste mémorisée et séance GitHub rechargée", pg.evaluate("document.querySelectorAll('#seance optgroup option').length") == 2 and pg.evaluate("MR.lecteur.seance && Math.round(MR.lecteur.seance.duree)") == 480)
    # erreurs réseau : limite de débit
    pg.unroute("https://api.github.com/**"); pg.route("https://api.github.com/**", lambda r: r.fulfill(status=403, body="{}", headers={"access-control-allow-origin": "*"}))
    pg.evaluate("document.querySelector('#bReglages').getAttribute('aria-expanded') === 'true' || document.querySelector('#bReglages').click()"); pg.click("#bGithub"); pg.wait_for_timeout(600)
    check("limite de débit : message clair, bouton réutilisable", "rate limit" in pg.inner_text("#info") and not pg.is_disabled("#bGithub"), pg.inner_text("#info"))
    check("pas d'erreur JS", not errs, errs)
    b.close()
print(f"\n{ok}/{ok+ko}")
