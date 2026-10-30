'use strict';
const PUPITRES={
 classique:{cross:{x:340,y:977,w:116},b:{x:644,y:987,w:81},a:{x:735,y:987,w:81},select:{x:477,y:999,w:51},start:{x:549,y:999,w:51}},
 grand:{cross:{x:330,y:1062,w:110},b:{x:641,y:1064,w:81},a:{x:733,y:1064,w:81},select:{x:472,y:1070,w:51},start:{x:546,y:1070,w:51}}
};
function dessinerPupitre(g,mode,state,images,atlas){
 g.clearRect(0,0,1024,1536);g.drawImage(images[mode],0,0,1024,1536);
 const place=PUPITRES[mode];
 function sprite(key,p){const a=atlas[key],im=images[a.image],s=p.w/a.visibleWidth;g.drawImage(im,0,0,im.width,im.height,p.x-a.anchor[0]*s,p.y-a.anchor[1]*s,im.width*s,im.height*s)}
 sprite('croix-'+state.direction,place.cross);
 for(const name of ['a','b'])sprite('bouton-'+(state[name]?'enfonce':'relache'),place[name]);
 for(const name of ['select','start'])sprite('touche-'+(state[name]?'enfoncee':'relachee'),place[name]);
}
if(typeof module!=='undefined')module.exports={PUPITRES,dessinerPupitre};
