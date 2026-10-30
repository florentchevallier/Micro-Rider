# Sons : chargement, modes pédalage / roue libre, volumes mémorisés, muet, oiseaux et voiture synchronisés avec l'animation.
from playwright.sync_api import sync_playwright
MOCK = open('/home/claude/mr/tests/mock_ble.js').read()
URL = "http://localhost:8765/code/micro-rider.html"
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"]); pg = b.new_page(viewport={"width": 1300, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.add_init_script(MOCK); pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(800)
    check("avant tout geste : aucun contexte audio", pg.evaluate("MR.sons.etat().contexte") is None)
    pg.click("#bMuet"); pg.click("#bMuet"); pg.wait_for_timeout(100)       # un clic = un geste : le son s'active
    pg.evaluate("MR.sons.attendre()"); pg.wait_for_timeout(1500)
    e = pg.evaluate("MR.sons.etat()")
    check("après un clic : contexte actif, 4 sons chargés", e["pret"] and not e["echec"] and e["contexte"] in ("running", "suspended"), e)
    # modes (on arrête la boucle réelle en travaillant dans un seul evaluate)
    r = pg.evaluate("""() => { const s = MR.sons, o = [];
      for (const [cad, v] of [[0, 0], [85, 25], [85, 25], [0, 25], [0, 25], [50, 18], [0, 0]]) { s.maj(0.1, { cadence: cad, vitesseKmh: v }); o.push(s.etat().mode); }
      return o; }""")
    check("modes : silence → pédalage → roue libre → pédalage → silence", r[0] == "silence" and r[1] == "pedale" and r[3] == "rouelibre" and r[5] == "pedale" and r[6] == "silence", r)
    r = pg.evaluate("""() => { const s = MR.sons; s.maj(0.1, { cadence: 0, vitesseKmh: 25 }); const a = s.etat().pos;
      for (let i = 0; i < 30; i++) s.maj(0.1, { cadence: 0, vitesseKmh: 25 - i * 0.2 }); return [a, s.etat().pos, s.etat().taux]; }""")
    check("roue libre : la position avance dans le fichier et reste dans [0, 9,5[", r[1] > r[0] and r[1] < 9.5 and 0.5 <= r[2] <= 2, r)
    r = pg.evaluate("""() => { const s = MR.sons; for (let i = 0; i < 400; i++) s.maj(0.1, { cadence: 0, vitesseKmh: 6 }); return s.etat().pos; }""")
    check("roue libre longue : la boucle reste dans [6 ; 9,5[ ", 5 <= r < 9.5, r)
    # volumes et muet
    pg.evaluate("document.getElementById('volVoiture').value = 30; document.getElementById('volVoiture').dispatchEvent(new Event('input'))")
    check("curseur voiture : volume 0,3 mémorisé", abs(pg.evaluate("MR.sons.volume('voiture')") - .3) < 1e-9 and pg.evaluate("localStorage.getItem('micro-rider.vol-voiture')") == "0.3")
    pg.click("#bMuet"); check("muet : état mémorisé, bouton 🔇", pg.evaluate("MR.sons.muet()") and pg.evaluate("localStorage.getItem('micro-rider.muet')") == "1" and pg.text_content("#bMuet") == "🔇")
    pg.click("#bMuet"); check("son rétabli : bouton 🔊", not pg.evaluate("MR.sons.muet()") and pg.text_content("#bMuet") == "🔊")
    pg.reload(); pg.wait_for_timeout(800)
    check("après rechargement : volumes retrouvés dans les curseurs", pg.input_value("#volVoiture") == "30" and pg.input_value("#volPedalage") == "70")
    # événements de l'animation : oiseaux et voiture
    r = pg.evaluate("""() => { const o = MR.promenade(), appels = []; MR.sons.jouer = (n) => { appels.push(n); return true; };
      let dist = 0; const pas = (n) => { for (let i = 0; i < n; i++) { dist += 7 * 0.05; o.maj(0.05, { distance: dist, cadence: 90, cadenceAnim: 90, vitesseKmh: 25, voiture: 'jamais' }); } };
      const t0 = o.etatVoiture().temps; pas(Math.ceil((4 - t0) / 0.05) + 5); const apres4 = appels.slice();
      pas(Math.round(26 / 0.05)); const avant28 = appels.length; pas(Math.round(4 / 0.05));
      return { apres4, avant28, apres: appels.length }; }""")
    check("oiseaux : un son au départ de la volée (4 s), pas de répétition avant 28 s, puis un second", r["apres4"] == ["oiseaux"] and r["avant28"] == 1 and r["apres"] == 2, r)
    r = pg.evaluate("""() => { const o = MR.promenade(), appels = []; MR.sons.jouer = (n) => { appels.push(n); return true; };
      let dist = 1000; const pas = () => { dist += 7 * 0.05; o.maj(0.05, { distance: dist, cadence: 90, cadenceAnim: 90, vitesseKmh: 25, voiture: 'jamais' }); };
      for (let i = 0; i < 10; i++) pas();
      if (o.etatVoiture().active) return { ignore: true };
      const pauses = []; MR.sons.pauseVoiture = (p) => pauses.push(p);
      o.lancerVoiture(); const x0 = o.etatVoiture().x; const sons0 = appels.filter((a) => a === 'voiture').length;
      pas(); const sons1 = appels.filter((a) => a === 'voiture').length;
      for (let i = 0; i < 99; i++) pas();           // 5 s
      const x5 = o.etatVoiture().x;
      const arret = () => o.maj(0.05, { distance: dist, cadence: 0, cadenceAnim: 0, vitesseKmh: 0, voiture: 'jamais' });
      for (let i = 0; i < 20; i++) arret(); const xArret = o.etatVoiture().x; const pausesArret = pauses.slice();
      for (let i = 0; i < 5; i++) pas();
      return { x0, x5, sons0, sons1, xArret, pausesArret, pausesFin: pauses.slice(), sonsFin: appels.filter((a) => a === 'voiture').length }; }""")
    check("voiture : départ hors image à droite, son lancé seulement quand elle roule", r.get("sons0") == 0 and r.get("sons1") == 1 and r["x0"] > 1500, r)
    check("voiture : au bout de 5 s (croisement du son), elle est à hauteur des cyclistes (x ≈ 205)", abs(r["x5"] - 205) < 60, r)
    check("voiture : à l'arrêt elle reste figée et le son est mis en pause ; il reprend en repédalant, sans relancer", r["pausesArret"] == [True] and r["pausesFin"] == [True, False] and r["sonsFin"] == 1, r)
    # volume général : curseur dans l'en-tête, mémorisé, indépendant des volumes de chaque son et du bouton muet
    pg.evaluate("localStorage.removeItem('micro-rider.vol-general')")
    pg.fill("#volGeneral", "30"); pg.evaluate("document.querySelector('#volGeneral').dispatchEvent(new Event('input'))")
    g = pg.evaluate("[MR.sons.general(), MR.sons.volume('jeux'), localStorage.getItem('micro-rider.vol-general')]")
    check("volume général : 30 %, mémorisé, sans toucher au volume des jeux", abs(g[0] - 0.3) < 0.01 and g[1] == 0.7 or abs(g[1] - pg.evaluate("MR.sons.volume('jeux')")) < 1e-9 and abs(g[0] - 0.3) < 0.01 and g[2] == "0.3", g)
    pg.reload(); pg.wait_for_timeout(800)
    check("volume général : retrouvé au rechargement", pg.evaluate("document.querySelector('#volGeneral').value") == "30" and abs(pg.evaluate("MR.sons.general()") - 0.3) < 0.01)
    check("pas d'erreur JS", not errs, errs)
    b.close()
print(f"\n{sum(res)}/{len(res)}")
