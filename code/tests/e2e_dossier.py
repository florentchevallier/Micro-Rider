# Dossier de séances : choix (mock du sélecteur avec un vrai dossier OPFS), liste avec sous-dossiers, mémorisation après rechargement.
from playwright.sync_api import sync_playwright
MOCK = open('/home/claude/mr/tests/mock_ble.js').read()
ZWO = '<workout_file><name>Interne</name><workout><Warmup Duration="300" PowerLow="0.4" PowerHigh="0.7"/><SteadyState Duration="120" Power="0.9"/></workout></workout_file>'
SHIM = """(() => { let _D; const opfs = async () => { const r = await navigator.storage.getDirectory(); return r.getDirectoryHandle('seances'); };
  Object.defineProperty(window, 'Dossier', { configurable: true, get() { return _D; }, set(v) { _D = v;
    v.choisir = async () => { const h = await opfs(); localStorage.setItem('__poignee', '1'); return h; };
    v.restaurer = async () => localStorage.getItem('__poignee') ? await opfs() : null; } }); })();"""
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
URL = "http://localhost:8765/code/micro-rider.html"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1400, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.add_init_script(MOCK); pg.add_init_script(SHIM); pg.goto(URL); pg.wait_for_timeout(1500)
    check("bouton dossier visible, pas de « autre dossier » avant le choix", pg.is_visible("#bDossier") and not pg.is_visible("#bDossierAutre"))
    pg.evaluate("""async (zwo) => {
      const racine = await navigator.storage.getDirectory(); try { await racine.removeEntry('seances', {recursive:true}); } catch(e) {}
      const d = await racine.getDirectoryHandle('seances', {create:true}), s = await d.getDirectoryHandle('Sufferfest', {create:true}), c = await d.getDirectoryHandle('.cache', {create:true});
      const ecrire = async (dir, nom, txt) => { const f = await dir.getFileHandle(nom, {create:true}); const w = await f.createWritable(); await w.write(txt); await w.close(); };
      await ecrire(s, 'The Hunted.zwo', zwo); await ecrire(d, 'Facile.zwo', zwo); await ecrire(d, 'notes.txt', 'x'); await ecrire(c, 'cache.zwo', zwo); await ecrire(d, 'Cassé.zwo', '<pas du xml');
    }""", ZWO)
    pg.click("#bDossier"); pg.wait_for_timeout(1200)
    noms = pg.evaluate("[...document.querySelectorAll('#seance optgroup option')].map(o=>o.textContent)")
    check("liste : sous-dossiers parcourus, triée, .txt et dossier caché ignorés", noms == ["Cassé", "Facile", "Sufferfest / The Hunted"], noms)
    check("groupe « Folder: seances »", pg.evaluate("document.querySelector('#seance optgroup').label") == "Folder: seances")
    check("boutons : relire et autre dossier", "seances" in pg.inner_text("#bDossier") and pg.is_visible("#bDossierAutre"), pg.inner_text("#bDossier"))
    pg.select_option("#seance", "dossier:Sufferfest/The Hunted.zwo"); pg.wait_for_timeout(500)
    check("séance du dossier chargée (nom = chemin)", pg.evaluate("MR.lecteur.seance && MR.lecteur.seance.nom") == "Sufferfest / The Hunted", pg.evaluate("MR.lecteur.seance && MR.lecteur.seance.nom"))
    pg.select_option("#seance", "dossier:Cassé.zwo"); pg.wait_for_timeout(500)
    check("fichier invalide : message d'erreur, retour à « libre »", "Cassé" in pg.inner_text("#info") and pg.input_value("#seance") == "", pg.inner_text("#info"))
    pg.select_option("#seance", "dossier:Facile.zwo"); pg.wait_for_timeout(500)
    # rechargement : le dossier est retrouvé (IndexedDB) et la dernière séance reprise
    pg.wait_for_timeout(500); pg.goto(URL); pg.wait_for_timeout(2500)
    noms = pg.evaluate("[...document.querySelectorAll('#seance optgroup option')].map(o=>o.textContent)")
    check("après rechargement : dossier retrouvé sans nouveau choix", len(noms) == 3, noms)
    check("après rechargement : dernière séance du dossier reprise", pg.input_value("#seance") == "dossier:Facile.zwo" and pg.evaluate("MR.lecteur.seance && MR.lecteur.seance.nom") == "Facile", (pg.input_value("#seance"), pg.evaluate("MR.lecteur.seance && MR.lecteur.seance.nom")))
    # nouveau fichier ajouté -> clic sur ↻
    pg.evaluate("""async (zwo) => { const r = await navigator.storage.getDirectory(), d = await r.getDirectoryHandle('seances'); const f = await d.getFileHandle('Zèbre.zwo', {create:true}); const w = await f.createWritable(); await w.write(zwo); await w.close(); }""", ZWO)
    pg.click("#bDossier"); pg.wait_for_timeout(800)
    check("↻ : le nouveau fichier apparaît, la sélection est gardée", pg.evaluate("document.querySelectorAll('#seance optgroup option').length") == 4 and pg.input_value("#seance") == "dossier:Facile.zwo")
    check("« Charger un fichier… » toujours présent", pg.is_visible(".fichier button"))
    check("pas d'erreur JS", not errs, errs)
    b.close()
print(f"\n{sum(res)}/{len(res)}")
