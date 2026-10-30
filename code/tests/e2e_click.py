import sys
from playwright.sync_api import sync_playwright
MOCK = r"""
(() => {
  const Z = '00000001-19ca-4651-86e5-fa29dcdd09d1', zc = n => `0000000${n}-19ca-4651-86e5-fa29dcdd09d1`;
  const canon = n => `0000${n.toString(16).padStart(4,'0')}-0000-1000-8000-00805f9b34fb`;
  class Evt { constructor(){ this.l={}; } addEventListener(t,f){ (this.l[t] ||= []).push(f); } dispatch(t,e){ (this.l[t]||[]).forEach(f=>f(e)); } }
  window.__writes = []; window.__opts = [];
  const mk = (uuid, p, rd) => { const c = new Evt(); c.uuid = uuid; c.properties = Object.assign({read:false,write:false,writeWithoutResponse:false,notify:false,indicate:false}, p);
    c.startNotifications = async () => c; c.readValue = async () => new DataView(Uint8Array.from(rd||[0]).buffer);
    c.writeValueWithResponse = async (b) => { window.__writes.push([...new Uint8Array(b)]); };
    return c; };
  const M = window.__m = { a: mk(zc(2), {notify:true}), rx: mk(zc(3), {write:true}), tx: mk(zc(4), {indicate:true}), bat: mk(canon(0x2a19), {read:true,notify:true}, [88]), fw: mk(canon(0x2a26), {read:true}, [49,46,49,46,48]) };
  M.emit = (c, b) => { c.value = new DataView(Uint8Array.from(b).buffer); c.dispatch('characteristicvaluechanged', {target:c}); };
  const dev = (name, services) => { const d = new Evt(); d.name = name; d.id = 'abcdef0123456789';
    d.gatt = { connected:false, connect: async () => { d.gatt.connected = true; return d.gatt; }, disconnect(){ d.gatt.connected = false; d.dispatch('gattserverdisconnected', {}); }, getPrimaryServices: async () => services }; return d; };
  const svc = (u, chars) => ({ uuid: u, getCharacteristics: async () => chars });
  M.click = dev('B381', [svc(Z, [M.a, M.rx, M.tx]), svc(canon(0x180f), [M.bat]), svc(canon(0x180a), [M.fw])]);
  M.vide = dev('Inconnu', []);
  Object.defineProperty(navigator, 'bluetooth', { configurable:true, value:{ requestDevice: async (o) => { window.__opts.push(JSON.stringify(o)); return window.__next === 'vide' ? M.vide : M.click; } } });
})();
"""
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.add_init_script(MOCK); pg.goto("file:///home/claude/mr/code/ble-click.html"); pg.wait_for_timeout(300)
    check("boutons d'écriture grisés avant la connexion", pg.is_disabled("#bRideOn") and pg.is_disabled("#bDeconnecter"))
    pg.click("#bConnecter"); pg.wait_for_timeout(500)
    j = pg.inner_text("#journal")
    check("requête : tous les appareils, services candidats déclarés", "acceptAllDevices" in pg.evaluate("window.__opts[0]") and "00000001-19ca" in pg.evaluate("window.__opts[0]") and "64642" in pg.evaluate("window.__opts[0]"), pg.evaluate("window.__opts[0]"))
    check("service Zwift supposé listé avec ses caractéristiques", "service Zwift supposé" in j and "[notify]" in j and "[write]" in j and "[indicate]" in j, j)
    check("batterie et révision lues", "= 88 %" in j and "= 1.1.0" in j, j)
    check("abonnement aux notifications et indications seulement", j.count("abonné") == 3, j.count("abonné"))
    check("état connecté, nom affiché", "B381" in pg.inner_text("#etat") and "connecté" in pg.inner_text("#etat"))
    check("écriture préférée : caractéristique 00000003", pg.evaluate("cible.value").startswith("00000003"), pg.evaluate("cible.value"))
    check("aucune écriture envoyée tant qu'on ne clique pas", pg.evaluate("window.__writes.length") == 0)
    pg.evaluate("__m.emit(__m.a,[0x23,0x08,0x00,0x10,0x01])"); pg.evaluate("__m.emit(__m.a,[0x23,0x08,0x00,0x10,0x01])"); pg.evaluate("__m.emit(__m.a,[0x23,0x08,0x01])"); pg.wait_for_timeout(200)
    j = pg.inner_text("#journal")
    check("paquet inconnu journalisé, doublon muet", "← 00000002 (5 o)  23 08 00 10 01" in j and j.count("23 08 00 10 01") == 1 and "(3 o)  23 08 01" in j, j[-300:])
    check("tuiles : rien avant le premier message", pg.inner_text("#b1") == "–")
    def e(a, b): pg.evaluate(f"__m.emit(__m.a,[0x37,0x08,{a},0x10,{b}])")
    e(1, 1); pg.wait_for_timeout(50)
    check("repos : deux boutons relâchés, aucun bruit dans le journal", pg.inner_text("#b1") == "relâché" and pg.inner_text("#b2") == "relâché" and "← bouton" not in pg.inner_text("#journal"))
    e(0, 1); e(0, 1); pg.wait_for_timeout(250); e(1, 1); pg.wait_for_timeout(50)
    j = pg.inner_text("#journal")
    check("bouton 1 : un appui, un relâchement avec durée", j.count("bouton 1 ENFONCÉ") == 1 and "bouton 1 relâché après 0,2" in j and "bouton 2" not in j, j[-300:])
    check("compteur du bouton 1", pg.inner_text("#n1") == "1 appui", pg.inner_text("#n1"))
    e(1, 0); e(1, 1); e(1, 0); e(1, 1); pg.wait_for_timeout(50)
    check("bouton 2 : deux appuis comptés", pg.inner_text("#n2") == "2 appuis" and pg.inner_text("#b2") == "relâché", pg.inner_text("#n2"))
    pg.evaluate("__m.emit(__m.a,[0x19,0x10,0x5d])"); pg.evaluate("__m.emit(__m.a,[0x19,0x10,0x5d])"); pg.wait_for_timeout(50)
    check("batterie 93 % affichée, journalisée une seule fois", pg.inner_text("#bat") == "93 %" and pg.inner_text("#journal").count("batterie 93 %") == 1)
    pg.click("#bRideOn"); pg.wait_for_timeout(200)
    check("RideOn : 52 69 64 65 4f 6e écrit", pg.evaluate("window.__writes") == [[0x52,0x69,0x64,0x65,0x4f,0x6e]], pg.evaluate("window.__writes"))
    pg.click("#bDeconnecter"); pg.wait_for_timeout(200)
    check("déconnexion : état et boutons", "déconnecté" in pg.inner_text("#etat") and pg.is_disabled("#bRideOn"))
    pg.evaluate("window.__next='click'"); pg.click("#bConnecter"); pg.wait_for_timeout(400)
    check("reconnexion : compteurs remis à zéro, anciens paquets ignorés", pg.inner_text("#b1") == "–" and pg.inner_text("#n1") == "")
    pg.click("#bDeconnecter"); pg.wait_for_timeout(100)
    pg.evaluate("window.__next='vide'"); pg.click("#bConnecter"); pg.wait_for_timeout(400)
    check("aucun service visible : avertissement explicite", "aucun service visible" in pg.inner_text("#journal"))
    check("aucune erreur JavaScript", not errs, errs)
    b.close()
print(sum(res), "OK,", len(res) - sum(res), "KO"); sys.exit(0 if all(res) else 1)
