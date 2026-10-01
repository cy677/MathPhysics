// Rebuild display assets only. Scientific geometry, image extents and mipmap sizes are pinned.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const sharp=require(process.env.PHET_SHARP_PATH || 'sharp');
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'src/phet/assets/expansion');
await fs.mkdir(path.join(dir,'sprites'),{recursive:true});
await fs.mkdir(path.join(dir,'menus'),{recursive:true});
const sims=['fractions-intro','fraction-matcher','balancing-act','circuit-construction-kit-dc','states-of-matter-basics','build-a-molecule'];
const sources=Object.fromEntries(await Promise.all(sims.map(async sim=>[sim,await fs.readFile(path.join(root,'vendor/phet',sim+'.html'),'utf8')])));
const pngs=Object.fromEntries(sims.map(sim=>[sim,[...sources[sim].matchAll(/data:image\/(?:png|jpeg|svg\+xml|x-icon);base64,[A-Za-z0-9+/=]+/g)].map(m=>m[0])]));
const balance=[...sources['balancing-act'].matchAll(/([\w$]+)\.src=("data:image\/svg\+xml;base64,"\+btoa\(('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\))/g)].map(m=>{
  // The pinned literals have no executable expressions; decode JavaScript string escapes only.
  const svg=m[3].slice(1,-1).replace(/\\(['"\\])/g,'$1');
  return {variable:m[1],expression:m[2],svg,width:+svg.match(/\bwidth="([\d.]+)"/)[1],height:+svg.match(/\bheight="([\d.]+)"/)[1]};
});
const manifest={schemaVersion:1,style:'forest-club',sources:Object.fromEntries(sims.map(sim=>[sim,createHash('sha256').update(sources[sim]).digest('hex')])),images:[],menus:{}};
manifest.elementColors={H:'#ffffff',C:'#b2b2b2',O:'#ff5500'};
const palette={ink:'#315d4b',cream:'#fffdf4',sage:'#b3d39c',gold:'#efbb5b',blue:'#83b3c8',rose:'#dd91a0',ground:'#e7ddbf'};
const svg=(w,h,body,view=`0 0 ${w} ${h}`)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${view}"><g stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`);
const rect=(x,y,w,h,fill,stroke=palette.ink,r=8,sw=3)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const circle=(x,y,r,fill,sw=3)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${palette.ink}" stroke-width="${sw}"/>`;
const line=(x,y,X,Y,color=palette.ink,width=3)=>`<path d="M${x} ${y}L${X} ${Y}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
const uri=buffer=>'data:image/png;base64,'+buffer.toString('base64');
const sprites={};
async function write(name,input,w,h,{contain=false,flip=false}={}){
  let p=sharp(input);if(flip)p=p.flop();
  const data=await p.resize(Math.round(w),Math.round(h),{fit:contain?'contain':'fill',position:'south',background:'#00000000'}).png().toBuffer();
  const file='sprites/'+name+'.png';await fs.writeFile(path.join(dir,file),data);sprites[name]=data;return file;
}
async function cell(file,col,top,bottom,width){
  const {data,info}=await sharp(path.join(dir,file)).extract({left:col*width,top,width,height:bottom-top}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // An atlas row can include a few detached pixels from its neighbour. Remove only tiny
  // alpha components before calculating the crop; keep all meaningful parts of the sprite.
  const seen=new Uint8Array(info.width*info.height),components=[];
  for(let at=0;at<seen.length;at++){
    if(seen[at]||data[at*4+3]<12)continue;
    const component=[],queue=[at];seen[at]=1;
    for(let q=0;q<queue.length;q++){
      const p=queue[q];component.push(p);
      const x=p%info.width,y=Math.floor(p/info.width);
      for(const next of [x>0?p-1:-1,x+1<info.width?p+1:-1,y>0?p-info.width:-1,y+1<info.height?p+info.width:-1]){
        if(next>=0&&!seen[next]&&data[next*4+3]>=12){seen[next]=1;queue.push(next);}
      }
    }
    components.push(component);
  }
  const largest=Math.max(...components.map(c=>c.length));
  for(const component of components)if(component.length<largest*.008)for(const p of component)data[p*4+3]=0;
  let minX=info.width,minY=info.height,maxX=-1,maxY=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const at=(y*info.width+x)*4;
    if(data[at+3]<12)data[at+3]=0;
    else{minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  }
  return sharp(data,{raw:info}).extract({left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1}).png().toBuffer();
}
function recordPNG(sim,index,file,role){
  const old=pngs[sim][index];if(!old?.startsWith('data:image/png'))throw Error(`${sim}: missing PNG ${index}`);
  const data=Buffer.from(old.split(',')[1],'base64');
  manifest.images.push({sim,type:'png',index,file,role,width:data.readUInt32BE(16),height:data.readUInt32BE(20),sourceSHA256:createHash('sha256').update(data).digest('hex'),occurrences:sources[sim].split(old).length-1});
}
async function replaceSVG(index,name,input,{contain=true,flip=false}={}){
  const asset=balance[index];
  const file=await write(name,input,asset.width*2,asset.height*2,{contain,flip});
  // Preserve decimal SVG intrinsic extents. These are also used by PhET mass placement.
  manifest.images.push({sim:'balancing-act',type:'svg',variable:asset.variable,file,role:name,width:asset.width,height:asset.height,sourceSHA256:createHash('sha256').update(asset.expression).digest('hex'),occurrences:1});
}
// Default family. Seated figures face left, matching the original contact direction.
for(let col=0;col<4;col++){
  const person=['boy','girl','dad','mom'][col];
  const standing=await cell('balance-family-atlas.png',col,0,640,384);
  const seated=await cell('balance-family-atlas.png',col,640,1024,384);
  const standingIndex=[41,43,46,48][col],seatedIndex=[40,42,45,47][col];
  await replaceSVG(standingIndex,person+'-standing',standing);
  await replaceSVG(seatedIndex,person+'-seated',seated,{flip:true});
}
const props=['extinguisher','trash','barrel','crate','hydrant','flowers','plant','bucket-gray','bucket-yellow','bucket-blue','rock','television','dog','bottle','tire','cinder'];
const propInputs={};
const rowBounds=[0,285,577,817,1086];
for(let n=0;n<props.length;n++)propInputs[props[n]]=await cell('balance-props-atlas.png',n%4,rowBounds[Math.floor(n/4)],rowBounds[Math.floor(n/4)+1],362);
for(const [index,name,source] of [[58,'barrel','barrel'],[59,'rock-large','rock'],[60,'cinder','cinder'],[61,'crate','crate'],[62,'hydrant','hydrant'],[63,'flowers','flowers'],[64,'bucket-gray','bucket-gray'],[65,'trash','trash'],[66,'bucket-yellow','bucket-yellow'],[67,'rock-medium','rock'],[68,'plant','plant'],[69,'dog','dog'],[70,'bucket-blue','bucket-blue'],[71,'rock-small','rock'],[72,'bottle','bottle'],[73,'television','television'],[74,'rock-tiny','rock'],[75,'tire','tire'],[84,'extinguisher','extinguisher']]){
  await replaceSVG(index,name,propInputs[source]);
}
for(let n=0;n<8;n++){
  const a=balance[49+n],fill=[palette.sage,palette.gold,'#b4a2cf',palette.blue,palette.cream,'#faf0d5',palette.rose,'#d6e4c7'][n];
  const bow=`<path d="M25 15Q2 -2 8 13Q14 20 25 15Q48 -2 42 13Q36 20 25 15Z" fill="${palette.cream}" stroke="${palette.ink}" stroke-width="2"/>`;
  const body=rect(3,16,44,80,fill,palette.ink,5,2)+rect(23,16,7,80,palette.rose,palette.ink,1,1)+rect(1,16,48,12,fill,palette.ink,3,2)+bow;
  await replaceSVG(49+n,'mystery-'+(n+1),svg(a.width,a.height,body,'0 0 50 100'),{contain:false});
}
// Neutral scientific diagrams use exact vector geometry, then rasterize at every original mipmap size.
function cake(n,k){
  const cx=109.5,cy=62,rx=106,ry=58,depth=43;
  const a=-Math.PI/2+(k-1)*2*Math.PI/n,b=a+2*Math.PI/n;
  const point=(t,d=0)=>`${cx+rx*Math.cos(t)} ${cy+ry*Math.sin(t)+d}`;
  const sector=d=>n===1?`M${cx-rx} ${cy+d}a${rx} ${ry} 0 1 0 ${2*rx} 0a${rx} ${ry} 0 1 0 ${-2*rx} 0Z`:`M${cx} ${cy+d}L${point(a,d)}A${rx} ${ry} 0 ${n===1?1:0} 1 ${point(b,d)}Z`;
  // Extruded sector: the top is always exactly one nth of the full ellipse.
  const walls=n===1?`M${point(0)}A${rx} ${ry} 0 0 1 ${point(Math.PI)}L${point(Math.PI,depth)}A${rx} ${ry} 0 0 0 ${point(0,depth)}Z`:`M${point(a)}A${rx} ${ry} 0 0 1 ${point(b)}L${point(b,depth)}A${rx} ${ry} 0 0 0 ${point(a,depth)}Z M${cx} ${cy}L${point(a)}L${point(a,depth)}L${cx} ${cy+depth}Z M${cx} ${cy}L${point(b)}L${point(b,depth)}L${cx} ${cy+depth}Z`;
  return svg(219,166,`<path d="${sector(depth)}" fill="#d8a975" stroke="${palette.ink}" stroke-width="2"/><path d="${walls}" fill="#d8a975" stroke="${palette.ink}" stroke-width="2"/><path d="${sector(0)}" fill="#faf0d5" stroke="${palette.ink}" stroke-width="2"/>`);
}
let cakeIndex=11;
for(let n=1;n<=8;n++)for(let k=1;k<=n;k++){
  const input=cake(n,k);
  for(let mip=0;mip<5;mip++){
    const i=cakeIndex++,data=Buffer.from(pngs['fractions-intro'][i].split(',')[1],'base64');
    const file=await write(`cake-${n}-${k}-${mip}`,input,data.readUInt32BE(16),data.readUInt32BE(20));
    recordPNG('fractions-intro',i,file,`cake: slice ${k} of ${n}`);
  }
}
function flame(){return svg(100,100,`<path d="M52 3C78 32 66 39 84 56C104 84 77 98 50 98C12 98 3 72 22 48C38 31 30 15 52 3Z" fill="${palette.rose}" stroke="${palette.ink}" stroke-width="3"/><path d="M51 42C64 60 62 64 69 73C76 90 61 94 49 94C25 94 29 73 40 62Z" fill="${palette.gold}"/>`);}
function cloud(){return svg(222,157,`<path d="M30 133C-9 122 3 70 41 69C31 18 96 3 121 40C152 0 207 35 190 74C234 67 234 137 191 141H40Z" fill="${palette.cream}" stroke="${palette.ink}" stroke-width="5"/>`);}
function drop(){return svg(118,156,`<path d="M59 4C49 34 6 79 5 109C4 165 113 165 113 109C110 76 71 35 59 4Z" fill="${palette.blue}" stroke="${palette.ink}" stroke-width="4"/><path d="M25 109Q26 130 44 135" fill="none" stroke="${palette.cream}" stroke-width="6"/>`);}
function ice(){return svg(182,177,`<path d="M8 44L101 5L175 37L176 133L78 173L8 139Z" fill="#c7e2e4" stroke="${palette.ink}" stroke-width="4"/><path d="M8 44L78 76L175 37M78 76V173" fill="none" stroke="${palette.ink}" stroke-width="4"/>${line(20,48,69,69,'#fffdf4',6)}${line(22,62,22,121,'#fffdf4',6)}`);}
function longHand(){return svg(222,1065,`<path d="M74 10H220L202 505Q198 562 199 616Q208 654 204 711Q207 755 199 786L187 900L184 1005Q184 1053 170 1063Q163 1069 156 1063Q140 1060 138 1040L136 907L124 884Q105 900 86 889Q70 899 54 883Q34 893 18 877Q0 868 2 841Q-3 820 5 784L19 741Q22 710 43 688Q66 663 86 649Q103 620 98 571Z" fill="#d6a27c" stroke="${palette.ink}" stroke-width="3"/><path d="M136 907L132 853M124 884L114 829M86 889L79 845M54 883L49 841M98 735Q113 724 130 730" fill="none" stroke="${palette.ink}" stroke-width="3"/>`);}
function cooling(){return svg(99,79,`<g transform="translate(2 5) scale(.32)">${ice().toString().replace(/^[\s\S]*?<g[^>]*>|<\/g><\/svg>$/g,'')}</g><g transform="translate(35 17) scale(.32)">${ice().toString().replace(/^[\s\S]*?<g[^>]*>|<\/g><\/svg>$/g,'')}</g><g transform="translate(9 27) scale(.32)">${ice().toString().replace(/^[\s\S]*?<g[^>]*>|<\/g><\/svg>$/g,'')}</g>`);}
async function pngSeries(sim,indices,name,input){
  for(let mip=0;mip<indices.length;mip++){
    const index=indices[mip],data=Buffer.from(pngs[sim][index].split(',')[1],'base64');
    const file=await write(name+'-'+mip,input,data.readUInt32BE(16),data.readUInt32BE(20));recordPNG(sim,index,file,name);
  }
}
await pngSeries('states-of-matter-basics',[10],'heat',flame());
await pngSeries('states-of-matter-basics',[11],'cool',cooling());
await pngSeries('states-of-matter-basics',[12,13,14,15,16],'hand-vertical',longHand());
await pngSeries('states-of-matter-basics',[17,18,19,20,21],'cloud',cloud());
await pngSeries('states-of-matter-basics',[22,23,24,25,26],'water-drop',drop());
await pngSeries('states-of-matter-basics',[27,28,29,30,31],'ice',ice());
// Circuit terminals keep their original full raster extents. Probe tips, polarity and symbols remain distinct.
const circuit={
  probe:color=>svg(72,507,`<path d="M36 1L44 82H28Z" fill="#b2bcb8" stroke="${palette.ink}" stroke-width="3"/>${rect(11,82,50,422,color,palette.ink,12,4)}${rect(4,110,64,24,color,palette.ink,6,4)}${[151,161,171,181].map(y=>line(12,y,60,y,'#657974',2)).join('')}`),
  meter:(w,h)=>svg(w,h,rect(3,3,w-6,h-6,palette.gold,palette.ink,22,5)+rect(18,22,w-36,h*.29,'#e7eddf',palette.ink,8,4)+circle(w/2,h*.7,Math.min(w,h)*.16,palette.ink)+line(w/2,h*.7,w/2+20,h*.7-18,palette.cream,4)+circle(w*.25,h*.9,8,'#333')+circle(w*.75,h*.9,8,'#c65049')),
  battery:high=>svg(high?199:146,high?79:46,rect(1,high?12:1,high?190:138,high?54:44,high?'#657974':palette.gold,palette.ink,7,2)+rect(high?191:139,high?29:14,7,high?21:18,'#b2bcb8',palette.ink,2,2)+line(high?160:116,high?31:16,high?178:129,high?31:16,palette.cream,3)+line(high?169:122.5,high?22:9,high?169:122.5,high?40:23,palette.cream,3)+line(15,high?31:16,28,high?31:16,palette.ink,3)+(high?`<path d="M83 16L66 42H83L73 63L108 33H88L98 16Z" fill="${palette.gold}"/>`:'')),
  wire:svg(124,20,rect(1,2,122,16,'#cf9360',palette.ink,4,2)+line(3,7,121,7,'#faf0d5',2)),
  metal:svg(217,67,rect(1,4,215,59,'#b2bcb8',palette.ink,8,3)+rect(1,3,32,61,'#dce3dc',palette.ink,8,3)+rect(184,3,32,61,'#dce3dc',palette.ink,8,3)),
  coin:svg(200,198,circle(100,99,96,palette.gold,5)+circle(100,99,76,'#faf0d5',3)+`<path d="M100 44L114 82L157 83L124 111L135 153L100 131L65 153L76 111L43 83L86 82Z" fill="${palette.gold}" stroke="${palette.ink}" stroke-width="3"/>`),
  bill:svg(215,106,rect(2,2,211,102,palette.sage,palette.ink,6,4)+rect(12,12,191,82,'#e7eddf',palette.ink,5,2)+circle(108,53,30,palette.sage,2)+`<path d="M108 30L116 46L136 48L121 62L125 81L108 71L91 81L95 62L80 48L100 46Z" fill="${palette.cream}"/>`+line(22,29,51,29)+line(165,76,192,76)),
  eraser:svg(213,75,`<path d="M2 27L28 2H211V48L185 73H2Z" fill="${palette.rose}" stroke="${palette.ink}" stroke-width="3"/><path d="M2 27H185L211 2M185 27V73" fill="none" stroke="${palette.ink}" stroke-width="3"/>${rect(75,27,69,45,'#faf0d5',palette.ink,2,2)}`),
  hand:svg(212,133,`<path d="M212 2L158 2Q142 0 119 15L93 27Q69 35 49 37L13 45Q-2 48 2 56Q6 63 20 61L71 57Q53 75 56 86Q41 98 58 109Q61 122 82 120Q91 138 115 128L151 112Q168 81 187 75H212Z" fill="#d6a27c" stroke="${palette.ink}" stroke-width="3"/><path d="M71 57L120 42M57 86L93 81M59 109L95 101M82 120L111 109" fill="none" stroke="${palette.ink}" stroke-width="2"/>`),
  clip:svg(193,58,`<path d="M155 43H25Q3 43 3 23Q3 3 25 3H167Q190 3 190 26Q190 55 166 55H32Q15 55 15 35Q15 15 33 15H154Q176 15 176 33Q176 43 158 43" fill="none" stroke="${palette.ink}" stroke-width="6"/><path d="M155 43H25Q3 43 3 23Q3 3 25 3H167Q190 3 190 26" fill="none" stroke="#b2bcb8" stroke-width="3"/>`),
  pencil:h=>svg(209,h,`<path d="M2 ${h/2}L22 2H188L207 ${h/2}L188 ${h-2}H22Z" fill="${palette.gold}" stroke="${palette.ink}" stroke-width="2"/><path d="M2 ${h/2}L22 2V${h-2}Z M207 ${h/2}L188 2V${h-2}Z" fill="#d8a975" stroke="${palette.ink}" stroke-width="2"/>${line(25,h*.3,185,h*.3,'#faf0d5',3)}`),
  resistor:svg(150,44,line(1,22,149,22,'#b2bcb8',6)+rect(18,3,114,38,'#faf0d5',palette.ink,12,3)+rect(38,4,8,36,palette.rose,palette.rose,1,1)+rect(58,4,8,36,palette.gold,palette.gold,1,1)+rect(97,4,8,36,palette.sage,palette.sage,1,1)),
  resistorSchematic:svg(200,74,`<path d="M1 37H30L43 8L65 66L87 8L109 66L131 8L153 66L169 37H199" fill="none" stroke="#2879a1" stroke-width="6"/>`)
};
function bulb(part='full',variant='filament'){
  // Foot and neck coordinates follow the original 195 by 315 image, rather than a
  // generic bulb outline: the live circuit draws charge paths and terminals over it.
  const glass=`<path d="M43 200C43 184 2 156 2 101C2 -32 193 -32 193 101C193 157 154 184 154 200Z" fill="#fff5cc" fill-opacity=".48" stroke="${palette.ink}" stroke-width="3"/>`;
  const base=`<path d="M42 199H154V253Q148 302 110 313H86Q48 302 42 253Z" fill="#b2bcb8" stroke="${palette.ink}" stroke-width="3"/>`+[212,226,240,253].map(y=>line(43,y,153,y,palette.ink,2)).join('')+line(87,312,111,312,palette.ink,4);
  const filament=variant==='resistor'?`<path d="M92 199V157L74 138L83 121L100 142L116 121L135 144L141 157V199" fill="none" stroke="#2879a1" stroke-width="5"/>`:`<path d="M93 199V160L52 113Q41 86 62 86H122Q142 86 142 110V199" fill="none" stroke="#be8749" stroke-width="4"/>`;
  return svg(195,315,(part==='base'?base:part==='glass'?glass:part==='resistor-base'?base+filament:glass+filament+base));
}
await pngSeries('circuit-construction-kit-dc',[13],'meter-horizontal',circuit.meter(256,179));
await pngSeries('circuit-construction-kit-dc',[14,15,16,17,18],'probe-black',circuit.probe('#333'));
await pngSeries('circuit-construction-kit-dc',[19,20,21,22,23],'probe-red',circuit.probe('#c65049'));
await pngSeries('circuit-construction-kit-dc',[24,25,26,27,28],'meter-vertical',circuit.meter(256,318));
for(const [index,name,input] of [[29,'circuit-heat',flame()],[30,'battery',circuit.battery(false)],[31,'high-voltage-battery',circuit.battery(true)],[32,'copper-wire',circuit.wire],[33,'bulb-base',bulb('base')],[49,'bulb-glass',bulb('glass')],[50,'bulb-metal',bulb('base')],[51,'bulb-resistor-base',bulb('resistor-base','resistor')],[52,'metal-ends',circuit.metal],[53,'coin',circuit.coin],[54,'bill',circuit.bill],[55,'eraser',circuit.eraser],[56,'pointing-hand',circuit.hand],[57,'paperclip',circuit.clip],[58,'pencil',circuit.pencil(49)],[59,'pencil-short',circuit.pencil(36)],[60,'resistor',circuit.resistor],[61,'resistor-schematic',circuit.resistorSchematic]])await pngSeries('circuit-construction-kit-dc',[index],name,input);
await pngSeries('circuit-construction-kit-dc',[34,35,36,37,38],'bulb',bulb());
await pngSeries('circuit-construction-kit-dc',[39,40,41,42,43],'bulb-resistor',bulb('full','resistor'));
await pngSeries('circuit-construction-kit-dc',[44,45,46,47,48],'bulb-filament',bulb());
await pngSeries('circuit-construction-kit-dc',[62,63,64,65,66],'bulb-thumb',bulb());
// Shared character shown by the error/help dialog; retain the same 125 by 276 pixel canvas.
const girl=await cell('balance-family-atlas.png',1,0,640,384);
for(const sim of sims){
  const index=pngs[sim].findIndex(data=>{
    const p=Buffer.from(data.split(',')[1],'base64');return p.length>24&&p.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&p.readUInt32BE(16)===125&&p.readUInt32BE(20)===276;
  });
  if(index>=0){const file=await write('dialog-girl',girl,125,276,{contain:true});recordPNG(sim,index,file,'dialog-girl');}
}
// Fifteen menu and navigation illustrations. No text is baked into the image.
function poster(body){return svg(548,373,rect(1,1,546,371,'#e8f2e9',palette.ink,24,2)+`<ellipse cx="275" cy="314" rx="218" ry="28" fill="#d6e4c7"/>`+body);}
function pie(x,y,n,k,r=76){
  let body=circle(x,y,r,palette.cream,4);
  for(let i=0;i<k;i++){const a=-Math.PI/2+i*2*Math.PI/n,b=a+2*Math.PI/n;body+=`<path d="M${x} ${y}L${x+r*Math.cos(a)} ${y+r*Math.sin(a)}A${r} ${r} 0 ${n===1?1:0} 1 ${x+r*Math.cos(b)} ${y+r*Math.sin(b)}Z" fill="${palette.gold}" stroke="${palette.ink}" stroke-width="3"/>`;}
  for(let i=0;i<n;i++){const a=-Math.PI/2+i*2*Math.PI/n;body+=line(x,y,x+r*Math.cos(a),y+r*Math.sin(a));}return body;
}
function balanceBody(tilt=0){return `<g transform="rotate(${tilt} 274 212)">${rect(55,201,438,18,'#d8a975',palette.ink,7,4)}</g><path d="M274 214L211 316H337Z" fill="${palette.gold}" stroke="${palette.ink}" stroke-width="4"/>${circle(274,211,9,palette.cream)}${line(40,320,508,320,palette.ink,4)}`;}
async function layers(body,items){
  const composite=[];
  for(const [input,x,y,w,h] of items)composite.push({input:await sharp(input).resize(w,h,{fit:'contain',position:'south',background:'#00000000'}).png().toBuffer(),left:x,top:y});
  return sharp(poster(body)).composite(composite).png().toBuffer();
}
const menus={};
menus['fractions-intro']=[poster(pie(175,157,4,3)+rect(300,106,185,105,palette.cream)+[0,1,2,3].map(i=>rect(302+i*45,108,43,101,i<3?palette.gold:palette.cream,palette.ink,3,2)).join('')),poster(line(65,229,486,229,palette.ink,6)+[0,1,2,3,4].map(i=>line(65+i*105,210,65+i*105,246)).join('')+circle(275,229,12,palette.rose)+pie(274,108,4,2,61)),poster([0,1,2].map(i=>rect(75+i*140,100,112,153,palette.cream)+pie(131+i*140,175,i+2,1,42)).join(''))];
// Pinned screen order is Intro, Game, Lab. Challenge cards belong to Game; the number line to Lab.
[menus['fractions-intro'][1],menus['fractions-intro'][2]]=[menus['fractions-intro'][2],menus['fractions-intro'][1]];
const mixedNumber=`<path d="M369 162L382 149V206M431 116L444 105V145M430 196C431 174 465 175 466 194C467 210 433 215 430 236H468" fill="none" stroke="${palette.ink}" stroke-width="6"/>`+line(420,165,478,165,palette.ink,4);
menus['fraction-matcher']=[poster(pie(162,166,2,1)+pie(387,166,4,2)+line(258,156,290,156)+line(258,176,290,176)),poster(pie(108,166,2,2,66)+pie(262,166,2,1,66)+rect(348,77,159,193,palette.cream)+mixedNumber)];
menus['balancing-act']=[await layers(balanceBody(),[[propInputs.extinguisher,102,94,50,107],[propInputs.trash,392,67,65,134]]),await layers(balanceBody(),[[sprites['girl-seated'],70,73,117,129],[sprites['boy-seated'],358,73,117,129]]),await layers(balanceBody(),[[sprites['mystery-1'],106,109,72,91],[propInputs.barrel,373,103,62,97]])];
function circuitBody(lab=false){return `<path d="M109 183V286H425V182" fill="none" stroke="#cf9360" stroke-width="11"/><g transform="translate(63 160) scale(.75)">${circuit.battery(false).toString().replace(/^[\s\S]*?<g[^>]*>|<\/g><\/svg>$/g,'')}</g><g transform="translate(356 53) scale(.43)">${bulb().toString().replace(/^[\s\S]*?<g[^>]*>|<\/g><\/svg>$/g,'')}</g>${lab?`<path d="M175 286V242H309V286" fill="none" stroke="#c65049" stroke-width="5"/>${rect(180,196,123,76,palette.gold)}${rect(192,207,98,24,'#e7eddf')}`:line(172,107,259,66,palette.gold,6)+line(181,69,238,26,palette.gold,6)}`;}
menus['circuit-construction-kit-dc']=[poster(circuitBody()),poster(circuitBody(true))];
const particles=(gas=false)=>[0,1,2,3,4,5,6,7,8].map(i=>circle(gas?79+(i%3)*43+(i%2)*13:79+(i%3)*29,gas?116+Math.floor(i/3)*54:205+Math.floor(i/3)*29,12,'#83b3c8',2)).join('');
menus['states-of-matter-basics']=[poster(rect(49,68,190,238,palette.cream)+particles()+rect(303,68,190,238,palette.cream)+`<g transform="translate(256 -25)">${particles(true)}</g>`),poster(rect(142,65,265,221,palette.cream)+`<g transform="translate(120 -10)">${particles(true)}</g><g transform="translate(160 277) scale(.5)">${flame().toString().replace(/^[\s\S]*?<g[^>]*>|<\/g><\/svg>$/g,'')}</g>`+line(446,105,446,259,palette.rose,14)+circle(446,266,20,palette.rose))];
// Element colors match the pinned Element definitions, including accessible orange oxygen.
function molecule(x,y,type=0){return type===0?line(x-35,y+29,x,y)+line(x,y,x+35,y+29)+circle(x,y,34,manifest.elementColors.O,3)+circle(x-42,y+36,22,manifest.elementColors.H,3)+circle(x+42,y+36,22,manifest.elementColors.H,3):line(x-48,y,x+48,y)+circle(x-68,y,28,manifest.elementColors.O,3)+circle(x,y,35,manifest.elementColors.C,3)+circle(x+68,y,28,manifest.elementColors.O,3);}
menus['build-a-molecule']=[poster(molecule(277,142)+rect(90,252,130,66,palette.cream)+rect(331,252,130,66,palette.cream)+circle(155,279,17,'#ff5500',2)+circle(383,279,13,'#fff',2)+circle(417,279,13,'#fff',2)),poster(molecule(151,148)+molecule(391,230,1)),poster(molecule(158,108)+molecule(356,184,1)+molecule(165,265))];
for(const sim of sims){
  manifest.menus[sim]=[];
  for(let n=0;n<menus[sim].length;n++){
    const file=`menus/${sim}-${n}.png`;await sharp(menus[sim][n]).png().toFile(path.join(dir,file));manifest.menus[sim].push(file);
  }
}
// Replace the old embedded balance previews as well as the live menu graph.
for(const [index,menu] of [[44,1],[57,2],[83,0]])await replaceSVG(index,'balance-preview-'+index,menus['balancing-act'][menu],{contain:false});
for(let n=0;n<4;n++){
  const groups=[['cinder','rock'],['bucket-gray','flowers'],['plant','barrel'],['hydrant','dog','bucket-yellow']][n];
  const items=groups.map((name,i)=>[propInputs[name],70+i*110,80,62,122]);
  await replaceSVG(76+n,'balance-carousel-'+n,await layers(balanceBody(n%2?0:-7),items),{contain:false});
}
for(let n=0;n<3;n++){
  const supports=n===0?rect(56,223,23,92,'#b2bcb8')+rect(469,223,23,92,'#b2bcb8'):'';
  await replaceSVG(80+n,'balance-support-'+n,poster(supports+balanceBody(n===1?-12:n===2?12:0)),{contain:false});
}
await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({images:manifest.images.length,menus:Object.values(manifest.menus).flat().length,style:manifest.style}));
