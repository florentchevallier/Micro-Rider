'use strict';
const $=s=>document.querySelector(s),canvas=$('#scene'),g=canvas.getContext('2d');
const workout=[{min:5,w:110,z:1},{min:3,w:160,z:2},{min:3,w:210,z:3},{min:2,w:250,z:4},{min:2,w:290,z:5},{min:1,w:345,z:6},{min:4,w:115,z:1},{min:2,w:250,z:4},{min:2,w:290,z:5},{min:1,w:345,z:6},{min:4,w:115,z:1},{min:2,w:250,z:4},{min:2,w:290,z:5},{min:1,w:345,z:6},{min:4,w:105,z:1}];
const colors=['','#858b9d','#2bbbea','#4bcd75','#ffdc43','#ff933b','#fc585b'];const duration=workout.reduce((a,b)=>a+b.min,0);
let travel=0,phase=0,time=0,last=null,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,ready=false;
const images={};Promise.all(['pedalage','facades-asphalte','facades-paves','sol-asphalte','asphalte-classique','asphalte-raccord','sol-paves','lointain','nuages'].map(k=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{images[k]=im;ok()};im.onerror=()=>no(Error('Impossible de charger '+k+'.png'));im.src=k+(k==='asphalte-raccord'?'.svg':'.png')}))).then(()=>{ready=true;draw()}).catch(e=>$('#error').textContent=e.message);
function text(t,x,y,size=14,c='#fff'){g.fillStyle=c;g.font=`bold ${size}px monospace`;g.fillText(t,x,y)}
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h)}
const SCENE={top:64,height:800,bottom:864,width:1200,sourceWidth:1536,sourceHeight:1024};
const PROJECTION={shear:.45,shadowDepth:.22};
function positions(factor,width){const world=travel*factor,index=Math.floor(world/width),offset=world-index*width;return[-1,0,1].map(i=>({index:index+i,x:i*width-offset}))}
function layer(im,factor,width,y,height,mirror=true){
 for(const tile of positions(factor,width)){
   const x=tile.x,flip=mirror&&((tile.index%2+2)%2===1);
   g.save();g.beginPath();g.rect(x,y,width+2,height);g.clip();
   if(flip){g.translate(x+width,y);g.scale(-1,1);g.drawImage(im,-2,0,width+4,height)}
   else g.drawImage(im,x-2,y,width+4,height);
   g.restore();
 }
}
function ground(surface,top){
 g.save();g.beginPath();g.rect(0,top,1200,864-top);g.clip();
 if(surface==='asphalte'){
   // Restore the approved illustrated road itself, including its painted light.
   const im=images['asphalte-raccord'],overlap=200*1200/1536,period=1200-overlap;
   // Opaque previous tile under the next tile's feathered left edge: no gap.
   for(const tile of positions(1,period))g.drawImage(im,tile.x,top,1200,864-top);
 }else{
   const im=images[surface==='paves'?'sol-paves':'sol-asphalte'],tileW=700,tileH=tileW*im.height/im.width;
   const compression=surface==='paves'?.375:1;
   // Exactly the validated comparison: fixed horizontal shear, compressed height.
   g.transform(1,0,PROJECTION.shear,compression,0,top);
   const shift=travel%tileW;
   for(let y=0;y<(864-top)/compression;y+=tileH){for(let x=-tileW-shift;x<1500;x+=tileW)g.drawImage(im,x-1,y-1,tileW+2,tileH+2)}
   if(surface==='asphalte-sombre')for(let x=-travel%180-180;x<1500;x+=180){rect(x,90,83,4,'#eadab5');rect(x,94,83,1,'#a99a83')}
 }
 g.restore();
}
function nearShadows(im,baseY,roadTop){
 const scale=1200/im.width,depth=PROJECTION.shadowDepth,side=depth*PROJECTION.shear;
 g.save();g.beginPath();g.rect(0,roadTop,1200,864-roadTop);g.clip();g.globalAlpha=.19;g.filter='brightness(0)';
 for(const tile of positions(1,1200)){
   const flip=((tile.index%2+2)%2===1),a=(flip?-1:1)*scale;
   // Silhouette and architecture use the same offset. Reflection affects the
   // architecture only: all projected shadows still point down and right.
   g.save();g.transform(a,0,-side*scale,-depth*scale,tile.x+(flip?1200:0)+side*scale*baseY,64+scale*baseY*(1+depth));g.drawImage(im,0,0);g.restore();
 }
 g.restore();
}
function birds(){
 // An independent ambient flock: first flight after 4 s, then every 28 s.
 const age=(time*60-4)%28;if(time*60<4||age>13)return;
 g.save();g.globalAlpha=Math.min(1,age/1.2,(13-age)/2);g.strokeStyle='#fff9dd';g.lineWidth=1.8;g.lineCap='round';
 for(let i=0;i<7;i++){
   const delay=i*.3,t=Math.max(0,age-delay),x=560+t*31+(i%3)*24,y=330-t*12-i*7+Math.sin(t*.8+i)*5;
   const span=5+(i%3),wing=Math.sin(t*7+i)*3.5;
   g.beginPath();g.moveTo(x-span,y-wing);g.lineTo(x-span*.45,y-wing-1.5);g.lineTo(x,y+1);g.lineTo(x+span*.45,y-wing-1.5);g.lineTo(x+span,y-wing);g.stroke();
 }
 g.restore();
}
function scene(){
 const surface=$('#surface').value,kind=surface==='paves'?'paves':'asphalte',fg=images['facades-'+kind],baseY=surface==='paves'?636:600,roadTop=64+(baseY-12)*800/1024;
 g.save();g.beginPath();g.rect(0,64,1200,800);g.clip();
 // Fixed sky; separate cloud and distant scenery layers behind real transparency.
 const sky=g.createLinearGradient(0,64,0,570);sky.addColorStop(0,'#39a9f6');sky.addColorStop(1,'#a3e2fa');g.fillStyle=sky;g.fillRect(0,64,1200,800);
 layer(images.nuages,.045,1800,-155,600);
 layer(images.lointain,.15,1440,24,480);
 birds();
 ground(surface,roadTop);
 if(surface!=='asphalte')nearShadows(fg,baseY,roadTop);
 // The sidewalk and facades share the exact world offset used by the road.
 layer(fg,1,1200,64,800);
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
function draw(){if(!ready)return;g.clearRect(0,0,1200,1022);scene();const current=training();rect(0,0,1200,64,'#0b1930');text('MICRO RIDER',24,39,23,'#4ee7e8');text(current.w+' W',320,39,22,'#ffdd62');text($('#cadence').value+' RPM',490,39,22,'#6fe8df');text($('#speed').value+' KM/H',680,39,22);text($('#surface').value==='paves'?'PAVÉS 37,5 %':$('#surface').value==='asphalte'?'ASPHALTE':'ASPHALTE SOMBRE',875,36,12,'#a3bcd7');text('BALADE',1085,36,12,'#a3bcd7')}
function update(dt){if(!playing)return;travel+=Number($('#speed').value)*4*dt;phase=(phase+Number($('#cadence').value)/60*8*dt)%8;time+=dt/60;}
function tick(t){const dt=last===null?0:Math.min(.05,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(tick)}
function sync(){$('#sv').value=$('#speed').value+' km/h';$('#cv').value=$('#cadence').value+' rpm';$('#play').textContent=playing?'Pause':'Lecture';$('#play').setAttribute('aria-pressed',String(playing))}document.querySelectorAll('input,select').forEach(e=>e.oninput=sync);$('#play').onclick=()=>{playing=!playing;sync()};$('#restart').onclick=()=>{travel=0;phase=time=0;last=null;draw()};sync();requestAnimationFrame(tick);
