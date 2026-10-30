'use strict';
const $=s=>document.querySelector(s),canvas=$('#scene'),g=canvas.getContext('2d');
const workout=[{min:5,w:110,z:1},{min:3,w:160,z:2},{min:3,w:210,z:3},{min:2,w:250,z:4},{min:2,w:290,z:5},{min:1,w:345,z:6},{min:4,w:115,z:1},{min:2,w:250,z:4},{min:2,w:290,z:5},{min:1,w:345,z:6},{min:4,w:115,z:1},{min:2,w:250,z:4},{min:2,w:290,z:5},{min:1,w:345,z:6},{min:4,w:105,z:1}];
const colors=['','#858b9d','#2bbbea','#4bcd75','#ffdc43','#ff933b','#fc585b'];const duration=workout.reduce((a,b)=>a+b.min,0);
let travel=400,phase=0,time=0,last=null,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,ready=false,jump=0,jv=0,crest=Math.floor((750-1100)/1800),prevGrade=2,altitude=0;
const images={};Promise.all(['paysage','village','pedalage'].map(k=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{images[k]=im;ok()};im.onerror=()=>no(Error('Impossible de charger '+k+'.png'));im.src=k+'.png'}))).then(()=>{ready=true;draw()}).catch(e=>$('#error').textContent=e.message);
function text(t,x,y,size=14,c='#fff'){g.fillStyle=c;g.font=`bold ${size}px monospace`;g.fillText(t,x,y)}
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h)}
function bump(x){if(!$('#bumps').checked)return 0;let dx=((x-1100+900)%1800+1800)%1800-900;return -24*Math.exp(-dx*dx/(2*60*60))}
function wave(x){return Math.sin(x/530)*12+bump(x)}
function road(x){return 525-Number($('#grade').value)/100*(x-350)*.72+wave(travel+x)-wave(travel+350)}
function tiles(im,factor,width,y,height){let offset=travel*factor%width;for(let x=-offset-width;x<1200;x+=width)g.drawImage(im,x,y,width,height)}
function scene(){
 g.save();g.beginPath();g.rect(0,64,1200,558);g.clip();rect(0,64,1200,558,'#74cced');
 const vertical=Math.sin(altitude/250)*27;
 tiles(images.paysage,.09,1800,56+vertical*.22,570);
 // The near village follows the road locally while distant scenery shifts much less.
 const im=images.village,iw=1800,ih=iw*im.height/im.width,offset=travel*.43%iw;
 for(let bx=-offset-iw;bx<1200;bx+=iw){for(let sx=0;sx<iw;sx+=12){let screen=bx+sx;g.drawImage(im,sx/iw*im.width,0,12/iw*im.width,im.height,screen,road(screen)-26-ih*.865,12.5,ih)}}
 // Road geometry and surface markings share the same profile: no sprite sliding.
 g.beginPath();g.moveTo(0,road(0)-22);for(let x=0;x<=1200;x+=6)g.lineTo(x,road(x)-22);g.lineTo(1200,640);g.lineTo(0,640);g.closePath();g.fillStyle='#596777';g.fill();
 g.beginPath();for(let x=0;x<=1200;x+=6){if(!x)g.moveTo(x,road(x)-22);else g.lineTo(x,road(x)-22)}g.lineWidth=11;g.strokeStyle='#e6cf9f';g.stroke();g.lineWidth=3;g.strokeStyle='#fff0c7';g.stroke();
 // Fine deterministic aggregate moves with world position, rather than flashing each frame.
 for(let i=0;i<850;i++){let wx=i*47,x=((wx-travel)%1280+1280)%1280-40,y=road(x)+((i*19)%105)-13;if(y<620)rect(x,y,2+i%5,1,i%3?'#28394b2c':'#e6d0af32')}
 for(let wx=Math.floor(travel/175)*175;wx<travel+1400;wx+=175){let x=wx-travel;g.beginPath();g.moveTo(x,road(x)+48);for(let u=0;u<=80;u+=8)g.lineTo(x+u,road(x+u)+48);g.strokeStyle='#fff1cf';g.lineWidth=5;g.stroke()}
 if($('#bumps').checked){for(let b=Math.floor((travel-1100)/1800);b<Math.ceil((travel+1200-1100)/1800)+1;b++){let x=1100+b*1800-travel;if(x< -80||x>1280)continue;g.save();g.globalAlpha=.8;for(let j=-35;j<=35;j+=14){g.beginPath();g.moveTo(x+j,road(x+j)-12);g.lineTo(x+j+9,road(x+j+9)+18);g.strokeStyle='#edc980';g.lineWidth=5;g.stroke()}g.restore()}}
 const rear=road(277),front=road(424),base=(rear+front)/2,angle=Math.atan2(front-rear,147);
 g.save();g.translate(350,base);g.rotate(angle);g.fillStyle=`rgba(13,28,48,${.25*Math.max(.2,1-jump/65)})`;g.beginPath();g.ellipse(0,1,105-jump*.25,6,0,0,Math.PI*2);g.fill();g.restore();
 const f=RIDER_ATLAS.pedalage.frames[Math.floor(phase)%8];g.save();g.translate(350,base-122-jump);g.rotate(angle+(jump>0?-.025:0));g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(images.pedalage,f.x,f.y,f.w,f.h,-130,-130,260,260);g.restore();
 // Small foreground verge, kept below the rider and moving faster than the village.
 for(let x=-travel%130-130;x<1300;x+=130){let y=road(x)+99;rect(x,y,38,3,'#adbc8e');for(let j=0;j<3;j++){g.fillStyle=['#567b61','#5f936c','#efbb66'][j];g.beginPath();g.ellipse(x+12+j*9,y+7,5,7+j*2,-.4,0,Math.PI*2);g.fill()}}
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
function draw(){if(!ready)return;g.clearRect(0,0,1200,780);scene();const current=training();rect(0,0,1200,64,'#0b1930');text('MICRO RIDER',24,39,23,'#4ee7e8');text(current.w+' W',320,39,22,'#ffdd62');text($('#cadence').value+' RPM',490,39,22,'#6fe8df');text($('#speed').value+' KM/H',680,39,22);text((Number($('#grade').value)>0?'+':'')+$('#grade').value+' %',875,39,22,'#ffce93');text('LA PROMENADE',1025,36,12,'#a3bcd7')}
function update(dt){if(!playing)return;const v=Number($('#speed').value),distance=v*4*dt;travel+=distance;phase=(phase+Number($('#cadence').value)/60*8*dt)%8;time+=dt/60;altitude+=distance*Number($('#grade').value)/100;let next=Math.floor((travel+350-1100)/1800);if(next>crest&&$('#bumps').checked&&v>=20&&jump<=0)jv=Math.min(150,80+v*1.1);crest=next;if(jv!==0||jump>0){jump+=jv*dt;jv-=360*dt;if(jump<0){jump=0;jv=0}}}
function tick(t){const dt=last===null?0:Math.min(.05,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(tick)}
function sync(){$('#sv').value=$('#speed').value+' km/h';$('#cv').value=$('#cadence').value+' rpm';$('#gv').value=$('#grade').value+' %';$('#play').textContent=playing?'Pause':'Lecture';$('#play').setAttribute('aria-pressed',String(playing))}document.querySelectorAll('input').forEach(e=>e.oninput=sync);$('#play').onclick=()=>{playing=!playing;sync()};$('#restart').onclick=()=>{travel=400;phase=time=jump=jv=altitude=0;crest=-1;last=null;draw()};sync();requestAnimationFrame(tick);
