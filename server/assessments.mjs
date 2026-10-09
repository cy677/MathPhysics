/* Formal companion assessments. All issuance and grading run on the server.
 * Classroom learning progress stays separate from submitted assessment scores,
 * accepted here. Tangram reference geometry retains its GPL-3.0 provenance.
 */
import {readFileSync} from 'node:fs';
import {createHash, randomBytes} from 'node:crypto';
import {generateWorksheet, TEMPLATES, ENGINE_VERSION} from '../lessons/question-bank/engine.mjs';
import {parseNumber, rational, answerText, random} from '../lessons/question-bank/core.mjs';
import {CURRICULUM_TEMPLATES, CURRICULUM_VERSION, UNITS, practiceLimit} from '../lessons/primary-math/curriculum.mjs';
import {QUESTIONS as FIXED_QUESTIONS} from '../lessons/primary-math/bank.mjs';
import {LESSONS} from '../lessons/geometric-proofs/catalog.js';
import {normalize, question, extensionQuestion} from '../lessons/geometric-proofs/math.js';
import {PLAYGROUND_TARGETS} from '../lessons/jsxgraph-playground/teaching.js';
import {getWordProblemSources,getWordProblemSelection,issueWordProblemItems,gradeWordProblemItem} from './word-problems-assessments.mjs';

export const ASSESSMENT_VERSION = '1';
export const GRADING_RULE_VERSION = '1.0.0';
export const COMPATIBILITY_VERSION = '1';
export const REWARD_VERSION = '1';
const clone = value => structuredClone(value);
const freeze = value => {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
};
const readJSON = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const REFERENCES = freeze(readJSON('./assessment-references.json'));
const ACTIVITIES = [...readJSON('../config/inventory.json').activities, ...readJSON('../config/local-activities.json').activities];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const keysOnly = (value, allowed) => record(value) && Object.keys(value).every(key => allowed.includes(key));
const finite = value => typeof value === 'number' && Number.isFinite(value);
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const equalPoint = (a, b, tolerance) => Math.hypot(a.x - b.x, a.y - b.y) <= tolerance;
const point = (x, y) => ({x, y});
const area = points => Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - p.y * q.x; }, 0)) / 2;
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const fmt = n => String(Number(n.toFixed(6)));

export class AssessmentError extends Error {
  constructor(message, code = 'invalid_assessment_request') { super(message); this.name = 'AssessmentError'; this.code = code; this.status = 400; }
}

// These are UI descriptions of raw answers, not executable validators/rubrics.
export const RESPONSE_SCHEMAS = freeze({
  text: {description: '填写一个数、分数或百分数。', response: 'string', example: '3/4'},
  choice: {description: '点选一个选项。', response: 'zero-based integer index'},
  points: {description: '拖动点或用坐标按钮移动。', response: '[{x:number,y:number}]'},
  cells: {description: '点方格放置或移走；点颜色按钮换色。', response: '[{x:integer,y:integer,color:string}]'},
  'fraction-pieces': {description: '选整体、分母，再增加或减少等份。', response: '{pieces:[{unit:integer,denominator:integer,numerator:integer}]}'},
  'fraction-cards': {description: '从数字卡中选分子和分母。', response: '{numerator:integer,denominator:integer}'},
  pairs: {description: '先点左卡，再点右卡配成一对。', response: '[{leftId:string,rightId:string}]'},
  molecule: {description: '加入原子，点两个原子连接或断开。', response: '{atoms:[{id:string,element:string}],bonds:[{a:string,b:string,order?:integer}]}'},
  tangram: {description: '拖动七块拼板，点转向按钮调整。预放的拼板已锁定。', response: '{pieces:[{id:string,x:number,y:number,rotation:number,flipped?:false}]}' }
});

const FAMILY_TITLES = {
  'area-builder/areaConstructed': '拼出指定面积',
  'area-builder/areaAndPerimeterConstructed': '同时满足面积和周长',
  'area-builder/areaAndProportionConstructed': '面积和颜色比例',
  'area-builder/areaPerimeterAndProportionConstructed': '面积、周长和颜色比例',
  'area-builder/areaEntered-orthogonal': '数凹角图形的面积',
  'area-builder/areaEntered-diagonal': '含半格的图形面积',
  'area-builder/areaEntered-hole': '扣除空洞的面积',
  'fractions-intro/shape-PIE': '圆饼分数拼块',
  'fractions-intro/shape-BAR': '长条分数拼块',
  'fractions-intro/number': '用数字卡搭等值分数',
  'fraction-matcher/fractions': '配对等值分数',
  'fraction-matcher/mixed-numbers': '配对带分数',
  'balancing-act/position': '把砝码放到平衡的位置',
  'balancing-act/mass': '求未知砝码质量',
  'balancing-act/tilt': '判断横杆会向哪侧倾斜'
};
const MOLECULE_NAMES = {280:'二氧化碳',962:'水',947:'氮气',281:'一氧化碳',977:'氧气',783:'氢气',222:'氨',24526:'氯气',145068:'一氧化氮',6326:'乙炔',6331:'硼烷',6356:'三氟化硼',6327:'氯甲烷',6325:'乙烯',24524:'氟气',11638:'氟甲烷',712:'甲醛',768:'氰化氢',784:'过氧化氢',402:'硫化氢',297:'甲烷',948:'一氧化二氮',24823:'臭氧',24404:'磷化氢',23953:'硅烷',1119:'二氧化硫'};
const MODE_TITLES = {triangle:'三角形面积构造', mirror:'轴对称', rotate:'绕原点旋转', scale:'等比例缩放', vectors:'向量相加', linear:'线性变换'};
const registry = new Map();
function register(id, moduleId, title, kind, spec = {}) {
  if (registry.has(id)) throw Error('Duplicate canonical objective: ' + id);
  const grade = spec.grade ?? 'general';
  registry.set(id, freeze({id, moduleId, title, kind, grade, gradeBand: String(grade), difficulties: [1, 2, 3], fixedCount: 3, capability:'assessment', ...spec}));
}
function nativeLevelReferences() {
  const groups=[
    {moduleId:'area-builder',mode:'game',levels:6,families:Object.keys(FAMILY_TITLES).filter(id=>id.startsWith('area-builder/'))},
    {moduleId:'fractions-intro',mode:'shape',levels:10,families:['fractions-intro/shape-PIE','fractions-intro/shape-BAR']},
    {moduleId:'fractions-intro',mode:'number',levels:10,families:['fractions-intro/number']},
    {moduleId:'fraction-matcher',mode:'fractions',levels:8,families:['fraction-matcher/fractions']},
    {moduleId:'fraction-matcher',mode:'mixed-numbers',levels:8,families:['fraction-matcher/mixed-numbers']},
    {moduleId:'balancing-act',mode:'game',levels:4,families:Object.keys(FAMILY_TITLES).filter(id=>id.startsWith('balancing-act/'))}
  ];
  return groups.flatMap(group=>Array.from({length:group.levels},(_,i)=>({moduleId:group.moduleId,mode:group.mode,level:i+1,companionObjectiveIds:group.families.map(f=>'phet/'+f),note:'原生关卡配置引用；配套题覆盖相关题型，不将原生随机题或完成成绩转为正式成绩。'})));
}
for (const t of TEMPLATES) register('math/' + t.id, 'primary-math', t.title, 'generated', {templateId:t.id, topic:t.topic});
for (const t of CURRICULUM_TEMPLATES) {
  const unit = UNITS.find(u => u.templateIds.includes(t.id));
  if (!unit) throw Error('No legal curriculum context for ' + t.id);
  register('math/' + t.id, 'primary-math', t.title, 'generated', {templateId:t.id, topic:t.topic, grade:unit.grade, gradeBand:String(unit.grade), curriculum:{version:CURRICULUM_VERSION, grade:unit.grade, unitId:unit.id}, fixedCount:Math.min(3, practiceLimit(unit,t.id))});
}
for (const q of FIXED_QUESTIONS) register('math/fixed/' + q.id, 'primary-math', q.title, 'fixed', {grade:q.grade, gradeBand:String(q.grade), fixedId:q.id, fixedCount:1, difficulties:[1]});
for (const lesson of LESSONS) register('proof/' + lesson.id, 'geometry-proofs', lesson.title, 'proof', {lessonId:lesson.id, grade:lesson.grades[0], gradeBand:String(lesson.grades[0]), fixedCount:2});
for (const mode of Object.keys(MODE_TITLES)) register('jsx/' + mode, 'jsxgraph-playground', MODE_TITLES[mode], 'jsx', {mode, fixedCount:6, difficulties:[1]});
for (const goal of ['square','creative']) register('tangram/' + goal, 'tangram-flat', goal === 'square' ? '方形七巧板' : '创意轮廓七巧板', 'tangram', {goal, fixedCount:1, tiers:{1:'预放三块',2:'预放两块',3:'自主放置七块'}});
for (const [family, title] of Object.entries(FAMILY_TITLES)) register('phet/' + family, family.split('/')[0], title, 'phet', {family, companion:true});
for (const ref of REFERENCES.molecules) register('molecule/cid-' + ref.cid, 'build-a-molecule', MOLECULE_NAMES[ref.cid], 'molecule', {cid:ref.cid, companion:true, families:['build-a-molecule/single-molecule/collection','build-a-molecule/multiple-molecules/collection']});
const flightChecks = new Map();
for (const q of REFERENCES.flightQuestions) {
  const id = 'space/' + q.stepId;
  if (!flightChecks.has(id)) { flightChecks.set(id, q); register(id,'spaceflight',q.title,'space',{stepId:q.stepId,fixedCount:1,difficulties:[1]}); }
  else if (JSON.stringify([q.prompt,q.choices,q.answer]) !== JSON.stringify([flightChecks.get(id).prompt,flightChecks.get(id).choices,flightChecks.get(id).answer])) throw Error('Different quizzes cannot share a flight objective');
}
const ALIASES = freeze({
  'question-bank':'primary-math', 'jsx-triangle':'jsxgraph-playground', 'jsx-mirror':'jsxgraph-playground', 'jsx-rotation':'jsxgraph-playground', 'jsx-scale':'jsxgraph-playground', 'jsx-vectors':'jsxgraph-playground', 'jsx-linear':'jsxgraph-playground'
});
const ALIAS_MODES = {'jsx-triangle':'triangle','jsx-mirror':'mirror','jsx-rotation':'rotate','jsx-scale':'scale','jsx-vectors':'vectors','jsx-linear':'linear'};

/** Available assessment objectives and their classroom module references. */
export function catalog() {
  const objectives = [...registry.values()].map(clone);
  const wordProblemSources=getWordProblemSources([...registry.values()]);
  const modules = ACTIVITIES.map(activity => {
    const canonicalModuleId = activity.id==='word-problems'?'primary-math':ALIASES[activity.id] ?? activity.id;
    const ids = activity.id==='word-problems'?[...new Set(wordProblemSources.assessmentSelections.filter(s=>s.available).map(s=>s.objectiveId))]:objectives.filter(o => o.moduleId === canonicalModuleId && (!ALIAS_MODES[activity.id] || o.mode === ALIAS_MODES[activity.id])).map(o=>o.id);
    return {id:activity.id,title:activity.title,canonicalModuleId,supportsAssessment:ids.length>0,objectives:ids};
  });
  return {
    assessmentVersion:ASSESSMENT_VERSION,ruleVersion:GRADING_RULE_VERSION,compatibilityVersion:COMPATIBILITY_VERSION,rewardVersion:REWARD_VERSION,
    modules,objectives,wordProblemSources,responseSchemas:clone(RESPONSE_SCHEMAS),nativeLevelReferences:nativeLevelReferences(),
    curriculumUnits:UNITS.map(u=>({id:u.id,title:u.title,grade:u.grade,version:CURRICULUM_VERSION,objectiveIds:u.templateIds.map(id=>'math/'+id),fixedObjectiveIds:u.questionIds.map(id=>'math/fixed/'+id),note:'课程入口共用模板目标。正式范围以该目标标明的年级与难度为准。'})),
    flightChecks:REFERENCES.flightQuestions.map(q=>({missionId:q.missionId,stepId:q.stepId,objectiveId:'space/'+q.stepId})),
    moleculeCollections:['single-molecule','multiple-molecules'].map(mode=>({family:'build-a-molecule/'+mode+'/collection',objectiveIds:REFERENCES.molecules.map(r=>'molecule/cid-'+r.cid)})),
    aliases:clone(ALIASES),notice:'选择目标即可开始考核。每次交卷后提供解析，可再次考核并保留最高成绩。'
  };
}

function textItem(questionId, prompt, value, {unit='', tolerance=null, explanation='', visual=null, source={}, requireSimplified=false, requirePercent=false, display}={}) {
  return {questionId,version:source.version??'1',type:'text',prompt,weight:1,maxScore:1,publicInput:{unit,requireSimplified,requirePercent,...(visual?{visual}:{}),help:'只填写结果；可以使用整数、小数或分数。'},grading:tolerance===null?{kind:'exact-number',value:clone(value),unit,requireSimplified,requirePercent,source:clone(source)}:{kind:'approx-number',value,tolerance,unit,source:clone(source)},solution:{answer:display??(tolerance===null?(value.d==='1'?value.n:value.n+'/'+value.d):fmt(value)),explanation}};
}
function choiceItem(questionId,prompt,choices,index,explanation,source={}) {
  return {questionId,version:source.version??'1',type:'choice',prompt,weight:1,maxScore:1,publicInput:{choices:clone(choices),help:'点选一个选项。'},grading:{kind:'choice',index,choices:clone(choices),source:clone(source)},solution:{answer:choices[index],explanation}};
}
function generatedItems(objective,difficulty,seed) {
  const sheet=generateWorksheet({seed,difficulty,count:objective.fixedCount,templateIds:[objective.templateId],...(objective.curriculum?{curriculum:objective.curriculum}:{})});
  return sheet.questions.map(q=>{
    const source={version:q.curriculum?ENGINE_VERSION+'/'+q.curriculum.version:ENGINE_VERSION,...(q.curriculum?{curriculum:clone(q.curriculum)}:{}),templateId:q.templateId,params:clone(q.params)};
    if(q.answer.type==='choice')return choiceItem(q.id,q.prompt,q.answer.choices,q.answer.choices.indexOf(q.answer.value),q.explanation,source);
    return textItem(q.id,q.prompt,q.answer.value,{unit:q.answer.unit||'',explanation:q.explanation,visual:q.visual,requireSimplified:!!q.answer.requireSimplified,requirePercent:!!q.answer.requirePercent,display:answerText(q.answer),source});
  });
}
function fixedItems(objective) {
  const q=FIXED_QUESTIONS.find(q=>q.id===objective.fixedId);
  let display=String(q.answer);
  for(let d=1;d<=120;d++){const n=Math.round(q.answer*d);if(Math.abs(q.answer-n/d)<1e-10){display=d===1?String(n):`${n}/${d}`;break;}}
  return [textItem(q.id,q.prompt,q.answer,{unit:q.unit,tolerance:1e-8,display,explanation:q.solution,source:{version:'fixed-math-1',calc:clone(q.calc)}})];
}
function proofItems(objective,difficulty,rng) {
  const lesson=LESSONS.find(l=>l.id===objective.lessonId),raw={};
  for(const p of lesson.params){const steps=Math.round((p.max-p.min)/p.step),lo=Math.floor(steps*(difficulty-1)/3),hi=Math.ceil(steps*difficulty/3);raw[p.key]=p.min+rng.int(lo,hi)*p.step;}
  const values=normalize(lesson,raw),parameters=lesson.params.map(p=>({key:p.key,label:p.label,value:values[p.key]}));
  return [question(lesson,values),extensionQuestion(lesson,values)].map((q,i)=>textItem(lesson.id+'/'+i,q.prompt+' 若含圆周率，使用π≈3.141592653589793；结果保留三位小数即可。',q.answer,{tolerance:.011,unit:q.units,visual:{type:'parameters',parameters},explanation:i===0?`${lesson.formula}；代入这些参数，结果约为${fmt(q.answer)}。`:`根据同一组参数计算，结果约为${fmt(q.answer)}。`,source:{version:'geometry-1',lessonId:lesson.id,variant:i,params:values}}));
}
function pointsItem(questionId,prompt,input,grading,solution,weight=1) {
  return {questionId,version:'coordinates-1',type:'points',prompt,weight,maxScore:weight,publicInput:{count:grading.count,bounds:{minX:-8,maxX:8,minY:-8,maxY:8},grid:{step:.25},...input,help:'每个点按顺序回答。可以拖点，也可以用坐标按钮调整。'},grading,solution};
}
function rotatePoint(p,degrees) {const t=degrees*Math.PI/180;return point(p.x*Math.cos(t)-p.y*Math.sin(t),p.x*Math.sin(t)+p.y*Math.cos(t));}
function jsxItems(objective,rng) {
  return PLAYGROUND_TARGETS[objective.mode].map((target,i)=>{
    const id=objective.mode+'/'+i, mode=objective.mode;
    if(mode==='triangle')return pointsItem(id,`摆出三个点，让三角形的面积为${target}。`,{targetArea:target,labels:['A','B','C'],initialPoints:[point(0,0),point(4,0),point(1,1)]},{kind:'points-area',count:3,area:target,tolerance:.03},{answer:[point(0,0),point(4,0),point(1,target/2)],explanation:'底为4，高为目标面积的一半，面积=底×高÷2。也可以用其他满足条件的非退化三角形。'});
    if(mode==='mirror') {const axis=rng.int(-1,1),t=point(...target),answer=point(2*axis-t.x,t.y);return pointsItem(id,`把点A摆好，使它关于直线x=${axis}的镜像在（${t.x}，${t.y}）。`,{axis,target:t,labels:['A'],initialPoints:[point(0,0)]},{kind:'points-mirror',count:1,axis,target:t,tolerance:.03},{answer:[answer],explanation:`反射保持纵坐标，横坐标满足x′=2×${axis}−x。`});}
    const source=[point(1,0),point(0,2),point(-1,0)];
    if(mode==='rotate') {const expected=source.map(p=>rotatePoint(p,target));return pointsItem(id,`将给定的三个顶点绕原点逆时针旋转${target}°，摆出对应顶点。`,{angle:target,sourcePoints:source,labels:['A′','B′','C′'],initialPoints:clone(source),grid:{step:.01}},{kind:'points-equal',count:3,points:expected,tolerance:.03},{answer:expected,explanation:'每个点应用（xcosθ−ysinθ，xsinθ+ycosθ）；边长和面积保持不变。'});}
    if(mode==='scale') {const k=Math.sqrt(target),expected=source.map(p=>point(k*p.x,k*p.y));return pointsItem(id,`以原点为中心等比例缩放，使面积变为原来的${target}倍，摆出三个对应点。`,{areaFactor:target,sourcePoints:source,labels:['A′','B′','C′'],initialPoints:clone(source)},{kind:'points-equal',count:3,points:expected,tolerance:.03},{answer:expected,explanation:`边长倍数的平方等于面积倍数，所以每个坐标乘${fmt(k)}。`});}
    if(mode==='vectors') {const t=point(...target);return pointsItem(id,`设定两段位移，让它们相加后的终点在（${t.x}，${t.y}）。`,{target:t,labels:['位移一','位移二'],initialPoints:[point(0,0),point(0,0)]},{kind:'points-sum',count:2,target:t,tolerance:.03},{answer:[point(t.x,0),point(0,t.y)],explanation:'分别相加横向、纵向的位移。只要两段位移的和正确，可以有多种分配。'});}
    const inputs=[point(2,1),point(-1,2)],u=point(...target[0]),v=point(...target[1]),expected=inputs.map(p=>point(p.x*u.x+p.y*v.x,p.x*u.y+p.y*v.y));
    return pointsItem(id,`变换规则为x′=${u.x}x+${v.x}y，y′=${u.y}x+${v.y}y。摆出两个给定点变换后的位置。`,{matrix:[[u.x,v.x],[u.y,v.y]],sourcePoints:inputs,labels:['第一个对应点','第二个对应点'],initialPoints:clone(inputs)},{kind:'points-equal',count:2,points:expected,tolerance:.03},{answer:expected,explanation:'把每个点的横、纵坐标分别代入两条变换规则；两列共线的变换可以把平面压成直线。'});
  });
}

function transformPolygon(piece,placement) {return piece.polygon.map(p=>{const q=rotatePoint(p,placement.rotation);return point(q.x+placement.x,q.y+placement.y);});}
function insidePolygon(p,poly,epsilon=1e-9) {
  let sign=0;for(let i=0;i<poly.length;i++){const c=cross(poly[i],poly[(i+1)%poly.length],p);if(Math.abs(c)<=epsilon)continue;const s=Math.sign(c);if(sign&&sign!==s)return false;sign=s;}return true;
}
// Compute union boundaries, dropping internal seams and collinear subdivisions.
// The public silhouette never includes the private seven target slots.
function unionOutline(polygons) {
  const edges=polygons.flatMap(poly=>poly.map((a,i)=>({a,b:poly[(i+1)%poly.length]}))),boundary=new Map();
  const key=p=>`${p.x.toFixed(7)},${p.y.toFixed(7)}`;
  for(const {a,b} of edges){
    const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),cuts=[0,1];
    for(const e of edges){const ex=e.b.x-e.a.x,ey=e.b.y-e.a.y,den=dx*ey-dy*ex;
      if(Math.abs(den)>1e-10){const t=((e.a.x-a.x)*ey-(e.a.y-a.y)*ex)/den,s=((e.a.x-a.x)*dy-(e.a.y-a.y)*dx)/den;if(t>1e-9&&t<1-1e-9&&s>=-1e-9&&s<=1+1e-9)cuts.push(t);}
      else if(Math.abs(cross(a,b,e.a))<1e-9)for(const p of [e.a,e.b]){const t=((p.x-a.x)*dx+(p.y-a.y)*dy)/(length*length);if(t>1e-9&&t<1-1e-9)cuts.push(t);}
    }
    const sorted=[...new Set(cuts.map(t=>Number(t.toFixed(10))))].sort((a,b)=>a-b);
    for(let i=1;i<sorted.length;i++){const lo=sorted[i-1],hi=sorted[i];if(hi-lo<1e-8)continue;const mid=(lo+hi)/2,m=point(a.x+dx*mid,a.y+dy*mid),e=1e-6,normal=point(-dy/length*e,dx/length*e),left=point(m.x+normal.x,m.y+normal.y),right=point(m.x-normal.x,m.y-normal.y),contains=p=>polygons.some(poly=>insidePolygon(p,poly,1e-10));if(contains(left)===contains(right))continue;const p=point(a.x+dx*lo,a.y+dy*lo),q=point(a.x+dx*hi,a.y+dy*hi),keys=[key(p),key(q)].sort();boundary.set(keys.join('|'),{a:p,b:q});}
  }
  const remaining=[...boundary.values()],loops=[];
  while(remaining.length){const edge=remaining.pop(),loop=[edge.a,edge.b];let guard=0;while(key(loop.at(-1))!==key(loop[0])&&guard++<1000){const index=remaining.findIndex(e=>key(e.a)===key(loop.at(-1))||key(e.b)===key(loop.at(-1)));if(index<0)throw Error('Unclosed Tangram silhouette');const next=remaining.splice(index,1)[0];loop.push(key(next.a)===key(loop.at(-1))?next.b:next.a);}if(guard>=1000)throw Error('Tangram silhouette loop limit');loop.pop();let changed=true;while(changed&&loop.length>3){changed=false;for(let i=0;i<loop.length;i++)if(Math.abs(cross(loop[(i+loop.length-1)%loop.length],loop[i],loop[(i+1)%loop.length]))<1e-8){loop.splice(i,1);changed=true;break;}}loops.push(loop);}
  return loops;
}
function tangramItems(objective,difficulty) {
  const pieces=clone(REFERENCES.tangram.pieces),placements=clone(REFERENCES.tangram[objective.goal]);
  const rawPolygons=pieces.map((p,i)=>transformPolygon(p,placements[i]));
  const minX=Math.min(...rawPolygons.flat().map(p=>p.x)),minY=Math.min(...rawPolygons.flat().map(p=>p.y));
  for(const p of placements){p.x+=.5-minX;p.y+=.15-minY;}
  const targetPolygons=pieces.map((p,i)=>({id:p.id,polygon:transformPolygon(p,placements[i])}));
  const givenCount={1:3,2:2,3:0}[difficulty],givenPieces=placements.slice(0,givenCount),givenIds=givenPieces.map(p=>p.id),weight=7-givenCount;
  const starts=[[-1.6,1.2],[-.7,1.2],[-1.6,.2],[-.7,.2],[-1.6,-.7],[-.7,-.7],[.05,-.8]],bounds={minX:-2,maxX:3,minY:-1.5,maxY:2};
  return [{questionId:'tangram/'+objective.goal,version:'tangram-snapshot-1',type:'tangram',prompt:`把七块拼板摆成${objective.goal==='square'?'方形':'创意'}轮廓。${givenCount?`服务器已预放并锁定${givenCount}块，请摆好其余${weight}块。`:'这次自主摆好全部七块。'}`,weight,maxScore:weight,publicInput:{pieces:pieces.map((p,i)=>({id:p.id,label:String(i+1),polygon:p.polygon,initial:givenPieces.find(g=>g.id===p.id)??{id:p.id,x:starts[i][0],y:starts[i][1],rotation:i*30}})),givenPieces,bounds,boardWidth:5,boardHeight:3.5,rotationStep:15,moveStep:.025,allowFlip:false,target:{outline:unionOutline(targetPolygons.map(t=>t.polygon.map(p=>point(Number(p.x.toFixed(3)),Number(p.y.toFixed(3))))))},help:'先选拼板，再移动或旋转。预放拼板不会计入本题得分。'},grading:{kind:'tangram',pieces,targetPolygons,givenPieces,givenIds,bounds,tolerance:.025},solution:{answer:{pieces:placements},explanation:'每块按真实顶点计算；七个目标位置只能各占一次。同形同大小的拼板可以互换。求助档位由服务器发行时的预放数量决定。'}}];
}

function areaCompanion(family,difficulty,rng,index) {
  const name=family.split('/')[1],w=rng.int(2,difficulty+2),h=rng.int(2,difficulty+2),colours=['green','purple'];
  if(name.startsWith('areaEntered')){
    let outer,holes=[];const width=w+2,height=name.endsWith('diagonal')?width:h+2;
    if(name.endsWith('orthogonal'))outer=[point(0,0),point(width,0),point(width,height-1),point(width-1,height-1),point(width-1,height),point(0,height)];
    else if(name.endsWith('diagonal'))outer=[point(0,0),point(width,0),point(0,height)];
    else{outer=[point(0,0),point(width,0),point(width,height),point(0,height)];holes=[[point(1,1),point(2,1),point(2,2),point(1,2)]];}
    const result=area(outer)-holes.reduce((s,p)=>s+area(p),0);
    return textItem(family+'/'+index,'求图形盖住的面积。每个小方格面积为1；空洞不算入。',rational(Math.round(result*2),2),{visual:{type:'polygons',width,height,outer:[outer],holes},explanation:`外部面积减去空洞面积，结果为${fmt(result)}平方单位。`,source:{version:'phet-companion-1',family}});
  }
  const targetArea=w*h,perimeter=name.includes('Perimeter')?2*(w+h):null,proportion=name.includes('Proportion')?rational(rng.int(1,targetArea-1),targetArea):null;
  const input={board:{width:9,height:9},colors:colours.map(id=>({id,label:id==='green'?'绿色':'紫色'})),allowedColors:proportion?colours:['green'],targetArea,...(perimeter!==null?{targetPerimeter:perimeter}:{}),...(proportion?{proportion:{color:'green',n:Number(proportion.n),d:Number(proportion.d)}}:{}),help:'点空格放一块；点已有格移走。图形必须连成一块。'};
  const prompt=`拼出面积${targetArea}的连通图形${perimeter===null?'':`，周长为${perimeter}`}${proportion?`，其中绿色占${proportion.n}/${proportion.d}`:''}。`;
  const greenCount=proportion?Number(proportion.n)*targetArea/Number(proportion.d):targetArea;
  const solution=Array.from({length:targetArea},(_,i)=>({x:i%w,y:Math.floor(i/w),color:i<greenCount?'green':'purple'}));
  return {questionId:family+'/'+index,version:'phet-companion-1',type:'cells',prompt,weight:1,maxScore:1,publicInput:input,grading:{kind:'cells',board:input.board,allowedColors:input.allowedColors,area:targetArea,perimeter,proportion},solution:{answer:solution,explanation:'面积数占用的方格；周长数外露边。共享的内部边不算周长。颜色比例以全部占用方格为分母。'}};
}
function fractionCompanion(family,difficulty,rng,index) {
  const d=rng.pick([2,3,4,6,8,12]),n=rng.int(1,difficulty===3?d*2-1:d-1),target={n,d};
  if(family.endsWith('/number')){
    const multiplier=rng.int(1,3),num=n*multiplier,den=d*multiplier,values=[...new Set([num,den,0,1,rng.int(2,12)])].sort((a,b)=>a-b),cards=values.map(value=>({value,count:value===num&&num===den?2:1}));
    return {questionId:family+'/'+index,version:'phet-companion-1',type:'fraction-cards',prompt:`用数字卡搭出与${n}/${d}等值的分数。每张卡只能用一次。`,weight:1,maxScore:1,publicInput:{target,cards,help:'上方是分子，下方是分母。点数字卡放入对应位置。'},grading:{kind:'fraction-cards',target,cards},solution:{answer:{numerator:num,denominator:den},explanation:'分子和分母同时乘相同的正整数，分数的大小不变；分母不能为0。'}};
  }
  const maxUnits=3,denominators=[...new Set([d,2,3,4,6,8,12])].sort((a,b)=>a-b),inventory=denominators.map(denominator=>({denominator,count:denominator*maxUnits}));
  const pieces=[];let rest=n;for(let unit=0;rest>0;unit++){const numerator=Math.min(d,rest);pieces.push({unit,denominator:d,numerator});rest-=numerator;}
  return {questionId:family+'/'+index,version:'phet-companion-1',type:'fraction-pieces',prompt:`用${family.endsWith('PIE')?'圆饼':'长条'}等份拼出${n}/${d}个整体。每个容器最多装满一个整体。`,weight:1,maxScore:1,publicInput:{representation:family.endsWith('PIE')?'PIE':'BAR',target,units:Array.from({length:maxUnits},(_,id)=>({id,label:'第'+(id+1)+'个整体'})),denominators,inventory,maxPieces:72,help:'选一个整体和分母，再点加号放入对应大小的等份。'},grading:{kind:'fraction-pieces',target,inventory,maxUnits,maxPieces:72},solution:{answer:{pieces},explanation:'每份是1/分母。按整体分别相加，各个容器不超过1，全部等份的和应等于目标。'}};
}
function matcherCompanion(family,difficulty,rng,index) {
  const mixed=family.endsWith('mixed-numbers'),bases=[{n:rng.int(1,3),d:4},{n:rng.int(1,2),d:3},{n:1,d:2}];
  const used=new Set();for(let i=0;i<bases.length;i++){if(mixed)bases[i].n+=bases[i].d*(difficulty+i%2);while(used.has(bases[i].n/bases[i].d))bases[i].n+=bases[i].d;used.add(bases[i].n/bases[i].d);}
  const label=(f,isMixed)=>isMixed&&f.n>=f.d?`${Math.floor(f.n/f.d)}又${f.n%f.d}/${f.d}`:`${f.n}/${f.d}`;
  const left=bases.map((f,i)=>({id:'l'+i,label:label(f,mixed),...(i===0?{visual:{type:'fraction',representation:'BAR',n:f.n,d:f.d}}:{})}));
  const right=bases.map((f,i)=>({id:'r'+i,label:`${f.n*2}/${f.d*2}`}));
  for(let i=right.length-1;i>0;i--){const j=rng.int(0,i);[right[i],right[j]]=[right[j],right[i]];}
  const values=Object.fromEntries(bases.flatMap((f,i)=>[['l'+i,f],['r'+i,{n:f.n*2,d:f.d*2}]]));
  return {questionId:family+'/'+index,version:'phet-companion-1',type:'pairs',prompt:'把左、右卡片配成三对等值分数，每张卡用一次。',weight:3,maxScore:3,publicInput:{left,right,help:'先点一张左卡，再点表示相同数值的右卡。'},grading:{kind:'pairs',values,leftIds:left.map(p=>p.id),rightIds:right.map(p=>p.id)},solution:{answer:bases.map((_,i)=>({leftId:'l'+i,rightId:'r'+i})),explanation:'带分数先化成假分数；交叉乘积相等的两张卡表示相同数值。'}};
}
function balanceCompanion(family,difficulty,rng,index) {
  const name=family.split('/')[1],distance=rng.pick([.5,1,1.5,2]),mass=rng.int(1,4+difficulty)*5;
  const describe=known=>known.map(p=>`${p.mass}千克在${p.distance}米`).join('；');
  const addCounterweights=known=>{if(difficulty>=2)known.push({mass:10,distance:-.5},{mass:5,distance:1});if(difficulty===3)known.push({mass:5,distance:-1.5},{mass:15,distance:.5});return known;};
  if(name==='position') {
    const desired=rng.pick([-.5,-1,-1.5,-2,.5,1,1.5,2]),movableMass=rng.pick([10,20,30]),fixedDistance=rng.pick([.5,1]),known=addCounterweights([{mass:movableMass*Math.abs(desired)/fixedDistance,distance:-Math.sign(desired)*fixedDistance}]);
    return textItem(family+'/'+index,`已放置：${describe(known)}。另一个${movableMass}千克砝码应放在什么位置，才能平衡？左为负、右为正。`,rational(desired*2,2),{unit:'米',visual:{type:'balance',known,movableMass,bounds:{min:-2,max:2,step:.25}},explanation:'对支点的质量×有向距离之和应为0。把已知砝码的有向作用相加，再取相反数除以可移动砝码质量。',source:{version:'phet-companion-1',family,known,movableMass}});
  }
  if(name==='mass') {
    const unknownDistance=rng.pick([-.5,-1,-2,.5,1,2]),unknownMass=mass*distance/Math.abs(unknownDistance),known=addCounterweights([{mass,distance:-Math.sign(unknownDistance)*distance}]);
    return textItem(family+'/'+index,`已知砝码：${describe(known)}。未知砝码在${unknownDistance}米。左为负、右为正。平衡时，未知质量是多少千克？`,rational(Math.round(unknownMass*4),4),{unit:'千克',visual:{type:'balance',known,unknownDistance},explanation:`平衡时全部质量×有向距离之和为0；求得未知质量${fmt(unknownMass)}千克。`,source:{version:'phet-companion-1',family,known,unknownDistance}});
  }
  const rightMass=rng.int(1,4+difficulty)*5,rightDistance=rng.pick([.5,1,1.5,2]),known=[{mass,distance:-distance},{mass:rightMass,distance:rightDistance}];
  for(let i=1;i<difficulty;i++)known.push({mass:rng.int(1,4)*5,distance:rng.pick([-.5,-1,-1.5,-2,.5,1,1.5,2])});
  const torque=known.reduce((s,p)=>s+p.mass*p.distance,0),choices=['左侧下降','右侧下降','保持水平'],answer=torque<0?0:torque>0?1:2;
  return choiceItem(family+'/'+index,'拿掉支撑后，横杆会怎样？已放置：'+describe(known)+'。左为负、右为正。',choices,answer,'分别计算两边质量×距离；同一侧的作用相加，作用量较大的一侧下降，相等则保持水平。',{version:'phet-companion-1',family,known});
}
function phetItems(objective,difficulty,rng) {
  return Array.from({length:objective.fixedCount},(_,i)=>objective.moduleId==='area-builder'?areaCompanion(objective.family,difficulty,rng,i):objective.moduleId==='fractions-intro'?fractionCompanion(objective.family,difficulty,rng,i):objective.moduleId==='fraction-matcher'?matcherCompanion(objective.family,difficulty,rng,i):balanceCompanion(objective.family,difficulty,rng,i));
}
function moleculeItems(objective,difficulty,rng) {
  const ref=REFERENCES.molecules.find(r=>r.cid===objective.cid),counts={};for(const e of ref.atoms)counts[e]=(counts[e]??0)+1;
  const elements=Object.keys(counts),element=elements[rng.int(0,elements.length-1)],copies=[2,3,5][difficulty-1];
  const graph={atoms:ref.atoms.map((element,i)=>({id:'a'+(i+1),element})),bonds:ref.bonds.map(b=>({a:'a'+b.a,b:'a'+b.b,order:b.order}))};
  return [
    {questionId:'cid-'+ref.cid+'/structure',version:'molecule-reference-1',type:'molecule',prompt:`搭建一个${objective.title}（${ref.molecularFormula}）。原子种类、数量与相邻关系都要正确。这里只操作连接，单双或三键不单独计分。`,weight:1,maxScore:1,publicInput:{name:objective.title,formula:ref.molecularFormula,elements,atomCount:ref.atoms.length,maxAtoms:ref.atoms.length,inventory:Object.entries(counts).map(([element,count])=>({element,count})),bondOrders:[1],help:'先加原子，再依次点两个原子来连接。重复点同一对可断开。'},grading:{kind:'molecule',graph,cid:ref.cid,ignoreBondOrder:true},solution:{answer:graph,explanation:'与固定参考图比较元素和相邻关系。相同元素原子的编号可以交换，图的朝向和位置不影响结构。'}},
    textItem('cid-'+ref.cid+'/single-count',`一个${objective.title}（${ref.molecularFormula}）中有多少个${element}原子？`,rational(counts[element]),{explanation:`每个分子中${element}原子有${counts[element]}个。`,source:{version:'molecule-reference-1',cid:ref.cid,element}}),
    textItem('cid-'+ref.cid+'/collection-count',`收集${copies}个${objective.title}（${ref.molecularFormula}），一共需要多少个${element}原子？`,rational(counts[element]*copies),{explanation:`每个有${counts[element]}个，收集${copies}个需要${counts[element]}×${copies}=${counts[element]*copies}个。`,source:{version:'molecule-reference-1',cid:ref.cid,element,copies}})
  ];
}

/** Caller supplies only server-approved recipe choices; count/grade/module/rules
 * cannot be overridden. Seed is internal and deliberately absent from public DTOs. */
export function issueAssessment(options = {}) {
  if(!keysOnly(options,['objectiveId','difficulty','seed','sourceSelector']))throw new AssessmentError('考核配方含不支持的字段。');
  const objective=registry.get(options.objectiveId);
  if(!objective)throw new AssessmentError('未注册此考核目标。','unknown_objective');
  const difficulty=options.difficulty===undefined?objective.difficulties[0]:options.difficulty;
  if(!objective.difficulties.includes(difficulty))throw new AssessmentError('该目标不支持此难度。','unsupported_difficulty');
  const seed=options.seed===undefined?randomBytes(24).toString('hex'):options.seed;
  if(!['string','number'].includes(typeof seed)||(typeof seed==='number'&&!Number.isFinite(seed))||!String(seed).trim()||String(seed).length>120)throw new AssessmentError('服务端种子无效。');
  const rng=random(String(seed)+':'+objective.id+':'+difficulty),builders={generated:()=>generatedItems(objective,difficulty,String(seed)),fixed:()=>fixedItems(objective),proof:()=>proofItems(objective,difficulty,rng),jsx:()=>jsxItems(objective,rng),tangram:()=>tangramItems(objective,difficulty),phet:()=>phetItems(objective,difficulty,rng),molecule:()=>moleculeItems(objective,difficulty,rng),space:()=>{const q=flightChecks.get(objective.id);return [choiceItem(q.stepId,q.prompt,q.choices,q.answer,q.explanation,{version:'spaceflight-checks-1',stepId:q.stepId})];}};
  const sourceContext=options.sourceSelector===undefined?null:getWordProblemSelection(objective,difficulty,options.sourceSelector,[...registry.values()]);
  let sourceItems;
  if(sourceContext){
    sourceItems=issueWordProblemItems(objective,difficulty,String(seed),options.sourceSelector,[...registry.values()]);
    sourceContext.curatedQuestionCount=sourceItems.length;
    sourceContext.nativeSupplementCount=objective.fixedCount-sourceItems.length;
    if(sourceItems.length<objective.fixedCount)sourceItems.push(...builders[objective.kind]().slice(0,objective.fixedCount-sourceItems.length));
  }else sourceItems=builders[objective.kind]();
  const items=sourceItems.map((item,i)=>({id:'i'+String(i+1).padStart(2,'0'),...item,questionVersion:item.version}));
  if(items.length!==objective.fixedCount||items.some(i=>!Number.isSafeInteger(i.weight)||i.weight<=0||i.maxScore!==i.weight))throw Error('Registry structure mismatch');
  const definition={definitionVersion:1,assessmentVersion:ASSESSMENT_VERSION,compatibilityVersion:COMPATIBILITY_VERSION,ruleVersion:GRADING_RULE_VERSION,rewardVersion:REWARD_VERSION,moduleId:objective.moduleId,objectiveId:objective.id,title:objective.title,difficulty,grade:objective.grade,gradeBand:objective.gradeBand,bucketKey:`${objective.id}|grade:${objective.gradeBand}|tier:${difficulty}|compatible:${COMPATIBILITY_VERSION}|reward:${REWARD_VERSION}`,fixedCount:objective.fixedCount,maxScore:items.reduce((s,i)=>s+i.weight,0),serverSeed:String(seed),items};
  if(sourceContext){definition.sourceContext=sourceContext;definition.title=sourceContext.title;}
  definition.definitionId=createHash('sha256').update(sourceContext?'word-public-issuance:'+String(seed):JSON.stringify(definition)).digest('hex');
  return freeze(definition);
}

function validateDefinition(definition) {
  if(!record(definition)||definition.definitionVersion!==1||definition.ruleVersion!==GRADING_RULE_VERSION||definition.compatibilityVersion!==COMPATIBILITY_VERSION||!Array.isArray(definition.items)||definition.items.length!==definition.fixedCount||definition.items.length>100||!Number.isSafeInteger(definition.maxScore)||definition.maxScore<=0)throw new AssessmentError('不支持的题目快照或评分规则版本。','unsupported_definition');
  const ids=new Set();let total=0;for(const item of definition.items){if(!record(item)||typeof item.id!=='string'||ids.has(item.id)||!Number.isSafeInteger(item.maxScore)||item.maxScore<=0||item.weight!==item.maxScore||!record(item.grading))throw new AssessmentError('题目快照结构无效。','unsupported_definition');ids.add(item.id);total+=item.maxScore;}if(total!==definition.maxScore)throw new AssessmentError('题目满分不一致。','unsupported_definition');
}

export function publicAssessment(definition) {
  validateDefinition(definition);
  const fields=['definitionId','definitionVersion','assessmentVersion','compatibilityVersion','ruleVersion','rewardVersion','moduleId','objectiveId','title','difficulty','grade','gradeBand','bucketKey','fixedCount','maxScore'];
  return {...Object.fromEntries(fields.map(key=>[key,clone(definition[key])])),...(definition.sourceContext?{sourceContext:clone(definition.sourceContext)}:{}),items:definition.items.map(item=>Object.fromEntries(['id','questionId','version','questionVersion','type','prompt','weight','maxScore','publicInput'].map(key=>[key,clone(item[key])])))};
}

const result = (valid, correct, earned, message) => ({valid,correct,earned,message});
const invalid = message => result(false,false,0,message);
function numericInput(raw,unit='') {
  if(typeof raw!=='string'||raw.length>100)throw Error('请填写一个数。');
  let text=raw.normalize('NFKC').trim();
  if(unit&&text.endsWith(unit.normalize('NFKC')))text=text.slice(0,-unit.normalize('NFKC').length).trim();
  // Treat a leading decimal point as ordinary decimal notation; never evaluate.
  text=text.replace(/^([+-]?)\./,'$10.');
  return parseNumber(text);
}
function checkNumber(g,raw,maxScore) {
  let parsed;try{parsed=numericInput(raw,g.unit);}catch{return invalid('格式无效：请填写整数、小数、分数或百分数。');}
  if(g.requirePercent&&!parsed.percent)return invalid('请使用百分数格式。');
  let correct=g.kind==='approx-number'?Math.abs(Number(parsed.n)/Number(parsed.d)-g.value)<=g.tolerance:parsed.n===g.value.n&&parsed.d===g.value.d;
  if(correct&&g.requireSimplified&&(!parsed.simplified||(!parsed.fraction&&parsed.d!=='1')))correct=false;
  return result(true,correct,correct?maxScore:0,correct?'答对了。':g.requireSimplified?'请检查数值和最简分数格式。':'结果与本题条件不符。');
}
function readPoints(raw,g,bounds) {
  if(!Array.isArray(raw)||raw.length!==g.count)return null;
  if(raw.some(p=>!keysOnly(p,['x','y'])||!finite(p.x)||!finite(p.y)||p.x<bounds.minX||p.x>bounds.maxX||p.y<bounds.minY||p.y>bounds.maxY))return null;
  return raw;
}
function checkPoints(item,raw) {
  const g=item.grading,ps=readPoints(raw,g,item.publicInput.bounds);if(!ps)return invalid('点的数量、坐标或边界无效。');let correct;
  if(g.kind==='points-area')correct=area(ps)>1e-8&&Math.abs(area(ps)-g.area)<=g.tolerance;
  else if(g.kind==='points-mirror')correct=equalPoint(point(2*g.axis-ps[0].x,ps[0].y),g.target,g.tolerance);
  else if(g.kind==='points-sum')correct=equalPoint(point(ps[0].x+ps[1].x,ps[0].y+ps[1].y),g.target,g.tolerance);
  else correct=ps.every((p,i)=>equalPoint(p,g.points[i],g.tolerance));
  return result(true,correct,correct?item.maxScore:0,correct?'这些坐标满足目标。':'请检查对应点、方向和数学条件。');
}
function checkCells(g,raw,maxScore) {
  if(!Array.isArray(raw)||raw.length>g.board.width*g.board.height)return invalid('方格列表无效。');
  const occupied=new Set();for(const c of raw){if(!keysOnly(c,['x','y','color'])||!integer(c.x,0,g.board.width-1)||!integer(c.y,0,g.board.height-1)||!g.allowedColors.includes(c.color)||occupied.has(c.x+','+c.y))return invalid('不能使用重复、越界或未知颜色的格子。');occupied.add(c.x+','+c.y);}
  if(!raw.length)return result(true,false,0,'图形还没有占用格子。');
  const reached=new Set([raw[0].x+','+raw[0].y]),queue=[raw[0]];let perimeter=0;
  for(let i=0;i<queue.length;i++){const c=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(c.x+dx)+','+(c.y+dy);if(!occupied.has(k))perimeter++;else if(!reached.has(k)){reached.add(k);queue.push({x:c.x+dx,y:c.y+dy});}}}
  const proportion=g.proportion===null||BigInt(raw.filter(c=>c.color==='green').length)*BigInt(g.proportion.d)===BigInt(raw.length)*BigInt(g.proportion.n);
  const correct=raw.length===g.area&&reached.size===raw.length&&(g.perimeter===null||perimeter===g.perimeter)&&proportion;
  return result(true,correct,correct?maxScore:0,correct?'面积、连通性和本题其他条件都正确。':'请检查格数、连通性、外露边以及要求的颜色比例。');
}
function checkFractionPieces(g,raw,maxScore) {
  if(!keysOnly(raw,['pieces'])||!Array.isArray(raw.pieces)||raw.pieces.length>72)return invalid('等份列表格式无效。');
  const sums=Array.from({length:g.maxUnits},()=>({n:0n,d:1n})),used=new Map(g.inventory.map(p=>[p.denominator,0]));let pieceCount=0;
  for(const p of raw.pieces){if(!keysOnly(p,['unit','denominator','numerator'])||!integer(p.unit,0,g.maxUnits-1)||!used.has(p.denominator)||!integer(p.numerator,0,g.maxPieces))return invalid('整体、分母或取份数无效。');used.set(p.denominator,used.get(p.denominator)+p.numerator);pieceCount+=p.numerator;const s=sums[p.unit],den=BigInt(p.denominator);s.n=s.n*den+BigInt(p.numerator)*s.d;s.d*=den;}
  if(pieceCount>g.maxPieces||g.inventory.some(p=>used.get(p.denominator)>p.count)||sums.some(s=>s.n>s.d))return invalid('材料不足，或某个整体超过1。');
  let total={n:0n,d:1n};for(const s of sums)total={n:total.n*s.d+s.n*total.d,d:total.d*s.d};
  const correct=total.n*BigInt(g.target.d)===BigInt(g.target.n)*total.d;
  return result(true,correct,correct?maxScore:0,correct?'这些等份正好拼成目标分数。':'等份总量与目标分数不同。');
}
function checkFractionCards(g,raw,maxScore) {
  if(!keysOnly(raw,['numerator','denominator'])||!integer(raw.numerator,0,1000)||!integer(raw.denominator,1,1000))return invalid('请选择可用的数字卡；分母不能为0。');
  const used=new Map();for(const v of [raw.numerator,raw.denominator])used.set(v,(used.get(v)??0)+1);
  for(const [v,count] of used){const card=g.cards.find(p=>p.value===v);if(!card||card.count<count)return invalid('数字卡不存在或被重复使用。');}
  const correct=raw.numerator*g.target.d===g.target.n*raw.denominator;
  return result(true,correct,correct?maxScore:0,correct?'组成了等值分数。':'这两张卡组成的分数不是目标值。');
}
function checkPairs(g,raw,maxScore) {
  if(!Array.isArray(raw)||raw.length>g.leftIds.length)return invalid('配对列表无效。');
  const left=new Set(),right=new Set();let earned=0;
  for(const pair of raw){if(!keysOnly(pair,['leftId','rightId'])||!g.leftIds.includes(pair.leftId)||!g.rightIds.includes(pair.rightId)||left.has(pair.leftId)||right.has(pair.rightId))return invalid('每张已发行卡只能用一次，不能使用未知卡片。');left.add(pair.leftId);right.add(pair.rightId);const a=g.values[pair.leftId],b=g.values[pair.rightId];if(a.n*b.d===b.n*a.d)earned++;}
  return result(true,earned===maxScore,earned,`${earned}对符合等值关系。`);
}
function readGraph(raw,expectedCount) {
  if(!keysOnly(raw,['atoms','bonds'])||!Array.isArray(raw.atoms)||raw.atoms.length!==expectedCount||!Array.isArray(raw.bonds)||raw.bonds.length>expectedCount*(expectedCount-1)/2)return null;
  const atoms=new Map(),adj=new Map();
  for(const atom of raw.atoms){if(!keysOnly(atom,['id','element'])||typeof atom.id!=='string'||!/^[A-Za-z0-9_-]{1,32}$/.test(atom.id)||typeof atom.element!=='string'||atoms.has(atom.id))return null;atoms.set(atom.id,atom.element);adj.set(atom.id,new Set());}
  for(const bond of raw.bonds){if(!keysOnly(bond,['a','b','order'])||!atoms.has(bond.a)||!atoms.has(bond.b)||bond.a===bond.b||adj.get(bond.a).has(bond.b)||(bond.order!==undefined&&!integer(bond.order,1,3)))return null;adj.get(bond.a).add(bond.b);adj.get(bond.b).add(bond.a);}
  return {atoms,adj};
}
function graphMatches(actual,expected) {
  const exp=readGraph(expected,expected.atoms.length),signature=graph=>[...graph.atoms].map(([id,element])=>element+':'+graph.adj.get(id).size).sort().join('|');
  if(signature(actual)!==signature(exp))return false;
  const source=[...exp.atoms.keys()].sort((a,b)=>exp.adj.get(b).size-exp.adj.get(a).size),target=[...actual.atoms.keys()],assigned=new Map(),used=new Set();
  function visit(i){if(i===source.length)return true;const e=source[i];for(const a of target){if(used.has(a)||actual.atoms.get(a)!==exp.atoms.get(e)||actual.adj.get(a).size!==exp.adj.get(e).size)continue;let ok=true;for(const [previous,image] of assigned)if(exp.adj.get(e).has(previous)!==actual.adj.get(a).has(image)){ok=false;break;}if(!ok)continue;assigned.set(e,a);used.add(a);if(visit(i+1))return true;assigned.delete(e);used.delete(a);}return false;}
  return visit(0);
}
function checkMolecule(g,raw,maxScore) {
  const graph=readGraph(raw,g.graph.atoms.length);if(!graph)return invalid('原子编号、数量或连接列表无效。');
  const elements=new Set(g.graph.atoms.map(a=>a.element));if([...graph.atoms.values()].some(element=>!elements.has(element)))return invalid('本题没有这种元素的原子。');
  const correct=graphMatches(graph,g.graph);
  return result(true,correct,correct?maxScore:0,correct?'元素与连接结构符合这个分子。':'请检查原子种类、数量及哪些原子相邻；只有化学式相同还不够。');
}
function polygonMatches(a,b,tolerance) {
  if(a.length!==b.length)return false;
  return a.every(p=>b.some(q=>equalPoint(p,q,tolerance)))&&b.every(q=>a.some(p=>equalPoint(p,q,tolerance)));
}
function checkTangram(g,raw,maxScore) {
  if(!keysOnly(raw,['pieces'])||!Array.isArray(raw.pieces)||raw.pieces.length!==7)return invalid('必须提交七块拼板的真实变换。');
  const ids=new Set(),polygons=new Map();
  for(const p of raw.pieces){if(!keysOnly(p,['id','x','y','rotation','flipped'])||!g.pieces.some(piece=>piece.id===p.id)||ids.has(p.id)||!finite(p.x)||!finite(p.y)||p.x<g.bounds.minX||p.x>g.bounds.maxX||p.y<g.bounds.minY||p.y>g.bounds.maxY||!finite(p.rotation)||Math.abs(p.rotation)>3600||Math.abs(p.rotation/15-Math.round(p.rotation/15))>1e-8||(p.flipped!==undefined&&p.flipped!==false))return invalid('拼板编号、变换、转角或边界无效。');ids.add(p.id);polygons.set(p.id,transformPolygon(g.pieces.find(piece=>piece.id===p.id),p));}
  for(const given of g.givenPieces){const expected=g.targetPolygons.find(t=>t.id===given.id).polygon;if(!polygonMatches(polygons.get(given.id),expected,1e-6))return invalid('服务器预放的拼板不能移动。');}
  const slots=g.targetPolygons.filter(t=>!g.givenIds.includes(t.id)),movable=g.pieces.filter(p=>!g.givenIds.includes(p.id)),assigned=new Map();
  function place(i,seen){for(let j=0;j<slots.length;j++){if(seen.has(j)||!polygonMatches(polygons.get(movable[i].id),slots[j].polygon,g.tolerance))continue;seen.add(j);if(!assigned.has(j)||place(assigned.get(j),seen)){assigned.set(j,i);return true;}}return false;}
  let earned=0;for(let i=0;i<movable.length;i++)if(place(i,new Set()))earned++;
  return result(true,earned===maxScore,earned,`${earned}块自主拼板与不同的目标位置匹配。`);
}
function gradeItem(item,raw) {
  const g=item.grading;
  if(raw===undefined||raw===null)return invalid('本题未作答。');
  if(g.kind==='word-problem')return gradeWordProblemItem(item,raw);
  if(g.kind==='exact-number'||g.kind==='approx-number')return checkNumber(g,raw,item.maxScore);
  if(g.kind==='choice'){if(!integer(raw,0,g.choices.length-1))return invalid('请选择一个已发行选项。');const correct=raw===g.index;return result(true,correct,correct?item.maxScore:0,correct?'答对了。':'这个选项不符合题目。');}
  if(g.kind.startsWith('points-'))return checkPoints(item,raw);
  if(g.kind==='cells')return checkCells(g,raw,item.maxScore);
  if(g.kind==='fraction-pieces')return checkFractionPieces(g,raw,item.maxScore);
  if(g.kind==='fraction-cards')return checkFractionCards(g,raw,item.maxScore);
  if(g.kind==='pairs')return checkPairs(g,raw,item.maxScore);
  if(g.kind==='molecule')return checkMolecule(g,raw,item.maxScore);
  if(g.kind==='tangram')return checkTangram(g,raw,item.maxScore);
  throw new AssessmentError('快照包含不支持的判分类型。','unsupported_definition');
}

/** Pure grading of the persisted issued snapshot. Client totals, booleans,
 * native models and completion fields have no authority. No eval or VM here. */
export function gradeAssessment(definition,responses={}) {
  validateDefinition(definition);
  if(!record(responses)||Object.keys(responses).some(id=>!definition.items.some(item=>item.id===id)))throw new AssessmentError('答案必须按本次发行的题目编号提交。','invalid_responses');
  const items=definition.items.map(item=>{const grade=gradeItem(item,Object.hasOwn(responses,item.id)?responses[item.id]:undefined);return {id:item.id,questionId:item.questionId,version:item.version,questionVersion:item.questionVersion,weight:item.weight,maxScore:item.maxScore,earned:grade.earned,score:grade.earned,correct:grade.correct,valid:grade.valid,feedback:grade.message,solution:clone(item.solution)};});
  return {rawScore:items.reduce((sum,i)=>sum+i.earned,0),maxScore:definition.maxScore,ruleVersion:definition.ruleVersion,assessmentVersion:definition.assessmentVersion,items};
}
