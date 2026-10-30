const fs=require('fs'),path=require('path'),assert=require('assert');
const {createCanvas,loadImage}=require('/Users/florent/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const {dessinerCroix,BASCULES}=require('./mecanique');
(async()=>{
 const dir=path.resolve(__dirname,'../..'),atlas=JSON.parse(fs.readFileSync(path.join(dir,'commandes/atlas.json'))),images={};
 for(const key of ['croix-socle','croix-capot'])images[atlas[key].image]=await loadImage(path.join(dir,atlas[key].image));
 const sheet=createCanvas(1280,256),sg=sheet.getContext('2d');let socketCalls=[];
 for(const [i,d] of ['neutre','haut','bas','gauche','droite'].entries()){
  const c=createCanvas(256,256),g=c.getContext('2d');dessinerCroix(g,{x:128,y:128,w:150},d,images,atlas);sg.drawImage(c,i*256,0);
  fs.writeFileSync(path.join(dir,'commandes','croix-'+d+'-composee-v2.png'),c.toBuffer('image/png'));
  // Record the socket draw call before any cap-specific transform.
  const calls=[],mock={save(){},restore(){},translate(){},transform(...args){assert.equal(args.length,6,'Canvas transform needs six arguments')},drawImage(...args){calls.push(args.slice(1))}};
  dessinerCroix(mock,{x:340,y:977,w:116},d,images,atlas);socketCalls.push(calls[0]);
 }
 for(const c of socketCalls)assert.deepEqual(c,socketCalls[0]);
 assert(Math.abs((1-BASCULES.haut[3])-(BASCULES.bas[3]-1))<1e-12);
 fs.writeFileSync(path.join(dir,'commandes/planche-croix-v2.png'),sheet.toBuffer('image/png'));
 console.log('Socle : mêmes coordonnées et dimensions dans les cinq états. Amplitude haut/bas symétrique.');
})();
