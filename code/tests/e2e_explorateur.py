# Explorateur de commandes Zwift (outils/explorer-zwift.html) : avec un faux appareil Bluetooth, journal des services et des messages.
from playwright.sync_api import sync_playwright
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
MOCK = """
(() => {
  const ev = () => { const l = {}; return { addEventListener: (n, f) => { (l[n] = l[n] || []).push(f); }, emit: (n, e) => (l[n] || []).forEach((f) => f(e)) }; };
  const dv = (a) => new DataView(Uint8Array.from(a).buffer);
  const mkChar = (uuid, p) => { const e = ev(); return Object.assign(e, { uuid, properties: Object.assign({ read: false, write: false, writeWithoutResponse: false, notify: false, indicate: false }, p),
    startNotifications: async () => {}, readValue: async () => dv([0x5a, 0x77, 0x69, 0x66, 0x74]), writeValueWithoutResponse: async (d) => { window.__ecrit = Array.from(d); }, writeValue: async (d) => { window.__ecrit = Array.from(d); } }); };
  const notif = mkChar('00000002-19ca-4651-86e5-fa29dcdd09d1', { notify: true }), ecr = mkChar('00000003-19ca-4651-86e5-fa29dcdd09d1', { writeWithoutResponse: true });
  const bat = mkChar('00002a19-0000-1000-8000-00805f9b34fb', { read: true, notify: true });
  const services = [{ uuid: '00000001-19ca-4651-86e5-fa29dcdd09d1', getCharacteristics: async () => [notif, ecr] }, { uuid: '0000180f-0000-1000-8000-00805f9b34fb', getCharacteristics: async () => [bat] }];
  const dev = Object.assign(ev(), { name: 'Zwift Ride (faux)', gatt: { connected: false, connect: async () => { dev.gatt.connected = true; return { getPrimaryServices: async () => services }; }, disconnect: () => { dev.gatt.connected = false; dev.emit('gattserverdisconnected', {}); } } });
  navigator.bluetooth = { requestDevice: async (o) => { window.__options = JSON.stringify(o); return dev; } };
  window.__envoyer = (a) => notif.emit('characteristicvaluechanged', { target: { value: dv(a) } });
})();
"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.add_init_script(MOCK)
    pg.goto("file:///home/claude/mr/code/outils/explorer-zwift.html"); pg.wait_for_timeout(300)
    check("page chargée, étapes non actives avant connexion", pg.is_disabled("#bSuivant"))
    pg.click("#bConnecter"); pg.wait_for_timeout(500)
    j = pg.text_content("#journal")
    check("appareil et services listés dans le journal", "Zwift Ride (faux)" in j and "2 service(s)" in j and "zwift/2" in j and "propriétés : notify" in j, j[:600])
    check("« RideOn » envoyé à la caractéristique d'écriture", pg.evaluate("window.__ecrit") == [0x52, 0x69, 0x64, 0x65, 0x4f, 0x6e])
    check("filtres par défaut : noms Zwift (pas tous les appareils)", '"filters"' in pg.evaluate("window.__options") and "acceptAllDevices" not in pg.evaluate("window.__options"))
    check("lecture de la caractéristique lisible", "lecture : 5a 77 69 66 74" in j, j[-400:])
    pg.click("#bSuivant"); pg.evaluate("__envoyer([0x37, 0x08, 0x00, 0x10, 0x01])"); pg.evaluate("__envoyer([0x23, 0x08, 0x96, 0x01, 0x12, 0x03, 0xaa, 0xbb, 0xcc])")
    pg.fill("#note", "j'appuie sur le vert"); pg.press("#note", "Enter"); pg.wait_for_timeout(100)
    j = pg.text_content("#journal")
    check("étape marquée dans le journal", "ÉTAPE 1" in j)
    check("message du Click : hexadécimal + décodage (1:0 2:1)", "37 08 00 10 01" in j and "type 37 : 1:0 2:1" in j, j[-500:])
    check("message à champ « longueur » décodé (2:[aa bb cc])", "2:[aa bb cc]" in j and "1:150" in j, j[-500:])
    check("note libre enregistrée", "NOTE : j'appuie sur le vert" in j)
    check("compteur de messages", "2 messages reçus" in pg.text_content("#nb"))
    with pg.expect_download() as d: pg.click("#bTelecharger")
    t = open(d.value.path()).read()
    check("fichier téléchargé : en-tête + journal", t.startswith("Micro-Rider · explorateur") and "ÉTAPE 1" in t and "37 08 00 10 01" in t and d.value.suggested_filename.startswith("journal-zwift-"), t[:200])
    # copie : refus du presse-papiers moderne (cas du téléphone) -> repli par l'ancienne méthode
    pg.evaluate("navigator.clipboard.writeText = () => Promise.reject(new Error('Write permission denied.')); window.__copie = 0; document.execCommand = (c) => { window.__copie++; return true; }")
    pg.click("#bCopier"); pg.wait_for_timeout(200)
    check("copie refusée par le navigateur : repli par l'ancienne méthode, bouton « Copié ✓ »", pg.evaluate("window.__copie") >= 1 and "Copié" in pg.text_content("#bCopier"), [pg.evaluate("window.__copie"), pg.text_content("#bCopier")])
    pg.click("#bDeconnecter"); pg.wait_for_timeout(100); check("déconnexion volontaire", "Déconnecté" in pg.text_content("#journal"))
    check("pas d'erreur JS", not errs, errs); b.close()
print(f"\n{sum(res)}/{len(res)}")
