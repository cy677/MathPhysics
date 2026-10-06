import {TEMPLATES} from './catalog.mjs';
import {CURRICULUM_TEMPLATES,UNITS} from '../primary-math/curriculum.mjs';
import {QUESTIONS} from '../primary-math/bank.mjs';
// Audited against pinned upstream exercise definitions. Implementations and
// Chinese questions are authored here; duplicate exercise types are reused.
export const SUPPLEMENT_TEMPLATES=Object.freeze([
 {id:'mental.pairs',title:'选数凑整与简算',topic:'arithmetic',reference:'MathsMentales',upstream:'library/N9/9NE2.json',units:['p1-add','p2-add','p3-numbers','p4-whole','p5-whole']},
 {id:'number.last-digit',title:'只求计算结果的个位',topic:'numbers',reference:'MathALÉA',upstream:'src/exercices/c3/c3C12.js',units:['p3-numbers','p4-whole','p5-whole']},
 {id:'decimal.compose',title:'整数与十进分数合成小数',topic:'decimals',reference:'MathALÉA',upstream:'src/exercices/c3/c3N20.js',units:['p4-decimals','p5-decimals','p6-decimals']},
 {id:'number.number-line',title:'读数轴与数的位置',topic:'numbers',reference:'MathALÉA',upstream:'src/exercices/c3/c3N22.js',units:['p1-numbers','p2-numbers','p3-numbers','p4-whole','p5-whole','p4-decimals','p5-decimals'],grades:[1,2,3,4,5,6]},
 {id:'geometry.angle-kind',title:'辨认锐角、直角和钝角',topic:'geometry',reference:'MathsMentales',upstream:'library/N8/8ME1.json',units:['p3-geometry','p4-angles','p5-geometry','p6-geometry']},
 {id:'measure.decimal-duration',title:'小数小时与时分换算',topic:'measurement',reference:'MathsMentales',upstream:'library/N8/8MC1.json',units:['p4-decimals','p5-decimals'],grades:[4,5,6]},
 {id:'number.multiple-path',title:'沿倍数路径找数',topic:'numbers',reference:'MathALÉA',upstream:'src/exercices/c3/c3C10-2.js',units:['p2-tables','p3-numbers','p4-whole','p5-whole']},
 {id:'number.words',title:'中文数词与数字对应',topic:'numbers',reference:'MathALÉA',upstream:'src/exercices/c3/c3N10.js',units:['p1-numbers','p2-numbers','p3-numbers','p4-whole','p5-whole']},
 {id:'logic.route',title:'按指令寻找方格位置',topic:'word',reference:'MathALÉA',upstream:'src/exercices/c3/c3I11.js',units:[],grades:[3,4,5,6]}
].map(t=>Object.freeze({...t,difficulties:[1,2,3]})));
export const FIXED_TEMPLATES=Object.freeze(QUESTIONS.map(q=>Object.freeze({id:'fixed.'+q.id,title:q.title,topic:'word',grade:q.grade,difficulties:[2],fixedId:q.id})));
export const PRACTICE_TEMPLATES=Object.freeze([...TEMPLATES,...CURRICULUM_TEMPLATES,...SUPPLEMENT_TEMPLATES,...FIXED_TEMPLATES]);
const extensionGrades={'number.double':[1,2],'number.half':[1,2],'measure.area':[5,6],'data.range':[4,5,6],'data.probability':[5,6],'word.shopping':[2,3,4,5,6],'word.speed':[5,6]};
export function practiceTemplates({curriculum,grade,difficulty=1,topic}={}){
 const unit=curriculum?UNITS.find(u=>u.id===curriculum.unitId&&u.grade===curriculum.grade):null;
 const actualGrade=unit?.grade||grade;
 return PRACTICE_TEMPLATES.filter(t=>{
  if(!t.difficulties.includes(difficulty)||topic&&topic!=='all'&&t.topic!==topic)return false;
  if(unit){
   if(t.fixedId)return difficulty>1&&unit.questionIds.includes(t.fixedId);
   return unit.templateIds.includes(t.id)||t.units?.includes(unit.id);
  }
  if(!actualGrade)return !t.id.startsWith('sg.')&&(!t.fixedId||difficulty>1);
  if(t.fixedId)return t.grade===actualGrade&&difficulty>1;
  if(t.units)return t.units.some(id=>UNITS.some(u=>u.id===id&&u.grade===actualGrade))||t.grades?.includes(actualGrade);
  return UNITS.some(u=>u.grade===actualGrade&&u.templateIds.includes(t.id))||extensionGrades[t.id]?.includes(actualGrade);
 });
}
export function practiceContextFor(templateId,grade){
 const unit=UNITS.find(u=>u.grade===grade&&u.templateIds.includes(templateId));
 return unit?{grade,unitId:unit.id}:null;
}
