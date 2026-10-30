'use strict';
const $=s=>document.querySelector(s),canvas=$('#scene'),g=canvas.getContext('2d');
const workout=[{min:5,w:110,z:1},{min:3,w:160,z:2},{min:3,w:210,z:3},{min:2,w:250,z:4},{min:2,w:290,z:5},{min:1,w:345,z:6},{min:4,w:115,z:1},{min:2,w:250,z:4},{min:2,w:290,z:5},{min:1,w:345,z:6},{min:4,w:115,z:1},{min:2,w:250,z:4},{min:2,w:290,z:5},{min:1,w:345,z:6},{min:4,w:105,z:1}];
const colors=['','#858b9d','#2bbbea','#4bcd75','#ffdc43','#ff933b','#fc585b'];const duration=workout.reduce((a,b)=>a+b.min,0);
let travel=0,phase=0,time=0,last=null,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,ready=false;
const images={};Promise.all(['pedalage','asphalte','paves'].map(k=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{images[k]=im;ok()};im.onerror=()=>no(Error('Impossible de charger '+k+'.png'));im.src=k+'.png'}))).then(()=>{ready=true;draw()}).catch(e=>$('#error').textContent=e.message);
function text(t,x,y,size=14,c='#fff'){g.fillStyle=c;g.font=`bold ${size}px monospace`;g.fillText(t,x,y)}
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h)}
const SCENE={top:64,height:800,bottom:864,width:1200,sourceWidth:1536,sourceHeight:1024};
// Mirrored adjacent tiles share the exact same edge pixels. A 2 px overdraw
// covers sampling gaps without stretching the art or cross-fading buildings.
function band(im,sy,sh,factor){
 const tile=1200,position=travel*factor,index=Math.floor(position/tile),offset=position-index*tile;
 const y=64+sy*800/1024,h=sh*800/1024;
 for(let i=-1;i<=1;i++){
   const n=index+i,x=Math.round(i*tile-offset);
   g.save();g.beginPath();g.rect(x,y,tile+2,h);g.clip();
   if(((n%2)+2)%2){g.translate(x+tile,y);g.scale(-1,1);g.drawImage(im,0,sy,1536,sh,-2,0,tile+4,h)}
   else g.drawImage(im,0,sy,1536,sh,x-2,y,tile+4,h);
   g.restore();
 }
}
function scene(){
 const surface=$('#surface').value,im=images[surface],split=surface==='paves'?636:600;
 g.save();g.beginPath();g.rect(0,64,1200,800);g.clip();
 // Both bands come straight from the approved full-scene illustration.
 band(im,0,split,.28);
 band(im,split,1024-split,1);
 const feet=64+800*(surface==='paves'?.83:.81);
 g.fillStyle='rgba(13,28,48,.23)';g.beginPath();g.ellipse(350,feet,107,6,0,0,Math.PI*2);g.fill();
 const f=RIDER_ATLAS.pedalage.frames[Math.floor(phase)%8];g.save();g.translate(350,feet-122);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(images.pedalage,f.x,f.y,f.w,f.h,-130,-130,260,260);g.restore();
 g.restore();
}
function training(){
 rect(0,864,1200,158,'#0c1c34');rect(0,864,1200,2,'#426581');const minute=(time*5)%duration;let cursor=0,current=workout[0],start=0;for(const b of workout){if(minute>=cursor){current=b;start=cursor}cursor+=b.min}
 text('ENTRAÎNEMENT',26,897,18,'#eaf3ff');text('CIBLE',26,924,12,'#9db4d0');text(current.w+' W',26,954,28,colors[current.z]);text('ZONE '+current.z,26,982,13,colors[current.z]);
 const x0=245,width=920,bottom=977,scale=92/360;let elapsed=0;
 for(const b of workout){const x=x0+elapsed/duration*width,w=b.min/duration*width,h=b.w*scale;rect(x,bottom-h,w-2,h,colors[b.z]);elapsed+=b.min}
 rect(x0,bottom,width,1,'#72839e');const px=x0+minute/duration*width;rect(px-1,876,3,106,'#fff');g.fillStyle='#fff';g.beginPath();g.moveTo(px-5,872);g.lineTo(px+5,872);g.lineTo(px,879);g.fill();
 for(let t=0;t<=duration;t+=10)text(t+':00',x0+t/duration*width,997,11,'#91a8c4');text('PUISSANCE ↑  /  DURÉE →',x0,1016,10,'#91a8c4');text('Z1     Z2     Z3     Z4     Z5     Z6',845,1016,10,'#91a8c4');
 return current;
}
function draw(){if(!ready)return;g.clearRect(0,0,1200,1022);scene();const current=training();rect(0,0,1200,64,'#0b1930');text('MICRO RIDER',24,39,23,'#4ee7e8');text(current.w+' W',320,39,22,'#ffdd62');text($('#cadence').value+' RPM',490,39,22,'#6fe8df');text($('#speed').value+' KM/H',680,39,22);text($('#surface').value==='paves'?'PAVÉS':'ASPHALTE',900,36,14,'#a3bcd7');text('BALADE',1085,36,12,'#a3bcd7')}
function update(dt){if(!playing)return;travel+=Number($('#speed').value)*4*dt;phase=(phase+Number($('#cadence').value)/60*8*dt)%8;time+=dt/60;}
function tick(t){const dt=last===null?0:Math.min(.05,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(tick)}
function sync(){$('#sv').value=$('#speed').value+' km/h';$('#cv').value=$('#cadence').value+' rpm';$('#play').textContent=playing?'Pause':'Lecture';$('#play').setAttribute('aria-pressed',String(playing))}document.querySelectorAll('input,select').forEach(e=>e.oninput=sync);$('#play').onclick=()=>{playing=!playing;sync()};$('#restart').onclick=()=>{travel=0;phase=time=0;last=null;draw()};sync();requestAnimationFrame(tick);
