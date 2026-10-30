from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':900})
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/mr/code/micro-rider.html'); pg.wait_for_timeout(2500)
    print('info:', pg.inner_text('#info'))
    pg.screenshot(path='shots/s1_promenade.png')
    pg.evaluate('MR.borne(true)'); pg.wait_for_timeout(2500)
    print('info:', pg.inner_text('#info'))
    pg.screenshot(path='shots/s2_arcade.png')
    print('errs', errs)
    b.close()
