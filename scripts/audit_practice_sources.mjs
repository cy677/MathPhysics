import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {UNITS} from '../lessons/primary-math/curriculum.mjs';
import {PRACTICE_TEMPLATES,SUPPLEMENT_TEMPLATES,practiceTemplates} from '../lessons/question-bank/practice-catalog.mjs';
const root=path.resolve(import.meta.dirname,'..'),sourceRoot=path.join(root,'vendor/question-sources');
const projects={
 mathsmentales:{name:'MathsMentales',repo:'seb-cogez/mathsmentales',commit:'ff60a4304aa5a439c5e567cad28c79e01a9ae74a',license:'Apache-2.0',catalogEntries:1598},
 mathalea:{name:'MathALÉA',repo:'mathalea/mathaleaV3',commit:'9f4d62dba4971d5bbc2b4927b5e699ff05b84778',license:'AGPL-3.0',catalogEntries:1743}
};
// All elementary exercise definitions downloaded for this change are mapped.
// Matching mathematical task types reuse the existing local generators.
const mappings={
 mathsmentales:[
  ['N7/7MA1','measure.length,measure.mass,sg.liquid','常用单位换算'],
  ['N7/7MC1','measure.elapsed,sg.clock','时间的加减与经过时间'],
  ['N7/7MC2','measure.duration','时分秒换算'],
  ['N7/7NB1','fraction.quantity','一个数量的几分之几'],
  ['N7/7NE1','decimal.add','小数加法'],
  ['N7/7NE2','decimal.scale','整数除以10的整次幂'],
  ['N8/8MA1','measure.length,measure.mass,sg.liquid,measure.area','常用单位换算'],
  ['N8/8MC1','measure.decimal-duration','小数小时与时分换算'],
  ['N8/8ME1','geometry.angle-kind','锐角、直角和钝角'],
  ['N8/8ND1','integer.add,integer.subtract','整数加减'],
  ['N8/8NE1','decimal.add','小数加法'],
  ['N8/8NE2','decimal.scale','小数乘以10的整次幂'],
  ['N8/8NE3','decimal.scale','小数除以10的整次幂'],
  ['N8/8NE4','decimal.scale','整数乘0.1、0.01、0.001'],
  ['N8/8NE5','decimal.scale','整数除0.1、0.01、0.001'],
  ['N8/8NE6','decimal.scale','十进分数与10的整次幂'],
  ['N9/9NA1','number.place,sg.decimal-place','数位与数字'],
  ['N9/9NE1','decimal.scale','整数乘以10的整次幂'],
  ['N9/9NE2','mental.pairs','选数凑整'],
  ['N9/9NE3','mental.pairs','凑整后的三数简算'],
  ['N9/9NF1','integer.multiply','乘法表']
 ],
 mathalea:[
  ['c3C10-1','integer.multiply','乘法表'],
  ['c3C10-2','number.multiple-path','倍数路径'],
  ['c3C10-3','decimal.scale','10的整次幂缩放'],
  ['c3C10-4','integer.add','加法表'],
  ['c3C10','integer.add,integer.subtract,integer.multiply,integer.divide','整数计算'],
  ['c3C11','integer.remainder','除法与余数'],
  ['c3C12','number.last-digit','计算结果的个位'],
  ['c3C13','word.shopping,word.change','价格应用题'],
  ['c3C13-1','measure.mass','质量应用题'],
  ['c3C23','fraction.add,fraction.subtract,fraction.multiply,fraction.divide','分数计算'],
  ['c3C30','integer.add,integer.subtract,integer.multiply','列式计算'],
  ['c3C31','word.shopping,word.change','购物应用题'],
  ['c3I11','logic.route','按指令在方格中移动'],
  ['c3N10','number.words','数词与数字对应'],
  ['c3N10-1','number.place','按数位重组整数'],
  ['c3N11','number.number-line','读整数数轴'],
  ['c3N20','decimal.compose','整数与十进分数组合'],
  ['c3N22','number.number-line','读小数数轴'],
  ['c3N23','number.number-line','读细分刻度数轴'],
  ['c3N30','measure.length,measure.mass,sg.liquid','单位进率']
 ]
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const rows=[],assets=[],loaded=new Set();
for(let grade=1;grade<=6;grade++)for(const difficulty of [1,2,3])for(const t of practiceTemplates({grade,difficulty}))loaded.add(t.id);
assert.equal(loaded.size,PRACTICE_TEMPLATES.length,'Every registered template must be reachable in the classroom');
for(const [key,project] of Object.entries(projects)){
 const license=await fs.readFile(path.join(sourceRoot,key,'LICENSE'));assets.push({file:key+'/LICENSE',sha256:sha(license)});
 if(key==='mathsmentales'){const file=key+'/library/content.json';assets.push({file,sha256:sha(await fs.readFile(path.join(sourceRoot,file)))});}
 for(const [name,templates,task] of mappings[key]){
  const relative=key==='mathsmentales'?'library/'+name+'.json':'src/exercices/c3/'+name+'.js',file=key+'/'+relative,bytes=await fs.readFile(path.join(sourceRoot,file));
  const templateIds=templates.split(',');for(const id of templateIds)assert.ok(loaded.has(id),file+' maps to an unloaded template: '+id);
  const introduced=SUPPLEMENT_TEMPLATES.filter(t=>t.reference===project.name&&t.upstream===relative).map(t=>t.id);
  rows.push({project:project.name,file,upstreamUrl:`https://github.com/${project.repo}/blob/${project.commit}/${relative}`,sha256:sha(bytes),task,status:introduced.length?'added':'reused',templateIds,introduced});
 }
}
async function files(dir){const entries=await fs.readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.relative(sourceRoot,path.join(dir,e.name)).replaceAll('\\','/')]))).flat();}
const saved=(await files(sourceRoot)).filter(f=>f.endsWith('.js')||f.endsWith('.json')&&f!=='manifest.json'&&!f.endsWith('/content.json'));
assert.deepEqual(saved.sort(),rows.map(r=>r.file).sort(),'Downloaded exercise definitions must all have an explicit loaded mapping');
assert.deepEqual(rows.flatMap(r=>r.introduced).sort(),SUPPLEMENT_TEMPLATES.map(t=>t.id).sort());
const manifest={schemaVersion:1,checkedAt:'2026-10-05',scope:'Downloaded elementary exercise definitions from the two pinned GitHub snapshots; concepts adapted independently in Chinese. Full upstream catalogs are not claimed as imported.',projects,totals:{downloadedExercises:rows.length,addedTypes:SUPPLEMENT_TEMPLATES.length,reusedExercises:rows.filter(r=>r.status==='reused').length,registeredTemplates:PRACTICE_TEMPLATES.length,loadedTemplates:loaded.size,units:UNITS.length},assets,exercises:rows,loadedTemplateIds:[...loaded].sort()};
await fs.writeFile(path.join(sourceRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest.totals));
