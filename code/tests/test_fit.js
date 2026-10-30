// Génère un .fit de test (avec une pause) pour le relire avec fitdecode (test_fit.py).
const Sortie = require("../code/js/sortie.js"), Fit = require("../code/js/fit.js");
const s = Sortie.creer(); const t = Date.UTC(2026, 9, 28, 17, 0, 0);
for (let i = 0; i < 120; i++) { const sauter = i >= 60 ? 30000 : 0; s.ajouter(t + i * 1000 + sauter, 150 + (i % 7) * 10, 85, i < 20 ? 0 : 110 + i / 4, i * 7, 7); }
require("fs").writeFileSync(process.argv[2] || "/tmp/test.fit", Fit.versFit(s, ["Zwift Hub", "HW9 20937", "CAD-BLE0864031"]));
console.log("ok");
