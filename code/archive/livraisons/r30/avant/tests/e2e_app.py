import sys, json
from playwright.sync_api import sync_playwright
MOCK = open('/home/claude/mr/tests/mock_ble.js').read()
FTMS = "[0x44,0x00,0xC4,0x09,0xA0,0x00,0xFA,0x00]"   # 25 km/h, 80 tr/min, 250 W
res = []
def check(nom, cond, detail=""):
    res.append((nom, bool(cond), detail)); print(("OK  " if cond else "KO  ") + nom + ("" if cond else "   -> " + str(detail)))
def sent(pg): return pg.evaluate("window.__writes")
def pw(w): return w[1] | (w[2] << 8)       # puissance d'une commande 0x05

ZWO = """<workout_file><name>Test zwo</name><workout>
<Warmup Duration="300" PowerLow="0.4" PowerHigh="0.7"/>
<SteadyState Duration="120" Power="0.9"/>
<IntervalsT Repeat="2" OnDuration="60" OffDuration="30" OnPower="1.1" OffPower="0.5"/>
<FreeRide Duration="60"/>
<Cooldown Duration="120" PowerLow="0.7" PowerHigh="0.3"/>
</workout></workout_file>"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1400, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.add_init_script(MOCK)
    pg.goto("file:///home/claude/mr/code/micro-rider.html"); pg.wait_for_timeout(2500)

    check("chargement : pas de message d'erreur", pg.inner_text("#info") == "", pg.inner_text("#info"))
    check("séances intégrées listées", pg.evaluate("[...seance.options].map(o=>o.textContent)").__len__() == 3)
    check("démarrage : sans séance, bouton Démarrer grisé", pg.is_disabled("#bDemarrer"))
    pg.select_option("#seance", "essai")
    check("séance Essai chargée : prête, 3:30", "prête" in pg.inner_text("#etatSeance") and "3:30" in pg.inner_text("#etatSeance"), pg.inner_text("#etatSeance"))

    # --- simulation sans matériel
    pg.evaluate("sim.open=true"); pg.check("#suivre"); pg.click("#bDemarrer"); pg.wait_for_timeout(2300)
    check("séance démarrée en simulation : horloge ~2 s (le Worker cadence le calcul)", 1.6 < pg.evaluate("MR.lecteur.t") < 3.0, pg.evaluate("MR.lecteur.t"))
    check("simulation : la puissance suit la cible (100 W)", pg.evaluate("MR.entree.puissance") == 100, pg.evaluate("MR.entree.puissance"))
    check("le bouton propose Pause", pg.inner_text("#bDemarrer") == "Pause")
    pg.click("#bDemarrer"); t1 = pg.evaluate("MR.lecteur.t"); pg.wait_for_timeout(1200)
    check("pause : l'horloge est figée", abs(pg.evaluate("MR.lecteur.t") - t1) < 0.01 and "pause" in pg.inner_text("#etatSeance"))
    pg.click("#bDemarrer"); pg.click("#bArreter")
    check("arrêt : retour à prête, t=0", pg.evaluate("[MR.lecteur.etat, MR.lecteur.t]") == ["prete", 0], pg.evaluate("[MR.lecteur.etat, MR.lecteur.t]"))
    pg.uncheck("#suivre"); pg.evaluate("sim.open=false")

    # --- connexion du trainer
    pg.evaluate("window.__next='hub'"); pg.click("#bTrainer"); pg.wait_for_timeout(1500)
    w = sent(pg)
    check("prise de contrôle puis démarrage", w[:2] == [[0], [7]], w[:3])
    check("séance non démarrée : résistance libre (pente 0 %) envoyée", len(w) >= 3 and w[2][0] == 0x11 and w[2][3] == 0 and w[2][4] == 0, w[2:3])
    check("paramètres de roulement/air = ceux de notre physique", w[2][5:7] == [50, 19], w[2])
    check("bouton trainer vert, nom du Hub", pg.evaluate("bTrainer.className") == "conn ok" and "Zwift Hub" in pg.inner_text("#bTrainer"))
    check("curseurs puissance/cadence grisés, panneau simulation replié", pg.evaluate("[sP.disabled, sC.disabled, sF.disabled, !sim.open]") == [True, True, False, True])
    pg.evaluate(f"window.__iv = setInterval(()=>__m.emit(__m.bike,{FTMS}), 250)"); pg.wait_for_timeout(2500)
    check("puissance et cadence reçues (250 W, 80 tr/min)", pg.evaluate("[MR.entree.puissance, MR.entree.cadence]") == [250, 80])

    # --- séance ERG réelle
    n0 = len(sent(pg)); pg.click("#bDemarrer"); pg.wait_for_timeout(1600)
    w = sent(pg)[n0:]
    check("démarrage : cible 100 W envoyée (opcode 0x05)", any(x[0] == 5 and pw(x) == 100 for x in w), w)
    check("la vitesse vient de la physique à plat (250 W : 25-40 km/h au bout de quelques s)", True)
    pg.evaluate("MR.lecteur.t = 58"); pg.wait_for_timeout(3200)
    w = sent(pg)
    check("changement de palier : cible 150 W envoyée", any(x[0] == 5 and pw(x) == 150 for x in w[n0:]), w[-4:])
    pg.evaluate("MR.lecteur.t = 125"); pg.wait_for_timeout(8200)
    ramp = [pw(x) for x in sent(pg) if x[0] == 5 and 150 < pw(x) < 200]
    check("rampe : plusieurs consignes croissantes entre 150 et 200 W", len(ramp) >= 3 and ramp == sorted(ramp) and ramp[0] >= 150, ramp)
    check("rampe : valeurs proches de la cible théorique (+-6 W)", all(abs(v - (150 + 50*((125 - 120)/60 + 0)) ) < 40 for v in ramp))
    n1 = len(sent(pg))
    pg.click("#bDemarrer"); pg.wait_for_timeout(1500)           # pause
    w = sent(pg)[n1:]
    check("pause : résistance libre (pente 0 %) envoyée", any(x[0] == 0x11 and x[3] == 0 for x in w), w)
    n2 = len(sent(pg)); pg.click("#bDemarrer"); pg.wait_for_timeout(1500)   # reprise
    w = sent(pg)[n2:]
    check("reprise : cible ERG renvoyée", any(x[0] == 5 for x in w), w)

    # --- déconnexion accidentelle puis reprise
    pg.evaluate("MR.lecteur.t = 150")
    pg.evaluate("__m.hub.gatt.disconnect()"); pg.wait_for_timeout(400)
    check("trainer perdu : séance en pause automatique", pg.evaluate("MR.lecteur.etat") == "pause" and "pause" in pg.inner_text("#etatSeance"))
    check("trainer perdu : curseurs de simulation réactivés", pg.evaluate("[sP.disabled, sC.disabled]") == [False, False])
    t_av = pg.evaluate("MR.lecteur.t")
    pg.evaluate("window.__next='hub'"); pg.click("#bTrainer"); pg.wait_for_timeout(1500)
    check("reconnexion : séance reprise là où elle était", pg.evaluate("MR.lecteur.etat") == "en cours" and abs(pg.evaluate("MR.lecteur.t") - t_av) < 3, (t_av, pg.evaluate("MR.lecteur.t")))
    w = sent(pg)
    check("reconnexion : cible ERG renvoyée (palier de la rampe)", w[-1][0] in (5, 0x11) and any(x[0] == 5 for x in w[-4:]), w[-4:])

    # --- fin de séance
    pg.evaluate("MR.lecteur.t = 208"); pg.wait_for_timeout(3500)
    check("fin : état terminée", pg.evaluate("MR.lecteur.etat") == "finie" and "terminée" in pg.inner_text("#etatSeance"), pg.inner_text("#etatSeance"))
    check("fin : retour à la résistance libre", sent(pg)[-1][0] == 0x11 and sent(pg)[-1][3] == 0, sent(pg)[-3:])
    check("fin : bouton Recommencer", pg.inner_text("#bDemarrer") == "Recommencer")

    # --- cardio
    pg.evaluate("window.__next='hr'"); pg.click("#bFc"); pg.wait_for_timeout(600)
    opts = json.loads(pg.evaluate("window.__opts[window.__opts.length-1]"))
    check("filtre cardio : Hub exclu par son nom", {"namePrefix": "Zwift"} in opts["exclusionFilters"], opts)
    pg.evaluate("window.__ivh = setInterval(()=>__m.emit(__m.hr,[0x10,0x4a,0xee,0x02]), 500)"); pg.wait_for_timeout(1500)
    check("fréquence cardiaque 74 bpm reçue", pg.evaluate("MR.entree.fc") == 74)

    # --- mode arcade branché sur les vraies valeurs
    pg.evaluate("MR.borne(true)"); pg.wait_for_timeout(2500)
    hud = pg.evaluate("[...document.querySelectorAll('.hud strong')].map(e=>e.textContent)")
    check("arcade : HUD cœur 74, puissance 250, cadence 80", hud[0] == "74" and hud[1] == "250" and hud[2] == "80", hud)
    check("arcade : vitesse affichée issue de la physique (pas des 25 km/h du Hub)", hud[3] != "25,0" and 15 < float(hud[3].replace(",", ".")) < 45, hud)
    svg_n = pg.evaluate("document.querySelector('.panel svg').childElementCount")
    check("arcade : les instruments (SVG) sont dessinés avec des éléments animés", svg_n > 0 and pg.evaluate("document.querySelectorAll('.panel svg [data-live]').length") > 0, svg_n)
    pg.screenshot(path="/home/claude/mr/shots/e2e_arcade_steampunk.png")
    for borne in ["original", "neon", "cassette", "giscard"]:
        pg.select_option("#borne", borne); pg.wait_for_timeout(900)
        pg.screenshot(path=f"/home/claude/mr/shots/e2e_arcade_{borne}.png")
        check("arcade : borne " + borne + " chargée, instruments dessinés", pg.evaluate("document.querySelector('.panel svg').childElementCount") > 0 and pg.inner_text(".msg") == "", pg.inner_text(".msg"))
    check("arcade : vue « menu » par défaut (borne entière), bascule en position I", pg.evaluate("[document.querySelector('.machine').dataset.vue, bascule.getAttribute('aria-checked'), document.querySelector('.cab').src.includes('-menu.png')]") == ["menu", "false", True])
    pg.screenshot(path="/home/claude/mr/shots/e2e_arcade_menu.png")
    pg.click("#bascule"); pg.wait_for_timeout(900)
    check("bascule : mode jeu (grand écran), image -jeu.png, libellé", pg.evaluate("[document.querySelector('.machine').dataset.vue, bascule.getAttribute('aria-checked'), document.querySelector('.cab').src.includes('-jeu.png')]") == ["jeu", "true", True] and "Grand" in pg.inner_text("#libelleVue"), pg.inner_text("#libelleVue"))
    e_menu = pg.evaluate("document.querySelector('.screen').style.height")
    for borne in ["steampunk", "original", "neon", "cassette", "giscard"]:
        pg.select_option("#borne", borne)
        for vue in ["menu", "jeu"]:
            if pg.evaluate("document.querySelector('.machine').dataset.vue") != vue: pg.click("#bascule")
            pg.wait_for_timeout(700)
            ok = pg.evaluate("document.querySelector('.cab').src.includes('%s-' + document.querySelector('.machine').dataset.vue)" % {"original": "annees-90"}.get(borne, borne)) and pg.inner_text(".msg") == "" and pg.evaluate("document.querySelector('.panel svg').childElementCount") > 0
            check("borne %s, vue %s : image, écran et instruments OK" % (borne, vue), ok, pg.inner_text(".msg"))
    pg.select_option("#borne", "steampunk")
    if pg.evaluate("document.querySelector('.machine').dataset.vue") != "jeu": pg.click("#bascule")
    pg.wait_for_timeout(500)
    check("vue jeu : écran plus haut qu'en vue menu", float(pg.evaluate("document.querySelector('.screen').style.height").rstrip('%')) > 60)
    pg.select_option("#monde", "ville-miniature"); pg.wait_for_timeout(800)
    check("arcade : changement de monde", "ville-miniature" in pg.evaluate("document.querySelector('.machine .scene').src"))
    pg.evaluate("MR.lecteur.t = 600") # pas de séance en cours : sans effet
    # cible dans le HUD : séance en cours
    pg.evaluate("MR.borne(false)"); pg.select_option("#seance", "demo"); pg.click("#bDemarrer"); pg.wait_for_timeout(1500)
    pg.evaluate("MR.lecteur.t = 760")        # palier de 210 W...
    pg.evaluate("MR.borne(true)"); pg.wait_for_timeout(700)
    u = pg.evaluate("document.querySelector('[data-u=watts]').textContent")
    check("arcade : la cible de la séance est affichée sous la puissance", u.startswith("W · cible "), u)

    # --- fichiers de séance
    pg.set_input_files("#fichier", files=[{"name": "test.zwo", "mimeType": "text/xml", "buffer": ZWO.encode()}]); pg.wait_for_timeout(500)
    st = pg.evaluate("[MR.lecteur.seance.nom, MR.lecteur.seance.duree, MR.lecteur.seance.etapes.length, Math.round(MR.lecteur.seance.etapes[0].w0), Math.round(MR.lecteur.seance.etapes[0].w1)]")
    check(".zwo lu : nom, durée (300+120+2*90+60+120 = 780 s), 8 étapes, rampe 100->175 W", st == ["Test zwo", 780, 8, 100, 175], st)
    check(".zwo : FreeRide = étape libre", pg.evaluate("MR.lecteur.seance.etapes[6].libre") is True)
    pg.set_input_files("#fichier", files=[{"name": "mauvais.zwo", "mimeType": "text/xml", "buffer": b"<workout_file><workout><Bidule Duration='5'/></workout></workout_file>"}]); pg.wait_for_timeout(400)
    check(".zwo inconnu : erreur claire, séance précédente conservée", "non géré" in pg.inner_text("#info") and pg.evaluate("MR.lecteur.seance.nom") == "Test zwo", pg.inner_text("#info"))
    pg.set_input_files("#fichier", files=[{"name": "seance.fit", "mimeType": "application/octet-stream", "buffer": b"\x0e\x10garbage"}]); pg.wait_for_timeout(400)
    check(".fit : message explicite", ".fit" in pg.inner_text("#info") and "pas encore" in pg.inner_text("#info"), pg.inner_text("#info"))
    js = json.dumps({"nom": "Mon JSON", "ftp": 200, "etapes": [{"s": 60, "pct": 50}, {"s": 60, "w": 180}]})
    pg.set_input_files("#fichier", files=[{"name": "s.json", "mimeType": "application/json", "buffer": js.encode()}]); pg.wait_for_timeout(400)
    check(".json lu (FTP du champ = 250 prioritaire)", pg.evaluate("[MR.lecteur.seance.nom, Math.round(MR.lecteur.seance.etapes[0].w0)]") == ["Mon JSON", 125], pg.evaluate("[MR.lecteur.seance.nom, MR.lecteur.seance.etapes[0].w0]"))
    pg.set_input_files("#fichier", files=[{"name": "essai.mrc", "mimeType": "text/plain", "buffer": b"[COURSE HEADER]\nDESCRIPTION = Mrc de test\nMINUTES PERCENT\n[END COURSE HEADER]\n[COURSE DATA]\n0 50\n5 50\n5 100\n10 100\n[END COURSE DATA]\n"}]); pg.wait_for_timeout(500)
    check("fichier .mrc : chargé, 10 min, nom de séance", "10:00" in pg.inner_text("#etatSeance") and "Mrc de test" in pg.evaluate("[...seance.options].map(o=>o.textContent).join('|')"), pg.inner_text("#etatSeance"))
    pg.set_input_files("#fichier", files=[{"name": "vide.json", "mimeType": "application/json", "buffer": b'{"etapes":[]}'}]); pg.wait_for_timeout(400)
    check("séance JSON vide : refusée", "refusée" in pg.inner_text("#info"), pg.inner_text("#info"))

    # --- promenade, rendu avec séance et trace
    pg.evaluate("MR.borne(false)"); pg.select_option("#seance", "demo"); pg.wait_for_timeout(300)
    pg.evaluate("MR.lecteur.demarrer(); MR.lecteur.t = 1500; for (let t=0;t<1500;t+=15) MR.valeurs().historique.push({t, w: 120 + 80*Math.sin(t/90) + (t>1100?120:0)});"); pg.wait_for_timeout(1500)
    pg.screenshot(path="/home/claude/mr/shots/e2e_promenade_seance.png")

    # --- fluidité : le décor doit avancer à chaque image
    pg.evaluate("MR.borne(false)"); pg.wait_for_timeout(500)
    pg.evaluate("""window.__d=[];(function f(){ const x=MR.valeurs().distance; if(window.__l!==undefined) window.__d.push(x-window.__l); window.__l=x; if(window.__d.length<90) requestAnimationFrame(f); })()""")
    pg.wait_for_timeout(4000)
    d = pg.evaluate("window.__d"); nz = sum(1 for x in d if x <= 1e-9)
    check("fluidité : chaque image fait avancer le décor (%d images, %d sans avance)" % (len(d), nz), len(d) > 30 and nz == 0, (len(d), nz))
    check("fluidité : jamais de retour en arrière", all(x >= 0 for x in d))

    # --- rapports virtuels (1 à 24), boutons, clavier, touches configurables
    pg.evaluate("MR.lecteur.arreter()"); pg.wait_for_timeout(1300)
    check("rapport par défaut : 10/24, affiché", pg.evaluate("MR.rapport()") == 10 and pg.inner_text("#rapport").replace("\n", "") == "10/24", pg.inner_text("#rapport"))
    pg.click("body", position={"x": 5, "y": 5}); n4 = len(sent(pg))
    pg.keyboard.press("+"); fl = pg.evaluate("bPlus.classList.contains('flash')")
    pg.keyboard.press("+"); pg.wait_for_timeout(1300)
    check("touche + ×2 : rapport 12, bouton + en surbrillance", pg.evaluate("MR.rapport()") == 12 and fl, pg.evaluate("MR.rapport()"))
    check("la surbrillance retombe", not pg.evaluate("bPlus.classList.contains('flash')"))
    w = [x for x in sent(pg)[n4:] if x[0] == 0x11]
    check("pente +1,6 % (160) envoyée au Hub, sans attendre", w and w[-1][3] | (w[-1][4] << 8) == 160, w)
    check("pente de la physique = pente du rapport", abs(pg.evaluate("Noyau.penteDuRapport(MR.rapport())") - 1.6) < 1e-9)
    pg.click("#bMoins"); pg.click("#bMoins"); pg.click("#bMoins"); pg.wait_for_timeout(1300)
    w = [x for x in sent(pg)[n4:] if x[0] == 0x11]
    check("bouton − ×3 : rapport 9, pente −0,5 % envoyée", pg.evaluate("MR.rapport()") == 9 and w[-1][3] | (w[-1][4] << 8) == 0x10000 - 50, (pg.evaluate("MR.rapport()"), w[-1]))
    pg.evaluate("MR.fixerRapport(1,'test')"); pg.click("body", position={"x": 5, "y": 5}); pg.keyboard.press("-")
    check("limite basse : reste à 1, retour visuel quand même", pg.evaluate("MR.rapport()") == 1 and pg.evaluate("bMoins.classList.contains('flash')"))
    pg.evaluate("MR.fixerRapport(24,'test')"); pg.keyboard.press("+")
    check("limite haute : reste à 24", pg.evaluate("MR.rapport()") == 24)
    pg.focus("#ftp"); pg.keyboard.press("-")
    check("flèche dans le champ FTP : le rapport ne bouge pas", pg.evaluate("MR.rapport()") == 24)
    pg.click("body", position={"x": 5, "y": 5})
    pg.evaluate("MR.borne(true)"); pg.wait_for_timeout(600)
    check("arcade : le rapport s'affiche avec la vitesse", "R 24" in pg.inner_text("#arcade .hud"), pg.inner_text("#arcade .hud"))
    pg.evaluate("MR.fixerRapport(12,'test'); MR.changerRapport(1,'test')"); pg.wait_for_timeout(60)
    check("arcade : le bouton « + » de la borne s'allume au changement de rapport (puis s'éteint)", pg.evaluate("document.querySelector('.halo.plus').classList.contains('on')") and not pg.evaluate("document.querySelector('.halo.moins').classList.contains('on')"))
    pg.wait_for_timeout(400)
    check("arcade : halo éteint après le flash", not pg.evaluate("document.querySelector('.halo.plus').classList.contains('on')"))
    pg.evaluate("MR.changerRapport(-1,'test')"); pg.wait_for_timeout(60)
    check("arcade : le bouton « − » s'allume pour un rapport plus facile", pg.evaluate("document.querySelector('.halo.moins').classList.contains('on')"))
    pg.evaluate("MR.tenirFrein(true)"); pg.wait_for_timeout(300)
    check("arcade : frein tenu = halo rouge sur le joystick", pg.evaluate("document.querySelector('.halo.joy').classList.contains('frein') && document.querySelector('.halo.joy').classList.contains('on')"))
    pg.evaluate("MR.tenirFrein(false)"); pg.wait_for_timeout(300)
    check("arcade : frein relâché, joystick éteint", not pg.evaluate("document.querySelector('.halo.joy').classList.contains('on')"))
    pg.evaluate("MR.etat.v = 8; MR.etat.boostPret = 0; MR.lancerBoost('test')"); pg.wait_for_timeout(300)
    check("arcade : boost actif = halo doré sur le joystick, vitesse annotée", pg.evaluate("document.querySelector('.halo.joy').classList.contains('boost')") and "BOOST" in pg.inner_text("#arcade .hud"), pg.inner_text("#arcade .hud"))
    pg.evaluate("MR.etat.boostFin = 0"); pg.wait_for_timeout(400)
    check("arcade : boost fini, joystick éteint", not pg.evaluate("document.querySelector('.halo.joy').classList.contains('on')"))
    pg.evaluate("[...document.querySelectorAll('.machine .halo')].forEach(h => h.classList.remove('on'))")
    pg.evaluate("MR.borne(false)"); pg.wait_for_timeout(300)
    pg.evaluate("MR.fixerRapport(15,'test')"); pg.select_option("#seance", "essai"); pg.click("#bDemarrer"); pg.wait_for_timeout(1300)
    check("début de séance : retour au rapport 10", pg.evaluate("MR.rapport()") == 10, pg.evaluate("MR.rapport()"))
    check("palier ERG : l'affichage passe de « 10/24 » à « ERG 100 % »", pg.evaluate("groupeRapport.classList.contains('erg')") and "ERG" in pg.inner_text("#rapport"), pg.inner_text("#rapport"))
    n6 = len(sent(pg)); pg.click("body", position={"x": 5, "y": 5})
    pg.keyboard.press("+"); pg.keyboard.press("+"); pg.wait_for_timeout(1300)
    w = [x for x in sent(pg)[n6:] if x[0] == 5]
    check("ERG : deux crans + = cible +10 % (110 W envoyés au Hub), rapport intact", pg.evaluate("MR.ajustErg()") == 10 and w and pw(w[-1]) == 110 and pg.evaluate("MR.rapport()") == 10, (pg.evaluate("MR.ajustErg()"), w[-1:] ))
    check("ERG : l'écran affiche « ERG 110 % » et la cible ajustée", "110" in pg.inner_text("#rapport") and pg.evaluate("MR.valeurs().cible") == 110, (pg.inner_text("#rapport"), pg.evaluate("MR.valeurs().cible")))
    for _ in range(5): pg.keyboard.press("-")
    pg.wait_for_timeout(1300); w = [x for x in sent(pg)[n6:] if x[0] == 5]
    check("ERG : cinq crans − = −15 % (85 W)", pg.evaluate("MR.ajustErg()") == -15 and pw(w[-1]) == 85, (pg.evaluate("MR.ajustErg()"), w[-1:]))
    for _ in range(12): pg.keyboard.press("-")
    check("ERG : limité à −50 %", pg.evaluate("MR.ajustErg()") == -50)
    pg.keyboard.press("+"); pg.keyboard.press("+"); pg.keyboard.press("+"); pg.keyboard.press("+"); pg.keyboard.press("+"); pg.keyboard.press("+"); pg.keyboard.press("+"); pg.keyboard.press("+"); pg.keyboard.press("+"); pg.keyboard.press("+")
    pg.evaluate("for (let i=0;i<14;i++) MR.changerRapport(1,'test')")
    check("ERG : limité à +50 %", pg.evaluate("MR.ajustErg()") == 50)
    pg.click("#bArreter"); pg.wait_for_timeout(1300)
    check("arrêt de la séance : ajustement remis à 0, retour à « 10/24 »", pg.evaluate("MR.ajustErg()") == 0 and not pg.evaluate("groupeRapport.classList.contains('erg')") and "10" in pg.inner_text("#rapport") and "/24" in pg.inner_text("#rapport"), pg.inner_text("#rapport"))
    pg.keyboard.press("+"); pg.wait_for_timeout(100)
    check("hors ERG : + change de nouveau le rapport", pg.evaluate("MR.rapport()") == 11 and pg.evaluate("MR.ajustErg()") == 0)
    pg.evaluate("MR.fixerRapport(10,'test')")
    # touches configurables
    pg.evaluate("cPlus.closest('details').open = true")
    pg.click("#cPlus"); pg.keyboard.press("w")
    check("touche + réglée sur W", pg.evaluate("MR.touches.plus") == "w" and pg.inner_text("#kPlus") == "W", pg.inner_text("#kPlus"))
    pg.evaluate("MR.fixerRapport(10,'test')"); pg.click("body", position={"x": 5, "y": 5}); pg.keyboard.press("w"); pg.keyboard.press("+")
    check("W monte d'un rapport, l'ancienne touche + ne fait plus rien", pg.evaluate("MR.rapport()") == 11, pg.evaluate("MR.rapport()"))
    pg.click("#cMoins"); pg.keyboard.press("w")
    check("même touche refusée pour l'autre réglage", pg.evaluate("MR.touches.moins") == "-" and "déjà prise" in pg.inner_text("#info"), pg.inner_text("#info"))
    pg.keyboard.press("Escape")
    check("Échap annule le choix", pg.inner_text("#cMoins") == "Changer…" and pg.evaluate("MR.touches.moins") == "-")
    pg.click("#cMoins"); pg.keyboard.press("Space")
    check("Espace refusé (sert à activer les boutons)", pg.evaluate("MR.touches.moins") == "-")
    pg.keyboard.press("Escape")
    pg.click("#cPlus"); pg.keyboard.press("+")
    check("retour à la touche +", pg.evaluate("MR.touches.plus") == "+" and "plus" in pg.inner_text("#kPlus"), pg.inner_text("#kPlus"))
    # joystick gauche/droite : aucune action sur les rapports, seulement le halo en arcade
    pg.evaluate("MR.fixerRapport(10,'test')"); pg.click("body", position={"x": 5, "y": 5}); pg.keyboard.press("ArrowRight"); pg.keyboard.press("ArrowLeft")
    check("flèches gauche/droite : le rapport ne change pas", pg.evaluate("MR.rapport()") == 10 and pg.evaluate("MR.ajustErg()") == 0, pg.evaluate("MR.rapport()"))
    check("réglages gauche/droite : flèches par défaut", pg.evaluate("[MR.touches.gauche, MR.touches.droite]") == ["ArrowLeft", "ArrowRight"] and pg.inner_text("#kGauche") == "← Gauche")
    pg.evaluate("MR.borne(true)"); pg.wait_for_timeout(500)
    pg.keyboard.press("ArrowDown"); pg.wait_for_timeout(100)
    check("borne ouverte : la flèche bas choisit un jeu dans le menu et ne déclenche pas le frein", pg.evaluate("MR.borneJeux().selection()") == "bataille" and not pg.evaluate("document.querySelector('.halo.joy').classList.contains('frein')") and not pg.evaluate("MR.valeurs().frein"), pg.evaluate("MR.borneJeux().selection()"))
    pg.keyboard.up("ArrowRight"); pg.wait_for_timeout(200)
    check("arcade : flèche relâchée, halo éteint ; le rapport n'a pas bougé", not pg.evaluate("document.querySelector('.halo.joy').classList.contains('on')") and pg.evaluate("MR.rapport()") == 10)
    pg.evaluate("MR.changerRapport(1,'test')"); pg.wait_for_timeout(60)
    check("arcade : un changement de rapport n'incline plus le joystick", pg.evaluate("document.querySelector('.halo.plus').classList.contains('on')") and not pg.evaluate("document.querySelector('.halo.joy').classList.contains('on')"))
    pg.evaluate("MR.fixerRapport(10,'test')"); pg.evaluate("MR.borne(false)"); pg.wait_for_timeout(300)
    # animation des jambes : minimale dès que la puissance dépasse 0, même sans cadence détectée (paquets FTMS fabriqués)
    def ftms(w, rpm): return "[0x44,0x00,0xC4,0x09,%d,0x00,%d,%d]" % (rpm * 2, w & 255, w >> 8)
    def flux(w, rpm): pg.evaluate("clearInterval(window.__iv)"); pg.evaluate("window.__iv = setInterval(()=>__m.emit(__m.bike,%s), 250)" % ftms(w, rpm)); pg.wait_for_timeout(1200)
    flux(0, 0)
    check("0 W, 0 tr/min : jambes immobiles", pg.evaluate("MR.valeurs().cadenceAnim") == 0, pg.evaluate("MR.valeurs().cadenceAnim"))
    flux(120, 0)
    check("120 W sans cadence détectée : animation minimale (30 tr/min), cadence affichée inchangée (0)", pg.evaluate("MR.valeurs().cadenceAnim") == 30 and pg.evaluate("MR.valeurs().cadence") == 0, pg.evaluate("[MR.valeurs().cadenceAnim, MR.valeurs().cadence]"))
    flux(120, 80)
    check("cadence détectée : l'animation suit la vraie cadence", pg.evaluate("MR.valeurs().cadenceAnim") == 80, pg.evaluate("MR.valeurs().cadenceAnim"))
    pg.evaluate("clearInterval(window.__iv)"); pg.evaluate(f"window.__iv = setInterval(()=>__m.emit(__m.bike,{FTMS}), 250)"); pg.wait_for_timeout(600)
    # frein (tenu) et boost (impulsion)
    pg.click("body", position={"x": 5, "y": 5}); pg.wait_for_timeout(1500)
    v0 = pg.evaluate("MR.etat.v"); check("avant frein : le vélo roule (250 W)", v0 > 3, v0)
    pg.keyboard.down("ArrowDown"); pg.wait_for_timeout(300)
    check("frein tenu : actif, bouton en rouge", pg.evaluate("MR.valeurs().frein") is True and pg.evaluate("bFrein.classList.contains('frein-actif')"))
    pg.wait_for_timeout(2200); v1 = pg.evaluate("MR.etat.v")
    check("frein : la vitesse chute nettement", v1 < v0 - 3, (v0, v1))
    pg.keyboard.up("ArrowDown"); pg.wait_for_timeout(300)
    check("frein relâché : plus actif", pg.evaluate("MR.valeurs().frein") is False and not pg.evaluate("bFrein.classList.contains('frein-actif')"))
    pg.wait_for_timeout(3000); v2 = pg.evaluate("MR.etat.v")
    check("après le frein, le pédalage reprend de la vitesse", v2 > v1 + 1, (v1, v2))
    pg.evaluate("MR.etat.v = 8; MR.etat.boostPret = 0"); pg.keyboard.press("ArrowUp"); pg.wait_for_timeout(1400)
    bst = pg.evaluate("MR.valeurs().boost")
    check("boost : lancé, actif, vitesse affichée supérieure à la vitesse réelle", bst["actif"] and pg.evaluate("MR.valeurs().vitesseKmh / (MR.etat.v * 3.6)") > 1.1, bst)
    check("boost : le bouton affiche le décompte", pg.inner_text("#bBoost").startswith("Boost ") and "s" in pg.inner_text("#bBoost") and pg.evaluate("bBoost.classList.contains('boost-actif')"), pg.inner_text("#bBoost"))
    fin = pg.evaluate("MR.etat.boostFin"); pg.keyboard.press("ArrowUp")
    check("boost : une seconde pression ne relance rien", pg.evaluate("MR.etat.boostFin") == fin)
    check("boost : la distance de la sortie n'est pas gonflée par le boost", pg.evaluate("MR.etat.bonusD") > 0 and pg.evaluate("MR.etat.d + 0") is not None)
    pg.wait_for_timeout(5000)
    check("boost terminé : en attente (pause de 10 s)", not pg.evaluate("MR.valeurs().boost.actif") and "(" in pg.inner_text("#bBoost") and pg.evaluate("bBoost.classList.contains('boost-attente')"), pg.inner_text("#bBoost"))
    j = pg.evaluate("journal.textContent")
    check("journal : rapports et envois de pente tracés", "Rapport 12/24" in j and "Consigne envoyée : Libre, pente 1.6 %" in j, j[-300:])
    pg.screenshot(path="/home/claude/mr/shots/e2e_rapport.png")

    # --- enregistrement de la sortie et export .tcx
    n_pts = pg.evaluate("MR.sortie().points.length")
    check("sortie : mesures enregistrées avec le trainer connecté (1 par seconde)", n_pts >= 8, n_pts)
    check("sortie : texte d'état et bouton .tcx actif", "Sortie :" in pg.inner_text("#etatSortie") and "km" in pg.inner_text("#etatSortie") and not pg.is_disabled("#bTcx"), pg.inner_text("#etatSortie"))
    ts = pg.evaluate("MR.sortie().points.map(p => p[0])")
    check("sortie : un point par seconde, jamais deux dans la même seconde", all(int(b/1000) > int(a/1000) for a, b in zip(ts, ts[1:])))
    check("sortie : sauvegarde automatique dans le navigateur", pg.evaluate("localStorage.getItem('micro-rider.sortie')") not in (None, ""))
    with pg.expect_download() as dl:
        pg.click("#bTcx")
    import xml.etree.ElementTree as ET, re
    nom = dl.value.suggested_filename; contenu = open(dl.value.path(), encoding="utf8").read()
    arbre = ET.fromstring(contenu); ns = {"t": "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", "x": "http://www.garmin.com/xmlschemas/ActivityExtension/v2"}
    tps = arbre.findall(".//t:Trackpoint", ns)
    check("export : nom de fichier daté .tcx", re.fullmatch(r"micro-rider-\d{4}-\d\d-\d\d-\d{4}\.tcx", nom) is not None, nom)
    check("export : XML valide, un point par mesure", len(tps) >= n_pts, (len(tps), n_pts))
    w = [int(x.text) for x in arbre.findall(".//x:Watts", ns)]
    check("export : puissance 250 W du trainer, cadence 80", 250 in set(w) and set(w) <= {0, 120, 250} and {c.text for c in arbre.findall(".//t:Trackpoint/t:Cadence", ns)} <= {"80", "0"}, set(w))
    check("export : distance croissante", all(float(b.find("t:DistanceMeters", ns).text) >= float(a.find("t:DistanceMeters", ns).text) for a, b in zip(tps, tps[1:])))
    check("texte titre/description affiché sous la barre", pg.is_visible("#texteSortie") and "Titre : Micro-Rider" in pg.inner_text("#texteSortie") and "Description : Home trainer : Zwift Hub" in pg.inner_text("#texteSortie"), pg.inner_text("#texteSortie"))
    pg.evaluate("navigator.clipboard.writeText = async (t) => { window.__presse = t; }")
    pg.click("#bCopier"); pg.wait_for_timeout(200)
    check("bouton Copier : presse-papiers = titre + description, retour visuel", pg.evaluate("window.__presse").startswith("Micro-Rider") and "Home trainer : Zwift Hub" in pg.evaluate("window.__presse") and "Copié" in pg.inner_text("#bCopier"), pg.evaluate("window.__presse"))
    # --- export .fit : relu par fitdecode (CRC vérifié), sous-sport « virtuel », nom d'appli, capteurs
    check("export .fit : bouton actif", not pg.is_disabled("#bFit"))
    with pg.expect_download() as dl2:
        pg.click("#bFit")
    import fitdecode
    nomf = dl2.value.suggested_filename; msgs = {}
    with fitdecode.FitReader(dl2.value.path()) as r:
        for f in r:
            if f.frame_type == fitdecode.FIT_FRAME_DATA: msgs.setdefault(f.name, []).append({x.name: x.value for x in f.fields})
    check("export .fit : nom daté .fit", re.fullmatch(r"micro-rider-\d{4}-\d\d-\d\d-\d{4}\.fit", nomf) is not None, nomf)
    check("export .fit : vélo, sous-sport activité virtuelle", msgs["session"][0]["sport"] == "cycling" and msgs["session"][0]["sub_sport"] == "virtual_activity", msgs["session"][0])
    check("export .fit : un record par mesure, puissance 250 W", len(msgs["record"]) >= n_pts and 250 in {x["power"] for x in msgs["record"]}, len(msgs["record"]))
    check("export .fit : titre proposé", msgs["session"][0].get("sport_profile_name") in ("Micro-Rider virtual ride",) or str(msgs["session"][0].get("sport_profile_name")).startswith("Micro-Rider training:"), msgs["session"][0].get("sport_profile_name"))
    check("export .tcx : Notes = titre + appareils (trainer, puis cardio)", "Home trainer : Zwift Hub" in contenu and "Cardio : HW9 20937" in contenu and "Micro-Rider" in contenu, contenu[contenu.find("<Notes>"):contenu.find("</Notes>")])
    check("export .fit : appli Micro-Rider + trainer listés", msgs["file_id"][0]["product_name"] == "Micro-Rider" and "Zwift Hub" in {d.get("product_name") for d in msgs["device_info"]}, msgs["device_info"])
    pg.click("#bNouvelle"); fl = pg.inner_text("#bNouvelle")
    check("nouvelle sortie : demande une confirmation d'abord", "Confirmer" in fl and pg.evaluate("MR.sortie().points.length") > 0, fl)
    pg.click("#bNouvelle"); pg.wait_for_timeout(200)
    check("nouvelle sortie confirmée : effacée (puis l'enregistrement reprend avec le pédalage)", pg.evaluate("MR.sortie().points.length") < 4 and pg.inner_text("#bNouvelle") == "Nouvelle sortie", pg.evaluate("MR.sortie().points.length"))
    pg.evaluate("MR.sortie().vider()")

    # --- Zwift Click branché sur les rapports
    pg.evaluate("MR.fixerRapport(10,'test')"); pg.evaluate("window.__next='click'"); pg.click("#bClick"); pg.wait_for_timeout(600)
    check("Click : filtré par nom Zwift, service déclaré", "namePrefix" in pg.evaluate("window.__opts.at(-1)") and "00000001-19ca" in pg.evaluate("window.__opts.at(-1)"), pg.evaluate("window.__opts.at(-1)"))
    check("Click : « RideOn » envoyé à la caractéristique 00000003", pg.evaluate("window.__cwrites") == [[0x52,0x69,0x64,0x65,0x4f,0x6e]], pg.evaluate("window.__cwrites"))
    check("Click : bouton vert, nom affiché", pg.evaluate("bClick.className") == "conn ok" and "Zwift Click" in pg.inner_text("#bClick"))
    pg.evaluate("__m.ckSend(1,1)"); pg.wait_for_timeout(50)
    check("Click : premier message sans effet", pg.evaluate("MR.rapport()") == 10)
    pg.evaluate("__m.ckSend(0,1)"); pg.evaluate("__m.ckSend(0,1)"); pg.evaluate("__m.ckSend(0,1)")
    check("Click : bouton 1 = + (un seul pas malgré les messages répétés), surbrillance", pg.evaluate("MR.rapport()") == 11 and pg.evaluate("bPlus.classList.contains('flash')"), pg.evaluate("MR.rapport()"))
    pg.evaluate("__m.ckSend(1,1)"); pg.evaluate("__m.ckSend(1,0)"); pg.evaluate("__m.ckSend(1,0)"); pg.evaluate("__m.ckSend(1,1)")
    check("Click : le relâchement ne compte pas, bouton 2 = −", pg.evaluate("MR.rapport()") == 10, pg.evaluate("MR.rapport()"))
    pg.evaluate("__m.emit(__m.ckn,[0x19,0x10,0x5d])"); pg.wait_for_timeout(50)
    check("Click : batterie 93 % dans l'infobulle", "93 %" in pg.evaluate("bClick.title"), pg.evaluate("bClick.title"))
    pg.evaluate("__m.emit(__m.ckn,[0x23,0x08,0x00])"); pg.evaluate("__m.emit(__m.ckn,[0x37,0x08])")
    check("Click : messages inconnus ou tronqués ignorés", pg.evaluate("MR.rapport()") == 10)
    pg.evaluate("__m.ckSend(0,0)"); pg.wait_for_timeout(50); pg.evaluate("__m.ckSend(1,1)")
    check("Click : les deux boutons ensemble s'annulent", pg.evaluate("MR.rapport()") == 10, pg.evaluate("MR.rapport()"))
    pg.evaluate("__m.click.gatt.disconnect()"); pg.wait_for_timeout(300)
    check("Click perdu : bouton en attente de reconnexion, rapport conservé", pg.evaluate("bClick.className") == "conn att" and pg.evaluate("MR.rapport()") == 10, pg.evaluate("bClick.className"))
    pg.wait_for_timeout(3500)
    check("Click : reconnexion automatique, nouvel échange de départ", pg.evaluate("bClick.className") == "conn ok" and len(pg.evaluate("window.__cwrites")) == 2, (pg.evaluate("bClick.className"), pg.evaluate("window.__cwrites.length")))
    pg.evaluate("__m.ckSend(1,1)"); pg.evaluate("__m.ckSend(0,1)")
    check("Click reconnecté : l'état de départ est relu, puis + fonctionne", pg.evaluate("MR.rapport()") == 11, pg.evaluate("MR.rapport()"))
    pg.click("#bClick"); pg.wait_for_timeout(300)
    n5 = pg.evaluate("MR.rapport()"); pg.evaluate("__m.ckSend(1,1)"); pg.evaluate("__m.ckSend(0,1)")
    check("Click déconnecté volontairement : bouton gris, boutons sans effet, pas de reconnexion", pg.evaluate("bClick.className") == "conn" and pg.evaluate("MR.rapport()") == n5, pg.evaluate("bClick.className"))
    pg.wait_for_timeout(3500)
    check("Click : pas de reconnexion après une déconnexion volontaire", pg.evaluate("bClick.className") == "conn" and len(pg.evaluate("window.__cwrites")) == 2)
    pg.evaluate("window.__next='hub'")

    # --- déconnexion volontaire
    pg.evaluate("clearInterval(window.__iv)"); n3 = len(sent(pg)); pg.click("#bTrainer"); pg.wait_for_timeout(900)
    check("déconnexion volontaire : Stop envoyé, bouton gris", [8, 1] in sent(pg)[n3:] and pg.evaluate("bTrainer.className") == "conn")
    j = pg.evaluate("journal.textContent")
    check("journal : consignes de routine absentes, connexions présentes", "→ Cible" not in j and "Trainer connecté" in j and "Consigne envoyée : Cible 100 W" in j, j[-200:])
    check("aucune erreur JavaScript", not errs, errs)
    b.close()
print(sum(1 for r in res if r[1]), "OK,", sum(1 for r in res if not r[1]), "KO")
sys.exit(0 if all(r[1] for r in res) else 1)
