'use strict';
const $=s=>document.querySelector(s),canvas=$('#scene'),g=canvas.getContext('2d');
const workout=[{min:5,w:110,z:1},{min:3,w:160,z:2},{min:3,w:210,z:3},{min:2,w:250,z:4},{min:2,w:290,z:5},{min:1,w:345,z:6},{min:4,w:115,z:1},{min:2,w:250,z:4},{min:2,w:290,z:5},{min:1,w:345,z:6},{min:4,w:115,z:1},{min:2,w:250,z:4},{min:2,w:290,z:5},{min:1,w:345,z:6},{min:4,w:105,z:1}];
const colors=['','#858b9d','#2bbbea','#4bcd75','#ffdc43','#ff933b','#fc585b'];const duration=workout.reduce((a,b)=>a+b.min,0);
let travel=400,phase=0,time=0,last=null,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,ready=false;
const images={};Promise.all(['paysage','village','pedalage','asphalte','paves'].map(k=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{images[k]=im;ok()};im.onerror=()=>no(Error('Impossible de charger '+k+'.png'));im.src=k+'.png'}))).then(()=>{ready=true;draw()}).catch(e=>$('#error').textContent=e.message);
function text(t,x,y,size=14,c='#fff'){g.fillStyle=c;g.font=`bold ${size}px monospace`;g.fillText(t,x,y)}
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h)}
function layout(){const depth=558*Number($('#roadsize').value)/100;return{depth,top:622-depth,feet:622-depth*.34}}
function tiles(im,factor,width,y,height){let offset=travel*factor%width;for(let x=-offset-width;x<1200;x+=width)g.drawImage(im,x,y,width,height)}
function scene(){
 const {top,depth,feet}=layout();
 g.save();g.beginPath();g.rect(0,64,1200,558);g.clip();rect(0,64,1200,558,'#74cced');
 // Each layer is translated as one rigid image: no slicing, rotation or deformation.
 tiles(images.paysage,.09,1800,42,570);
 const road=images[$('#surface').value];tiles(road,1,$('#surface').value==='paves'?600:1500,top,depth);
 // Dashed lane boundary is horizontal and scrolls with the road, above the rider lane.
 if($('#surface').value==='asphalte'){
   for(let wx=Math.floor(travel/180)*180;wx<travel+1400;wx+=180){let x=wx-travel;rect(x,top+depth*.25,82,4,'#eee0ba');rect(x,top+depth*.25+4,82,1,'#776f60')}
 }
 // Preserve the village's native aspect ratio and a fixed level pavement baseline.
 const im=images.village,iw=1550,ih=iw*im.height/im.width;
 tiles(im,.43,iw,top-ih*.865+3,ih);
 // Subtle gutter belongs to the street edge and stays straight.
 rect(0,top+3,1200,3,'#3c48554d');
 g.save();g.translate(350,feet);g.fillStyle='rgba(13,28,48,.24)';g.beginPath();g.ellipse(0,1,105,6,0,0,Math.PI*2);g.fill();g.restore();
 const f=RIDER_ATLAS.pedalage.frames[Math.floor(phase)%8];g.save();g.translate(350,feet-122);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(images.pedalage,f.x,f.y,f.w,f.h,-130,-130,260,260);g.restore();
 g.restore();
}
function training(){
 rect(0,622,1200,158,'#0c1c34');rect(0,622,1200,2,'#426581');const minute=(time*5)%duration;let cursor=0,current=workout[0],start=0;for(const b of workout){if(minute>=cursor){current=b;start=cursor}cursor+=b.min}
 text('ENTRAÎNEMENT',26,655,18,'#eaf3ff');text('CIBLE',26,682,12,'#9db4d0');text(current.w+' W',26,712,28,colors[current.z]);text('ZONE '+current.z,26,740,13,colors[current.z]);
 const x0=245,width=920,bottom=735,scale=92/360;let elapsed=0;
 for(const b of workout){const x=x0+elapsed/duration*width,w=b.min/duration*width,h=b.w*scale;rect(x,bottom-h,w-2,h,colors[b.z]);elapsed+=b.min}
 rect(x0,bottom,width,1,'#72839e');const px=x0+minute/duration*width;rect(px-1,634,3,106,'#fff');g.fillStyle='#fff';g.beginPath();g.moveTo(px-5,630);g.lineTo(px+5,630);g.lineTo(px,637);g.fill();
 for(let t=0;t<=duration;t+=10)text(t+':00',x0+t/duration*width,755,11,'#91a8c4');text('PUISSANCE ↑  /  DURÉE →',x0,774,10,'#91a8c4');text('Z1     Z2     Z3     Z4     Z5     Z6',845,774,10,'#91a8c4');
 return current;
}
function draw(){if(!ready)return;g.clearRect(0,0,1200,780);scene();const current=training();rect(0,0,1200,64,'#0b1930');text('MICRO RIDER',24,39,23,'#4ee7e8');text(current.w+' W',320,39,22,'#ffdd62');text($('#cadence').value+' RPM',490,39,22,'#6fe8df');text($('#speed').value+' KM/H',680,39,22);text($('#surface').value==='paves'?'PAVÉS':'ASPHALTE',900,36,14,'#a3bcd7');text('BALADE',1085,36,12,'#a3bcd7')}
function update(dt){if(!playing)return;travel+=Number($('#speed').value)*4*dt;phase=(phase+Number($('#cadence').value)/60*8*dt)%8;time+=dt/60;}
function tick(t){const dt=last===null?0:Math.min(.05,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(tick)}
function sync(){$('#sv').value=$('#speed').value+' km/h';$('#cv').value=$('#cadence').value+' rpm';$('#rv').value=$('#roadsize').value+' %';$('#play').textContent=playing?'Pause':'Lecture';$('#play').setAttribute('aria-pressed',String(playing))}document.querySelectorAll('input,select').forEach(e=>e.oninput=sync);$('#play').onclick=()=>{playing=!playing;sync()};$('#restart').onclick=()=>{travel=400;phase=time=0;last=null;draw()};sync();requestAnimationFrame(tick);
