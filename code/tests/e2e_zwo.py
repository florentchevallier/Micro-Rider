# Lecture des .zwo : paliers à Power, paliers à PowerLow/PowerHigh (export Sufferfest), rampes, BOM
from playwright.sync_api import sync_playwright
res = []
def check(n, c, d=""):
    res.append(bool(c)); print(("OK  " if c else "KO  ") + n + ("" if c else "   -> " + str(d)))
X = lambda corps: '<?xml version="1.0"?><workout_file><name>T</name><workout>%s</workout></workout_file>' % corps
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto("file:///home/claude/mr/code/micro-rider.html"); pg.wait_for_timeout(800)
    lire = lambda t: pg.evaluate("(t)=>{try{return {ok:true,s:Seances.lireZwo(t)}}catch(e){return {ok:false,e:e.message}}}", t)
    r = lire(X('<SteadyState Duration="60" Power="0.5"/>'))
    check("Power classique", r["ok"] and r["s"]["etapes"][0]["pct"] == 50, r)
    r = lire(X('<SteadyState Duration="226.8" PowerHigh="0.660" PowerLow="0.660"/>'))
    check("PowerLow = PowerHigh : palier à 66 %", r["ok"] and abs(r["s"]["etapes"][0]["pct"] - 66) < 1e-9 and r["s"]["etapes"][0]["s"] == 226.8, r)
    r = lire(X('<SteadyState Duration="60" PowerLow="0.5" PowerHigh="0.8"/>'))
    check("PowerLow ≠ PowerHigh : rampe 50 → 80 %", r["ok"] and abs(r["s"]["etapes"][0]["pct0"] - 50) < 1e-9 and abs(r["s"]["etapes"][0]["pct1"] - 80) < 1e-9, r)
    r = lire(X('<SteadyState Duration="60"/>'))
    check("sans aucune puissance : erreur claire", not r["ok"] and "PowerLow" in r["e"], r)
    r = lire("﻿" + X('<SteadyState Duration="60" Power="0.5"/>'))
    check("fichier commençant par un BOM accepté", r["ok"], r)
    r = lire(X('<FreeRide Duration="60" FlatRoad="1"><textevent timeoffset="5" message="Go"/></FreeRide>'))
    check("FreeRide avec textevent", r["ok"] and r["s"]["etapes"][0].get("libre") is True, r)
    b.close()
print(sum(res), "OK,", len(res) - sum(res), "KO")
