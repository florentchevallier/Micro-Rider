from playwright.sync_api import sync_playwright
from PIL import Image
import io
OUT="/home/claude/mr/shots/"
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1300,"height":1000}); pg.add_init_script(open('/home/claude/mr/tests/mock_ble.js').read())
    pg.goto("file:///home/claude/mr/code/micro-rider.html"); pg.wait_for_timeout(800)
    pg.click("[data-mode=arcade]"); pg.wait_for_timeout(2500)
    tuiles=[]
    for borne in ["steampunk","original","neon","cassette","giscard"]:
        for vue in ["menu","jeu"]:
            pg.evaluate(f"(async()=>{{ const a=document.querySelector('#borne'); a.value='{borne}'; a.dispatchEvent(new Event('change')); }})()")
            pg.evaluate(f"document.querySelector('#bascule').getAttribute('aria-checked')==='{'true' if vue=='jeu' else 'false'}' || document.querySelector('#bascule').click()")
            pg.wait_for_timeout(900)
            pg.evaluate("document.querySelectorAll('.halo').forEach(h=>h.classList.add('on'))")
            pg.wait_for_timeout(150)
            el=pg.query_selector(".machine"); png=el.screenshot()
            im=Image.open(io.BytesIO(png)); w,h=im.size
            y0=0.42 if vue=="menu" else 0.70
            tuiles.append(im.crop((0,int(h*y0),w,int(h*(y0+0.30)))).resize((520,int(520*0.30*h/w))))
    H=tuiles[0].height
    M=Image.new("RGB",(520*2,H*5))
    for i,t in enumerate(tuiles): M.paste(t,((i%2)*520,(i//2)*H))
    M.save(OUT+"halos.png"); print(M.size)
    b.close()
