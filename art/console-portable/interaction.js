'use strict';
const shells=[...document.querySelectorAll('.console')],heldKeys=new Set(),heldPointer=new Set();
let pad={direction:'center',a:false,b:false,start:false,select:false},lastState='',polling=false;
const mapping={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyZ:'b',KeyX:'a',Enter:'start',ShiftLeft:'select',ShiftRight:'select'};
const arrows={center:'',up:'M-4-17L0-22L4-17Z',down:'M-4 17L0 22L4 17Z',left:'M-17-4L-22 0L-17 4Z',right:'M17-4L22 0L17 4Z'};
for(const el of shells){
 const mode=el.dataset.mode,l=CONSOLE_LAYOUTS[mode];el.querySelector('.art').innerHTML=consoleArtwork(mode);
 const add=(key,label,x,y,w,h)=>{const b=document.createElement('button');b.type='button';b.className='hit';b.setAttribute('aria-label',label);b.dataset.key=key;b.style.cssText=`left:${x/360*100}%;top:${y/580*100}%;width:${w/360*100}%;height:${h/580*100}%`;
 b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);heldPointer.add(key);render()};
 const release=()=>{heldPointer.delete(key);render()};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
 b.onkeydown=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();heldPointer.add(key);render()}};
 b.onkeyup=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();release()}};b.onblur=release;el.append(b);
 };
 add('up','Croix vers le haut',l.pad.x-10,l.pad.y-30,20,20);add('down','Croix vers le bas',l.pad.x-10,l.pad.y+10,20,20);add('left','Croix vers la gauche',l.pad.x-30,l.pad.y-10,20,20);add('right','Croix vers la droite',l.pad.x+10,l.pad.y-10,20,20);
 l.buttons.forEach((b,i)=>add(i===0?'b':'a',i===0?'Bouton B':'Bouton A',b.x-17,b.y-17,34,34));
 add('select','Select',145,l.systemY-8,31,15);add('start','Start',187,l.systemY-8,31,15);
}
function render(){
 const keys=new Set([...heldKeys].map(k=>mapping[k]).filter(Boolean));for(const k of heldPointer)keys.add(k);
 const direction=['up','down','left','right'].find(k=>keys.has(k))||pad.direction;
 const a=keys.has('a')||pad.a,b=keys.has('b')||pad.b,start=keys.has('start')||pad.start,select=keys.has('select')||pad.select;
 for(const el of shells){el.querySelector('[data-direction]').setAttribute('d',arrows[direction]);el.querySelector('[data-pad]').classList.toggle('pressed',direction!=='center');el.querySelector('[data-face="a"]').classList.toggle('pressed',a);el.querySelector('[data-face="b"]').classList.toggle('pressed',b);
  el.querySelectorAll('button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.key===direction||btn.dataset.key==='a'&&a||btn.dataset.key==='b'&&b||btn.dataset.key==='start'&&start||btn.dataset.key==='select'&&select)));
 }
 const labels={up:'Haut',down:'Bas',left:'Gauche',right:'Droite',center:''};const parts=[labels[direction],a?'A':'',b?'B':'',start?'Start':'',select?'Select':''].filter(Boolean),state=parts.join(' + ')||'Prêt · clavier ou manette';
 if(state!==lastState){document.querySelector('#state').textContent=state;lastState=state}
}
window.addEventListener('keydown',e=>{if(!mapping[e.code]||e.target.closest('button'))return;e.preventDefault();heldKeys.add(e.code);render()});
window.addEventListener('keyup',e=>{heldKeys.delete(e.code);render()});
window.addEventListener('blur',()=>{heldKeys.clear();heldPointer.clear();pad={direction:'center',a:false,b:false,start:false,select:false};render()});
function poll(){
 const gamepads=navigator.getGamepads?navigator.getGamepads():[],gp=[...gamepads].find(Boolean);
 if(!gp){polling=false;pad={direction:'center',a:false,b:false,start:false,select:false};render();return}
 const pressed=i=>!!gp.buttons[i]?.pressed,x=gp.axes[0]||0,y=gp.axes[1]||0;
 pad={direction:pressed(12)||y<-.4?'up':pressed(13)||y>.4?'down':pressed(14)||x<-.4?'left':pressed(15)||x>.4?'right':'center',a:pressed(0),b:pressed(1),start:pressed(9),select:pressed(8)};render();requestAnimationFrame(poll);
}
window.addEventListener('gamepadconnected',()=>{if(!polling){polling=true;poll()}});window.addEventListener('gamepaddisconnected',()=>{if(!polling)render()});render();
