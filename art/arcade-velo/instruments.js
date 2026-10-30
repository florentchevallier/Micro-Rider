/* Instrument surfaces calibrated in the 1024 × 1536 artwork coordinate space.
   The image owns the bezel, glass and dial markings. Only variable data is drawn. */
(function(scope){
'use strict';
const NS='http://www.w3.org/2000/svg';
const palette=['#29b6f6','#83d24b','#ffe52f','#ff9c27','#ff3b35','#c91850','#b966ff'];
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
const color=(i,n)=>palette[Math.min(6,Math.floor(i/Math.max(1,n-1)*7))];
function point(x,y,r,a){a*=Math.PI/180;return [x+r*Math.cos(a),y+r*Math.sin(a)]}
function render(root,id,mode,values,time=0,enabled=true){
 root.replaceChildren();root.setAttribute('viewBox','0 0 1024 1536');root.setAttribute('preserveAspectRatio','none');
 const ratio=[clamp(values.hr/200),clamp(values.watts/500),clamp(values.rpm/140),clamp(values.speed/60)];
 function el(tag,attrs,parent=root){const n=root.ownerDocument.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));parent.append(n);return n}
 function live(tag,attrs){return el(tag,{...attrs,'data-live':'true'})}
 function line(points,c,w=1.5){return live('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:c,'stroke-width':w,'stroke-linecap':'round','stroke-linejoin':'round'})}
 function needle(x,y,r,f,c='#a92625',start=-220,sweep=260){const q=point(x,y,r,start+f*sweep);line([[x,y],q],c,2.4);live('circle',{cx:x,cy:y,r:3,fill:'#81341c'})}
 function bars(x,y,w,h,n,f,spacing=2,c=null){for(let j=0;j<Math.floor(f*n+1e-6);j++)live('rect',{x,y:y-j*(h+spacing),width:w,height:h,rx:.7,fill:c||color(j,n)})}
 // Nothing variable is painted over the inactive artwork in the off state.
 if(!enabled)return;
 if(id==='original'){
  const q=mode==='jeu'?[[445,1297],[560,1297],[576,1373],[429,1373]]:[[435,1040],[575,1040],[582,1098],[426,1098]];
  function map(x,y){const u=x/360,v=y/200;return [(1-v)*((1-u)*q[0][0]+u*q[1][0])+v*((1-u)*q[3][0]+u*q[2][0]),(1-v)*((1-u)*q[0][1]+u*q[1][1])+v*((1-u)*q[3][1]+u*q[2][1])]}
  function poly(points,c,lit=false){return (lit?live:el)('polygon',{points:points.map(p=>map(...p).join(',')).join(' '),fill:c})}
  function rect(x,y,w,h,c,lit){poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],c,lit)}
  function text(x,y,t,c,size=8){const p=map(x,y);el('text',{x:p[0],y:p[1],fill:c,'font-family':'monospace','font-size':size*.38,'text-anchor':'middle'}).textContent=t}
  function ring(cx,cy,r1,r2,a,b,c,lit){const pts=[];for(let j=0;j<=4;j++)pts.push(point(cx,cy,r2,a+(b-a)*j/4));for(let j=4;j>=0;j--)pts.push(point(cx,cy,r1,a+(b-a)*j/4));poly(pts,c,lit)}
  text(30,15,'HEART','#ffad73');text(167,15,'SPEED','#d494ff');text(294,15,'CADENCE','#ffb451');text(198,171,'POWER','#ffe875');
  for(let j=0;j<18;j++){const lit=j<Math.floor(ratio[0]*18+1e-6);rect(14,174-j*7.4,26,5,lit?color(j,18):'#14202a',lit)}
  for(let j=0;j<36;j++){const lit=j<Math.floor(ratio[3]*36+1e-6);ring(166,94,52,66,140+j*7.8,145.7+j*7.8,lit?color(j,36):'#14202a',lit)}
  for(let j=0;j<24;j++){const lit=j<Math.floor(ratio[2]*24+1e-6);ring(251,94,59,73,71.2-j*7,76-j*7,lit?color(j,24):'#14202a',lit)}
  for(let j=0;j<40;j++){const lit=j<Math.floor(ratio[1]*40+1e-6);rect(70+j*6.9,178-j*.1,4.8,12+j*.1,lit?color(j,40):'#14202a',lit)}
  text(166,97,'KM/H','#9daec0',10);text(285,97,'RPM','#bca06d',9);return;
 }
 if(id==='cassette'){
  const dy=mode==='jeu'?499:0;
  if(ratio[0]>0){const pts=[];for(let i=0;i<=110;i++){let phase=(i/110*3-time*.6)%1;phase=(phase+1)%1;const spike=Math.exp(-Math.pow((phase-.5)*25,2))-.45*Math.exp(-Math.pow((phase-.43)*35,2))-.3*Math.exp(-Math.pow((phase-.57)*30,2));pts.push([339+i,755+dy-spike*(15+ratio[0]*14)])}line(pts,'#69ffc1',1.6)}
  bars(479,786+dy,19,7,8,ratio[1],4,'#ffd54a');
  [ratio[2],ratio[3],ratio[1]].forEach((f,i)=>bars(536+i*31,779+dy,8,2,16,f,1.4,'#53e8df'));return;
 }
 if(id==='steampunk'){
  const d=mode==='jeu'?[[403,1270,29,0],[512,1257,42,2],[623,1271,29,1]]:[[404,802,29,0],[512,789,42,2],[621,802,29,1]];
  d.forEach(([x,y,r,m])=>needle(x,y,r,ratio[m]));return;
 }
 if(id==='neon'){
  const dy=mode==='jeu'?424:0;
  // Segments follow the existing semicircular dial, not a replacement panel.
  for(let j=0;j<36;j++){if(j>=Math.floor(ratio[3]*36+1e-6))break;const a=182+j*4.9;line([point(497,817+dy,59,a),point(497,817+dy,54,a)],color(j,36),2)}
  bars(595,843+dy,13,3.7,13,ratio[1],2.4,'#ffcc52');
  bars(409,826+dy,3.5,3,10,ratio[2],2,'#70ecff');
  if(ratio[0]>0){const pts=[];for(let i=0;i<85;i++)pts.push([480+i,840+dy-Math.abs(Math.sin(i*.24+time*3))*ratio[0]*13]);line(pts,'#ff6bdf',1.3)}return;
 }
 if(id==='giscard'){
  const dy=mode==='jeu'?480:0;
  needle(394,751+dy,27,ratio[0],'#35210e',-140,100);
  needle(579,751+dy,27,ratio[2],'#35210e',-140,100);
  // Wells and lamp centers are calibrated independently for both artworks.
  const wells=mode==='jeu'?[1266,1250,1234,1218,1202,1185]:[779,763,749,735,718,703];
  const columns=mode==='jeu'?[463,489]:[464,490];
  [ratio[1],ratio[3]].forEach((f,col)=>{const count=Math.floor(f*wells.length+1e-6);wells.slice(0,count).forEach(y=>live('rect',{x:columns[col],y,width:21,height:9,rx:.7,fill:col===0?'#ffc54d':'#ffb63a'}))});
  const lamps=mode==='jeu'?[[654.36,1186.47],[655.71,1206.8],[655.95,1226.81],[657.5,1247.78]]:[[651.94,703.15],[653.03,721.66],[653.63,741],[654.44,760.56]];
  [ratio[0],ratio[1],ratio[2],ratio[3]].forEach((f,i)=>{if(f>.05)live('circle',{cx:lamps[i][0],cy:lamps[i][1],r:3.6,fill:'#ff5c49'})});
 }
}
scope.MicroInstruments={render,palette};
})(typeof window==='undefined'?globalThis:window);
