'use strict';
// A fixed mounting socket and a single cap. Every tilt keeps the centre fixed.
const BASCULES={neutre:[1,0,0,1,0,0],haut:[1,0,0,.94,0,0],bas:[1,0,0,1.06,0,0],gauche:[1,-.055,0,1,0,0],droite:[1,.055,0,1,0,0]};
function dessinerCroix(g,p,direction,images,atlas){
 function couche(key,width,y=0,sy=1){const a=atlas[key],im=images[a.image],s=width/a.visibleWidth;g.drawImage(im,-a.anchor[0]*s,-a.anchor[1]*s*sy+y,im.width*s,im.height*s*sy)}
 g.save();
 try{
  g.translate(p.x,p.y);
  couche('croix-socle',p.w*.85,5,.82); // Never transformed by the state of the cap.
  g.save();
  try{g.transform(...(BASCULES[direction]||BASCULES.neutre));couche('croix-capot',p.w)}finally{g.restore()}
 }finally{g.restore()}
}
if(typeof module!=='undefined')module.exports={BASCULES,dessinerCroix};
