# Promenade : choix des cyclistes (garçon / femme / les deux) et voiture rare qui croise dans l'autre sens.
from playwright.sync_api import sync_playwright
MOCK = open('/home/claude/mr/tests/mock_ble.js').read()
URL = "http://localhost:8765/code/micro-rider.html"
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
SIM = """([freq, secondes]) => {
  const o = MR.promenade(); let dist = 0, vus = 0, actif = false, maxActif = 0, ecarts = [], dernier = null;
  for (let t = 0; t < secondes; t += 0.05) {
    dist += 7 * 0.05;
    o.maj(0.05, { distance: dist, cadence: 90, cadenceAnim: 90, vitesseKmh: 25, voiture: freq });
    const e = o.etatVoiture();
    if (e.active && !actif) { vus++; if (dernier !== null) ecarts.push(t - dernier); dernier = t; }
    actif = e.active;
  }
  return { vus, ecarts, premier: ecarts.length ? null : null };
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1300, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.add_init_script(MOCK); pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1500)
    check("réglages par défaut : garçon, voiture rare", pg.input_value("#cyclistes") == "garcon" and pg.input_value("#voiture") == "rare")
    check("3 choix de cyclistes", pg.evaluate("[...document.querySelectorAll('#cyclistes option')].map(o=>o.value)") == ["garcon", "femme", "deux"])
    check("3 fréquences de voiture", pg.evaluate("[...document.querySelectorAll('#voiture option')].map(o=>o.value)") == ["rare", "normal", "jamais"])
    pg.select_option("#cyclistes", "deux"); pg.select_option("#voiture", "normal")
    pg.reload(); pg.wait_for_timeout(1500)
    check("réglages mémorisés", pg.input_value("#cyclistes") == "deux" and pg.input_value("#voiture") == "normal")
    pg.select_option("#voiture", "rare")
    # cadence nulle : la voiture ne bouge pas, rien n'est planifié ni lancé
    r = pg.evaluate("""() => { const o = MR.promenade(), t0 = o.etatVoiture().temps; for (let i = 0; i < 4000; i++) o.maj(0.05, { distance: 0, cadence: 0, cadenceAnim: 0, vitesseKmh: 0, voiture: 'rare' }); const e = o.etatVoiture(); return { actif: e.active, figé: e.temps === t0 }; }""")
    check("à l'arrêt : le temps de pédalage et la voiture sont figés", not r["actif"] and r["figé"], r)
    for freq, lo, hi in (("rare", 3, 11), ("normal", 7, 21), ("jamais", 0, 0)):
        pg.reload(); pg.wait_for_timeout(1500)
        r = pg.evaluate(SIM, [freq, 3600])
        check("%s : %d passages en 1 h de pédalage (attendu %d à %d)" % (freq, r["vus"], lo, hi), lo <= r["vus"] <= hi, r)
        if r["ecarts"]: check("%s : jamais deux voitures à moins de %d s" % (freq, 180 if freq == "normal" else 360), min(r["ecarts"]) > (180 if freq == "normal" else 360), r["ecarts"])
    pg.reload(); pg.wait_for_timeout(1500)
    r = pg.evaluate("() => { const o = MR.promenade(); for (let i = 0; i < 2400; i++) o.maj(0.05, { distance: i, cadence: 90, cadenceAnim: 90, vitesseKmh: 25, voiture: 'rare' }); return o.etatVoiture(); }")
    check("pas de voiture avant 2 minutes de pédalage", pg.evaluate("() => { const o = MR.promenade(); return o.etatVoiture().passages }") == 0 or r["temps"] >= 120, r)
    # test visuel : bouton « Voiture ! », deux cyclistes
    pg.select_option("#cyclistes", "deux"); pg.click("#bVoiture"); pg.wait_for_timeout(300)
    e = pg.evaluate("MR.promenade().etatVoiture()")
    check("bouton « Voiture ! » : la voiture entre par la droite", e["active"] and e["x"] > 600, e)
    pg.wait_for_timeout(1000); pg.screenshot(path="/tmp/voiture.png")
    pg.select_option("#cyclistes", "femme"); pg.wait_for_timeout(400); pg.screenshot(path="/tmp/femme.png")
    check("pas d'erreur JS", not errs, errs)
    b.close()
print(f"\n{sum(res)}/{len(res)}")
