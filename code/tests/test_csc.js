// Tests de parseCsc / cadenceManivelle (charge parseurs.js tel quel)
const fs = require("fs"), vm = require("vm");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("/home/claude/mr/code/js/parseurs.js", "utf8") + "\nthis.parseCsc = parseCsc; this.cadenceManivelle = cadenceManivelle;", ctx);
let ok = 0, ko = 0; const check = (n, c, d) => { c ? ok++ : (ko++, console.log("KO  " + n, d !== undefined ? d : "")); };
const dv = (...o) => new DataView(Uint8Array.from(o).buffer);
// manivelle seule : flags 0x02, tours 0x0010, temps 0x0400 (= 1 s)
let r = ctx.parseCsc(dv(0x02, 0x10, 0x00, 0x00, 0x04));
check("manivelle seule : tours 16, temps 1024", r.tours === 16 && r.temps === 1024 && r.toursRoue === undefined, r);
// roue + manivelle : flags 0x03, roue 6 octets puis manivelle
r = ctx.parseCsc(dv(0x03, 1, 0, 0, 0, 0x00, 0x04, 0x20, 0x00, 0x00, 0x08));
check("roue + manivelle : roue lue puis manivelle au bon décalage", r.toursRoue === 1 && r.tempsRoue === 1024 && r.tours === 32 && r.temps === 2048, r);
// roue seule : pas de manivelle
r = ctx.parseCsc(dv(0x01, 5, 0, 0, 0, 0x00, 0x04));
check("roue seule : pas de données de manivelle", r.tours === undefined && r.toursRoue === 5, r);
// cadence : 2 tours en 1,5 s = 80 tr/min
check("cadence : 2 tours en 1,5 s = 80", Math.abs(ctx.cadenceManivelle({ tours: 100, temps: 1000 }, { tours: 102, temps: 1000 + 1536 }) - 80) < 1e-9);
check("cadence : débordement des compteurs 16 bits", Math.abs(ctx.cadenceManivelle({ tours: 65535, temps: 65000 }, { tours: 1, temps: 500 }) - (2 / ((500 + 536) / 1024) * 60)) < 1e-9);
check("cadence : pas de nouveau tour = valeur inchangée (undefined)", ctx.cadenceManivelle({ tours: 7, temps: 300 }, { tours: 7, temps: 300 }) === undefined);
check("cadence : premier paquet sans précédent = undefined", ctx.cadenceManivelle(null, { tours: 7, temps: 300 }) === undefined);
console.log(ok + " OK, " + ko + " KO");
