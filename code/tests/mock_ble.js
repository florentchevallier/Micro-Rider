try { if (localStorage.getItem("micro-rider.reglages") === null) localStorage.setItem("micro-rider.reglages", "1"); } catch (e) {}   // réglages ouverts par défaut pour les tests

(() => {
  const canon = n => `0000${n.toString(16).padStart(4,'0')}-0000-1000-8000-00805f9b34fb`;
  class Evt { constructor(){ this.l = {}; } addEventListener(t,f){ const a=(this.l[t] ||= []); if(!a.includes(f)) a.push(f); } dispatch(t,e){ (this.l[t]||[]).forEach(f=>f(e)); } }
  window.__writes = []; window.__opts = [];
  const props = p => Object.assign({read:false,write:false,writeWithoutResponse:false,notify:false,indicate:false}, p);
  function mkChar(num, p, readBytes){
    const c = new Evt(); c.uuid = canon(num); c.properties = props(p);
    c.startNotifications = async () => c;
    c.readValue = async () => new DataView(Uint8Array.from(readBytes || [0]).buffer);
    if (p.write) c.writeValueWithResponse = async (buf) => {
      const b = [...new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)];
      window.__writes.push(b);
      if (window.__mute) return;
      setTimeout(() => {
        if (b[0] === 0) window.__deny = false;
        const res = (window.__deny && b[0] === 0x11) ? 5 : 1;
        c.value = new DataView(Uint8Array.from([0x80, b[0], res]).buffer); c.dispatch('characteristicvaluechanged', {target:c});
        if (b[0] === 0x11 && res === 1) { const s = window.__m.status; s.value = new DataView(Uint8Array.from([0x12, ...b.slice(1)]).buffer); s.dispatch('characteristicvaluechanged', {target:s}); }
      }, 15);
    };
    return c;
  }
  const svc = (num, chars) => ({ uuid: canon(num), getCharacteristics: async () => chars });
  const dev = (name, services, id) => { const d = new Evt(); d.name = name; d.id = id || ('id-' + name);
    d.gatt = { connected:false, connect: async () => { if ((localStorage.getItem('__fail') || '').split(',').includes(d.id)) { const e = new Error('Connection failed'); e.name = 'NetworkError'; throw e; } d.gatt.connected = true; return d.gatt; },
      disconnect(){ if(!d.gatt.connected) return; d.gatt.connected = false; d.dispatch('gattserverdisconnected', {}); },
      getPrimaryServices: async () => services,
      getPrimaryService: async (u) => { const f = services.find(x => x.uuid === u); if (!f) { const e = new Error('no service'); e.name = 'NotFoundError'; throw e; } return f; } }; return d; };
  const M = window.__m = { bike: mkChar(0x2ad2,{notify:true}), pow: mkChar(0x2a63,{notify:true}), status: mkChar(0x2ada,{notify:true}),
    cp: mkChar(0x2ad9,{write:true,indicate:true}), hr: mkChar(0x2a37,{notify:true}) };
  M.hub = dev('Zwift Hub', [ svc(0x1826,[M.bike, mkChar(0x2acc,{read:true},[0x87,0x44,0,0, 0x0c,0xe0,0,0]), M.status, M.cp]), svc(0x1818,[M.pow]) ]);
  M.band = dev('HW9 20937', [ svc(0x180d,[M.hr]), svc(0x180f,[mkChar(0x2a19,{read:true},[64])]) ]);
  M.csc = mkChar(0x2a5b,{notify:true}); M.cscFeat = mkChar(0x2a5c,{read:true},[0x02,0x00]);
  M.cad = dev('Wahoo CADENCE', [ svc(0x1816,[M.csc, M.cscFeat]), svc(0x180f,[mkChar(0x2a19,{read:true},[90])]) ]);
  M.cadRoue = dev('Capteur vitesse', [ svc(0x1816,[M.csc, mkChar(0x2a5c,{read:true},[0x01,0x00])]) ]);
  const ZC = '00000001-19ca-4651-86e5-fa29dcdd09d1', zc = n => `0000000${n}-19ca-4651-86e5-fa29dcdd09d1`;
  window.__cwrites = [];
  const ck = (n, p) => { const c = new Evt(); c.uuid = zc(n); c.properties = props(p); c.startNotifications = async () => c;
    c.writeValueWithoutResponse = async (b) => { window.__cwrites.push([...new Uint8Array(b.buffer || b)]); }; return c; };
  M.ckn = ck(2,{notify:true}); M.ckw = ck(3,{writeWithoutResponse:true});
  M.click = dev('Zwift Click', [ { uuid: ZC, getCharacteristics: async () => [M.ckn, M.ckw], getCharacteristic: async (u) => [M.ckn, M.ckw].find(c => c.uuid === u) } ]);
  M.ckSend = (a, b) => M.emit(M.ckn, [0x37, 0x08, a, 0x10, b]);
  M.emit = (c, bytes) => { c.value = new DataView(Uint8Array.from(bytes).buffer); c.dispatch('characteristicvaluechanged', {target:c}); };
  const tous = () => [M.hub, M.band, M.click, M.cad, M.cadRoue];
  const autorises = () => JSON.parse(localStorage.getItem('__auth') || '[]');
  Object.defineProperty(navigator, 'bluetooth', { configurable:true, value:{
    requestDevice: async (o) => { window.__opts.push(JSON.stringify(o)); const d = window.__next === 'hr' ? M.band : window.__next === 'click' ? M.click : window.__next === 'cad' ? M.cad : window.__next === 'cadroue' ? M.cadRoue : M.hub; localStorage.setItem('__auth', JSON.stringify([...new Set([...autorises(), d.id])])); return d; },
    getDevices: localStorage.getItem('__nogd') ? undefined : async () => tous().filter(d => autorises().includes(d.id)) } });
})();
