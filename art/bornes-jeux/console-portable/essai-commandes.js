'use strict';
const surfaces=[...document.querySelectorAll('canvas[data-cabinet]')],images={},keyboard=new Set(),pointers=new Map();
let ready=false,version='interactive',gamepad={direction:'neutre',a:false,b:false,start:false,select:false},polling=false,previous='';
const keymap={ArrowUp:'haut',ArrowDown:'bas',ArrowLeft:'gauche',ArrowRight:'droite',KeyZ:'b',KeyX:'a',Enter:'start',ShiftLeft:'select',ShiftRight:'select'};
function activeState(){
 const held=new Set([...keyboard].map(k=>keymap[k]).filter(Boolean));for(const v of pointers.values())held.add(v);
 return {direction:['haut','bas','gauche','droite'].find(v=>held.has(v))||gamepad.direction,a:held.has('a')||gamepad.a,b:held.has('b')||gamepad.b,start:held.has('start')||gamepad.start,select:held.has('select')||gamepad.select};
}
function draw(){if(!ready)return;const state=activeState();for(const c of surfaces)dessinerPupitre(c.getContext('2d'),c.dataset.cabinet,state,images,POCKET_ATLAS);
 const labels={haut:'Haut',bas:'Bas',gauche:'Gauche',droite:'Droite',neutre:''},parts=[labels[state.direction],state.a?'A':'',state.b?'B':'',state.start?'Start':'',state.select?'Select':''].filter(Boolean),status=parts.join(' + ')||'Au repos';if(status!==previous){document.querySelector('#controlState').textContent=status;previous=status}}
function hit(canvas,e){const b=canvas.getBoundingClientRect(),x=(e.clientX-b.left)*1024/b.width,y=(e.clientY-b.top)*1536/b.height,p=PUPITRES[canvas.dataset.cabinet];
 const dx=x-p.cross.x,dy=y-p.cross.y;if(Math.abs(dx)<63&&Math.abs(dy)<57){if(Math.abs(dx)<12&&Math.abs(dy)<12)return null;return Math.abs(dx)>Math.abs(dy)?dx<0?'gauche':'droite':dy<0?'haut':'bas'}
 for(const key of ['a','b','start','select']){const s=p[key],rx=key==='a'||key==='b'?44:29,ry=key==='a'||key==='b'?32:18;if(((x-s.x)/rx)**2+((y-s.y)/ry)**2<=1)return key}return null}
for(const c of surfaces){
 c.onpointerdown=e=>{if(!ready||version!=='interactive')return;const control=hit(c,e);if(!control)return;e.preventDefault();c.focus({preventScroll:true});c.setPointerCapture(e.pointerId);pointers.set(e.pointerId,control);draw()};
 c.onpointermove=e=>{if(!pointers.has(e.pointerId))return;const control=hit(c,e);pointers.set(e.pointerId,control);draw()};
 const release=e=>{pointers.delete(e.pointerId);draw()};c.onpointerup=release;c.onpointercancel=release;c.onlostpointercapture=release;
}
window.addEventListener('keydown',e=>{if(version!=='interactive'||!keymap[e.code]||e.target.closest('button,a,input,select'))return;e.preventDefault();keyboard.add(e.code);draw()});
window.addEventListener('keyup',e=>{keyboard.delete(e.code);draw()});
window.addEventListener('blur',()=>{keyboard.clear();pointers.clear();gamepad={direction:'neutre',a:false,b:false,start:false,select:false};draw()});
function setVersion(next){version=next;keyboard.clear();pointers.clear();document.querySelectorAll('[data-version]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.version===next)));
 for(const c of surfaces)c.hidden=next!=='interactive';for(const im of document.querySelectorAll('[data-variant]')){const name=im.dataset.variant,src=name+(next==='static'?'':'-sans-commandes')+'.png';im.src=src;im.closest('a').href=src;im.closest('a').hidden=next==='interactive'}
 document.querySelector('#instructions').hidden=next!=='interactive';draw()}
document.querySelectorAll('[data-version]').forEach(b=>b.onclick=()=>{setVersion(b.dataset.version);if(version==='interactive')surfaces[0].focus({preventScroll:true})});
function poll(){
 let gp;try{gp=[...(navigator.getGamepads?.()||[])].find(Boolean)}catch{gp=null}
 if(!gp){polling=false;gamepad={direction:'neutre',a:false,b:false,start:false,select:false};draw();return}
 const pressed=i=>!!gp.buttons[i]?.pressed,x=gp.axes[0]||0,y=gp.axes[1]||0;
 gamepad={direction:pressed(12)||y<-.4?'haut':pressed(13)||y>.4?'bas':pressed(14)||x<-.4?'gauche':pressed(15)||x>.4?'droite':'neutre',a:pressed(0),b:pressed(1),start:pressed(9),select:pressed(8)};const stamp=JSON.stringify(gamepad);if(version==='interactive'&&stamp!==poll.last){draw();poll.last=stamp}requestAnimationFrame(poll);
}
window.addEventListener('gamepadconnected',()=>{if(!polling){polling=true;poll()}});
const files={classique:'classique-sans-commandes.png',grand:'grand-sans-commandes.png'};for(const a of Object.values(POCKET_ATLAS))files[a.image]=a.image;
Promise.all(Object.entries(files).map(([name,src])=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{images[name]=im;ok()};im.onerror=()=>no(Error('Chargement impossible : '+src));im.src=src}))).then(()=>{ready=true;setVersion('interactive')}).catch(e=>{ready=false;document.querySelector('#error').textContent=e.message;setVersion('clean')});
