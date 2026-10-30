from playwright.sync_api import sync_playwright
from PIL import Image
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':1100})
    pg.goto('file:///home/claude/mr/code/micro-rider.html'); pg.wait_for_timeout(1500)
    pg.evaluate('MR.borne(true)'); pg.wait_for_timeout(2000)
    pg.evaluate("sim.open=true"); pg.fill('#sP','300'); pg.dispatch_event('#sP','input'); pg.fill('#sF','165'); pg.dispatch_event('#sF','input'); pg.fill('#sC','95'); pg.dispatch_event('#sC','input'); pg.evaluate("sim.open=false")
    ims=[]
    for borne in ['steampunk','original','neon','cassette','giscard']:
        pg.select_option('#borne',borne); pg.wait_for_timeout(2500)
        f=f'shots/m_{borne}.png'; pg.locator('.machine').screenshot(path=f); ims.append(Image.open(f))
        # détail bas (instruments)
        w,h=ims[-1].size; ims[-1].crop((0,int(h*.62),w,h)).save(f'shots/m_{borne}_bas.png')
    W=sum(i.size[0] for i in ims); H=max(i.size[1] for i in ims)
    m=Image.new('RGB',(W,H)); x=0
    for i in ims: m.paste(i,(x,0)); x+=i.size[0]
    m.thumbnail((2400,900)); m.save('shots/montage.png')
    b.close()
