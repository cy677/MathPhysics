import {validateAnswer, exportRecipe, importRecipe} from './engine.mjs';
import {CURRICULUM_VERSION,UNITS,LEVELS} from '../primary-math/curriculum.mjs';
export const STORAGE_KEY='mathphysics.question-bank.v1';
export function emptyAttempt(){return {tries:0,solved:false,firstCorrect:false,hints:0,revealed:false,input:'',message:''};}
export function checkAttempt(q,attempt,input){
  const previous={...emptyAttempt(),...attempt};
  if(previous.solved)return {attempt:previous,result:{correct:true,valid:true,message:'这道题已经答对。'}};
  const result=validateAnswer(q,input);
  if(!result.valid)return {attempt:previous,result};
  return {result,attempt:{...previous,tries:previous.tries+1,input:String(input).slice(0,80),message:result.message,solved:result.correct,firstCorrect:previous.tries===0&&result.correct&&!previous.revealed&&previous.hints===0}};
}
export function stats(sheet,attempts){
  let solved=0,firstCorrect=0,revealed=0;
  for(const q of sheet.questions){const a=attempts[q.id];if(a?.solved)solved++;if(a?.firstCorrect)firstCorrect++;if(a?.revealed)revealed++;}
  return {total:sheet.count,solved,firstCorrect,revealed};
}
export function recordCompletion(sheet,attempts,completedLevels={}){
  if(!sheet.curriculum||!sheet.questions.length||!sheet.questions.every(q=>attempts[q.id]?.solved))return completedLevels;
  const id=sheet.curriculum.unitId,levels=completedLevels[id]||[];
  return levels.includes(sheet.difficulty)?completedLevels:{...completedLevels,[id]:[...levels,sheet.difficulty].sort()};
}
export function sessionSnapshot(sheet,attempts,completedLevels={}){return {recipe:exportRecipe(sheet),attempts,completionVersion:CURRICULUM_VERSION,completedLevels};}
export function saveSession(storage,sheet,attempts,completedLevels={}){try{storage.setItem(STORAGE_KEY,JSON.stringify(sessionSnapshot(sheet,attempts,completedLevels)));return true;}catch{return false;}}
export function loadSession(storage){
  try{
    const raw=storage.getItem(STORAGE_KEY);if(!raw)return {status:'empty'};
    if(raw.length>2000000)throw Error('记录过大');
    const saved=JSON.parse(raw),sheet=importRecipe(JSON.stringify(saved.recipe)),attempts={};
    for(const q of sheet.questions){
      const a=saved.attempts?.[q.id];if(!a||typeof a!=='object')continue;
      const input=typeof a.input==='string'?a.input.slice(0,80):'';
      const solved=a.solved===true&&validateAnswer(q,input).correct;
      const tries=Number.isInteger(a.tries)?Math.min(10000,Math.max(0,a.tries)):0;
      const hints=Number.isInteger(a.hints)?Math.min(q.hints.length,Math.max(0,a.hints)):0;
      const revealed=a.revealed===true;
      attempts[q.id]={tries,solved,hints,revealed,input,firstCorrect:solved&&tries===1&&a.firstCorrect===true,message:typeof a.message==='string'?a.message.slice(0,120):''};
    }
    const completedLevels={};
    if(saved.completionVersion===CURRICULUM_VERSION)for(const u of UNITS){
      const levels=saved.completedLevels?.[u.id];
      if(Array.isArray(levels))completedLevels[u.id]=LEVELS.map(level=>level.id).filter(id=>levels.includes(id));
    }
    return {status:'restored',sheet,attempts,completedLevels:recordCompletion(sheet,attempts,completedLevels)};
  }catch{return {status:'unavailable'};}
}
