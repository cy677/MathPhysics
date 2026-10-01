// Production slicing of the reviewed ImageGen atlases. Requires sharp only when regenerating PNGs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.PHET_SHARP_PATH || 'sharp');
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'src/phet/assets');
await fs.mkdir(path.join(dir,'sprites'),{recursive:true});
async function crop(file,box){
  const {data,info}=await sharp(path.join(dir,file)).extract({left:box[0],top:box[1],width:box[2]-box[0],height:box[3]-box[1]}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let i=3;i<data.length;i+=4)if(data[i]<8)data[i]=0;
  return sharp(data,{raw:info}).png().toBuffer();
}
async function save(input,name,w,h,{flip=false,position='south'}={}){
  let p=sharp(input);if(flip)p=p.flop();
  await p.resize(w,h,{fit:'contain',position,background:'#00000000'}).png().toFile(path.join(dir,'sprites',name));
}
const pusher={stand:await crop('pusher-atlas.png',[195,16,422,606]),mild:await crop('pusher-atlas.png',[719,37,1138,598]),strong:await crop('pusher-atlas.png',[49,681,612,1173]),fallen:await crop('pusher-atlas.png',[684,745,1219,1137])};
await save(pusher.stand,'pusher-standing.png',56,142);
await save(pusher.fallen,'pusher-fallen.png',152,105);
for(let i=0;i<=30;i++){
  const ref=path.join(root,`vendor/sources/forces-and-motion-basics/images/pushPullFigures/pusher_${i}.png`);
  const {height}=await sharp(ref).metadata();const pose=i<16?'mild':'strong';
  const width=Math.round(height*(pose==='mild'?419/561:563/492));
  await save(pusher[pose],`pusher-${i}.png`,width,height);
}
// Hand-to-floor distance is normalized to the upstream rope height (90 / 0.86).
// Inventory scaling is separate from the attached figure, like a game character picker.
const rows=[
  [[40,9,321,445,289,211],[401,40,750,445,659,219],[772,16,1050,445,810,211],[1077,57,1448,445,1187,229]],
  [[50,460,295,812,261,623],[404,478,750,812,643,630],[791,460,1045,812,832,627],[1097,490,1433,812,1200,640]],
  [[80,812,286,1086,248,934],[430,812,715,1086,614,937],[799,812,1035,1086,848,934],[1115,835,1400,1086,1210,950]]
];
const puller={},anchors={};
for(let r=0;r<3;r++)for(let c=0;c<4;c++){
  const box=rows[r][c],size=['large','medium','small'][r],key=(c<2?'blue':'red')+'-'+size+'-'+(c%2?'pull':'stand');
  const scale=(90/.86)/(box[3]-box[5]);
  const w=Math.round((box[2]-box[0])*scale),h=Math.round((box[3]-box[1])*scale);
  puller[key]=await sharp(await crop('puller-refined-atlas.png',box)).resize(w,h).png().toBuffer();
  anchors[key]=Math.round((box[4]-box[0])*scale*100)/100;
}
// Short partners reach above their heads, retaining both correct rope contact and a shorter body.
const shortBoxes=[[115,45,524,626,491,103],[692,57,1180,626,1024,102],[152,658,545,1226,188,704],[682,659,1203,1226,829,704]];
for(let c=0;c<4;c++){
  const box=shortBoxes[c],key=(c<2?'blue':'red')+'-small-'+(c%2?'pull':'stand');
  const scale=(90/.86)/(box[3]-box[5]);
  const w=Math.round((box[2]-box[0])*scale),h=Math.round((box[3]-box[1])*scale);
  puller[key]=await sharp(await crop('puller-small-atlas.png',box)).resize(w,h).png().toBuffer();
  anchors[key]=Math.round((box[4]-box[0])*scale*100)/100;
}
await fs.writeFile(path.join(dir,'puller-anchors.json'),JSON.stringify(anchors,null,2)+'\n');
for(const name of await fs.readdir(path.join(root,'vendor/sources/forces-and-motion-basics/images/pushPullFigures'))){
  if(!/^pull_.*\.png$/.test(name))continue;
  const left=/(BLUE|PURPLE)/.test(name),pull=name.endsWith('_3.png');
  const size=name.includes('_lrg_')?'large':name.includes('_small_')?'small':'medium';
  let input=puller[(left?'blue':'red')+'-'+size+'-'+(pull?'pull':'stand')];
  // Alternate accessible team palettes retain their original selectable meaning.
  if(name.includes('PURPLE')||name.includes('ORANGE')){
    const {data,info}=await sharp(input).raw().toBuffer({resolveWithObject:true});
    for(let p=0;p<data.length;p+=4){
      const r=data[p],g=data[p+1],b=data[p+2];
      if(name.includes('PURPLE')&&b>r*1.18&&b>g*1.05){data[p]=Math.min(255,r+70);data[p+1]=Math.max(0,g-25);}
      if(name.includes('ORANGE')&&r>g*1.6&&g>b*1.1){data[p+1]=Math.min(255,g+35);}
    }input=await sharp(data,{raw:info}).png().toBuffer();
  }
  await fs.writeFile(path.join(dir,'sprites',name),input);
}
for(let n=0;n<6;n++){
  const x=n%3*512,y=Math.floor(n/3)*512;
  const input=await crop('skater-atlas.png',[x+35,y+5,x+495,y+506]);
  await save(input,`skater-${n+1}-left.png`,180,242);
  await save(input,`skater-${n+1}-right.png`,180,242,{flip:true});
  const head=await crop('skater-atlas.png',[x+160,y+5,x+455,y+205]);
  await save(head,`skater-${n+1}-head.png`,70,70,{position:'center'});
}
const meadow=await crop('meadow.png',[25,315,2150,630]);
await save(meadow,'meadow.png',322,66);
const itemBoxes=[[190,15,396,480],[643,77,922,480],[1107,32,1401,480],[189,487,394,1017],[636,530,955,1005],[1118,498,1457,1007]];
for(let n=0;n<6;n++){
  const name=(n<3?'Girl':'Man')+['Standing','Sitting','Holding'][n%3];
  const reference=await fs.readFile(path.join(root,`vendor/sources/forces-and-motion-basics/images/usa/usa${name}_svg.ts`),'utf8');
  const [,w,h]=reference.match(/width="([\d.]+)" height="([\d.]+)"/);
  await save(await crop('item-atlas.png',itemBoxes[n]),`item-${name}.png`,Math.round(+w),Math.round(+h));
}
async function icon(name,background,layers){
  await sharp({create:{width:240,height:160,channels:4,background}}).composite(await Promise.all(layers.map(async([file,w,h,left,top])=>({input:await sharp(path.join(dir,'sprites',file)).resize(w,h,{fit:'inside'}).toBuffer(),left,top})))).png().toFile(path.join(dir,'sprites',name));
}
await icon('icon-tug.png','#e8f2e9',[['pull_figure_lrg_BLUE_3.png',94,120,22,28],['pull_figure_lrg_RED_3.png',94,120,126,28]]);
for(const [name,pose,bg] of [['motion','pusher-5.png','#e8f2e9'],['friction','pusher-20.png','#ece2c9'],['acceleration','pusher-30.png','#dbe8d5']]){
  const figure=await sharp(path.join(dir,'sprites',pose)).resize(110,120,{fit:'inside'}).toBuffer();
  const crate=await sharp(path.join(root,'vendor/sources/forces-and-motion-basics/images/crate.svg')).resize(75,75,{fit:'inside'}).png().toBuffer();
  await sharp({create:{width:240,height:160,channels:4,background:bg}}).composite([{input:figure,left:26,top:27},{input:crate,left:136,top:72}]).png().toFile(path.join(dir,'sprites',`icon-${name}.png`));
}
for(let n=1;n<=3;n++)await icon(`icon-skate-${n}.png`,['#e8f2e9','#ece2c9','#dbe8d5'][n-1],[[`skater-${n}-left.png`,110,144,68,8]]);
console.log('Prepared transparent production sprites and hand anchors.');
