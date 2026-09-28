// MathPhysics host state only. Upstream scores are deliberately NOT inferred.
export const STORAGE_KEY='mathphysics.state.v1';
export function normalizeState(input, ids, defaults){
  const valid=new Set(ids);
  const value=input && typeof input==='object' && !Array.isArray(input)?input:{};
  const open=Array.isArray(value.openIds)?value.openIds:defaults;
  const openIds=[...new Set(open.filter(id=>typeof id==='string'&&valid.has(id)))];
  const visited={};
  if(value.visited&&typeof value.visited==='object'){
    for(const id of ids){const n=value.visited[id];if(Number.isFinite(n)&&n>0)visited[id]=n;}
  }
  return {schemaVersion:1,openIds,visited,teacherPreview:value.teacherPreview===true};
}
export function loadState(storage,ids,defaults){
  try{const raw=storage.getItem(STORAGE_KEY);return normalizeState(raw?JSON.parse(raw):null,ids,defaults);}
  catch{return normalizeState(null,ids,defaults);}
}
export function saveState(storage,state){
  try{storage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}
}
export function parseSettings(text,ids){
  if(text.length>500000)throw Error('配置文件过大');
  const value=JSON.parse(text);
  if(!value||value.schemaVersion!==1||!Array.isArray(value.openIds))throw Error('配置应包含 schemaVersion: 1 和 openIds 数组');
  if(value.openIds.some(id=>typeof id!=='string'||!ids.includes(id)))throw Error('配置包含当前内容库中不存在的活动');
  return [...new Set(value.openIds)];
}
