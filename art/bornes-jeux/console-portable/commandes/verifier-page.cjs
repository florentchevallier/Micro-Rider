// Exercise all browser scripts in page order, with a strict Canvas API contract.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,loadImage}=require('/Users/florent/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
(async()=>{
 const root=path.dirname(__dirname),pending=[],handlers={},nodes={controlState:{textContent:''},error:{textContent:''},instructions:{hidden:false}},buttons=['interactive','clean','static'].map(version=>({dataset:{version},setAttribute(){}}));
 let transforms=0;
 const canvases=['classique','grand'].map(mode=>{
  const native=createCanvas(1024,1536),g=native.getContext('2d');
  const strict=new Proxy(g,{get(target,key){if(key==='transform')return (...args)=>{assert.equal(args.length,6,'Browser Canvas requires six transform arguments');transforms++;return target.transform(...args)};if(key==='drawImage')return (im,...args)=>target.drawImage(im.native||im,...args);const value=target[key];return typeof value==='function'?value.bind(target):value},set(target,key,value){target[key]=value;return true}});
  return {native,dataset:{cabinet:mode},getContext:()=>strict,focus(){},getBoundingClientRect:()=>({left:0,top:0,width:1024,height:1536})};
 });
 const previews=['classique','grand'].map(mode=>{const a={hidden:false};return {dataset:{variant:mode},closest:()=>a}});
 class BrowserImage{set src(src){pending.push(loadImage(path.join(root,src)).then(im=>{this.native=im;this.width=im.width;this.height=im.height;this.onload?.()}).catch(e=>this.onerror?.(e)))}}
 const context={console,Image:BrowserImage,navigator:{getGamepads:()=>[]},requestAnimationFrame(){},window:{addEventListener:(name,fn)=>handlers[name]=fn},document:{querySelector:s=>nodes[s.slice(1)],querySelectorAll:s=>s==='canvas[data-cabinet]'?canvases:s==='[data-version]'?buttons:s==='[data-variant]'?previews:[]}};
 vm.createContext(context);
 for(const name of ['commandes/atlas.js','commandes/correction-croix/mecanique.js','dessin-commandes.js','essai-commandes.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
 await Promise.all(pending);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(nodes.error.textContent,'');assert.equal(nodes.controlState.textContent,'Au repos');assert.equal(vm.runInContext('ready',context),true);assert.equal(transforms,2);
 const target={closest:()=>null};handlers.keydown({code:'ArrowUp',target,preventDefault(){}});assert.equal(nodes.controlState.textContent,'Haut');handlers.keyup({code:'ArrowUp'});handlers.keydown({code:'KeyX',target,preventDefault(){}});assert.equal(nodes.controlState.textContent,'A');handlers.keyup({code:'KeyX'});
 // Force a renderer exception: the context must still be restored before drawing again.
 vm.runInContext("const good=images[POCKET_ATLAS['croix-capot'].image];images[POCKET_ATLAS['croix-capot'].image]=null;try{draw()}catch{};images[POCKET_ATLAS['croix-capot'].image]=good;draw()",context);
 for(const c of canvases){const t=c.getContext().getTransform();assert.equal(t.e,0);assert.equal(t.f,0);fs.writeFileSync(path.join(root,'verification-page-'+c.dataset.cabinet+'.png'),c.native.toBuffer('image/png'))}
 console.log('Chargement complet, deux bornes, croix, boutons, relâchements et restauration du contexte vérifiés avec six arguments obligatoires pour transform().');
})();
