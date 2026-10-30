import sys
from playwright.sync_api import sync_playwright
MOCK = open('/home/claude/mr/tests/mock_ble.js').read()
FTMS = "[0x44,0x00,0xC4,0x09,0xA0,0x00,0xFA,0x00]"
JS = """() => new Promise(r => { const d=[]; let last=null, n=0; const t0=performance.now();
  function f(t){ const x = MR.valeurs().distance; if(last!==null) d.push(x-last); last=x; if(t-t0<4000) requestAnimationFrame(f); else r(d); }
  requestAnimationFrame(f); })"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':900}); pg.add_init_script(MOCK)
    pg.goto('file:///home/claude/mr/code/micro-rider.html'); pg.wait_for_timeout(2000)
    pg.evaluate("window.__next='hub'"); pg.click('#bTrainer'); pg.wait_for_timeout(800)
    pg.evaluate(f"setInterval(()=>__m.emit(__m.bike,{FTMS}), 1000)"); pg.wait_for_timeout(6000)
    d = pg.evaluate(JS)
    nz = sum(1 for x in d if x <= 1e-9); n=len(d); moy=sum(d)/n
    var=(sum((x-moy)**2 for x in d)/n)**.5
    mx=max(d)
    print(f"{n} images en 4 s ({n/4:.0f}/s) ; images sans avance : {nz} ({100*nz/n:.0f} %) ; avance moyenne {moy*1000:.1f} mm ; écart-type/moyenne {var/moy:.2f} ; max/moyenne {mx/moy:.1f}")
    b.close()
