const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,loadImage}=require('/Users/florent/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const {PUPITRES,dessinerPupitre}=require('../dessin-commandes');
(async()=>{
 const dir=path.dirname(__dirname),atlas=JSON.parse(fs.readFileSync(path.join(__dirname,'atlas.json'))),images={};
 for(const mode of ['classique','grand'])images[mode]=await loadImage(path.join(dir,mode+'-sans-commandes.png'));
 for(const a of Object.values(atlas))images[a.image]=await loadImage(path.join(dir,a.image));
 assert.equal(Object.keys(atlas).length,11);
 for(const mode of ['classique','grand'])for(const direction of ['neutre','haut','bas','gauche','droite']){
  const c=createCanvas(1024,1536);dessinerPupitre(c.getContext('2d'),mode,{direction,a:direction==='haut',b:false,start:false,select:false},images,atlas);
  if(direction==='neutre'||direction==='haut')fs.writeFileSync(path.join(dir,'apercu-'+mode+'-'+direction+'.png'),c.toBuffer('image/png'));
 }
 // Check actual input-state computation and canvas hit regions from the page script.
 let src=fs.readFileSync(path.join(dir,'essai-commandes.js'),'utf8');src=src.slice(0,src.indexOf('const files='));
 const handlers={},stateNode={textContent:''},dummy={hidden:false,textContent:'',setAttribute(){}};
 const ctx={PUPITRES,POCKET_ATLAS:atlas,dessinerPupitre,document:{querySelectorAll:()=>[],querySelector:s=>s==='#controlState'?stateNode:dummy},window:{addEventListener:(n,f)=>handlers[n]=f},navigator:{},requestAnimationFrame(){},Image:function(){},console};vm.createContext(ctx);vm.runInContext(src,ctx);
 const run=s=>vm.runInContext(s,ctx),target={closest:()=>null};
 handlers.keydown({code:'ArrowLeft',target,preventDefault(){}});assert.equal(run('activeState().direction'),'gauche');handlers.keyup({code:'ArrowLeft'});assert.equal(run('activeState().direction'),'neutre');
 handlers.keydown({code:'KeyX',target,preventDefault(){}});assert(run('activeState().a'));handlers.blur();assert(!run('activeState().a'));
 const canvas={dataset:{cabinet:'classique'},getBoundingClientRect:()=>({left:0,top:0,width:1024,height:1536})};ctx.testCanvas=canvas;
 assert.equal(run('hit(testCanvas,{clientX:735,clientY:987})'),'a');assert.equal(run('hit(testCanvas,{clientX:340,clientY:935})'),'haut');assert.equal(run('hit(testCanvas,{clientX:500,clientY:500})'),null);
 console.log('Vérifié : 11 sprites/couches, cinq directions sur les deux coques, A/X, relâchement et perte de focus, zones de clic.');
})();
