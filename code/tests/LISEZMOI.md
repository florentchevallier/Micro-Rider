# Tests de Micro-Rider

Tests automatiques écrits pendant le développement (état au 2026-10-26, livraison r10).
- `test_*.js` : tests Node du noyau, de la sortie .tcx, des séances et du décodage CSC (`node test_noyau.js`).
- `e2e_*.py` : tests de bout en bout avec Playwright (Chromium sans écran) et un faux Bluetooth (`mock_ble.js`).
- `halos.py`, `montage.py`, `smoke.py`, `fluidite.py` : outils de contrôle visuel et de fluidité.

Attention : ces scripts ont été écrits pour l'environnement de travail de Claude. Les chemins (`/home/claude/mr/code/…`) et l'adresse locale `http://localhost:8765/code/…` (serveur `python3 -m http.server 8765` lancé dans le dossier parent de `code`) sont à adapter pour les lancer sur le Mac.
