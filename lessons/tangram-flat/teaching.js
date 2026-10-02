// Read-only guidance built from the active target, including swapped congruent pieces.
export const TANGRAM_GUIDES={
 square:{observe:'观察四条直边和四个直角；大三角形占据的区域与小块之间怎样接缝。',actions:['先选一块，用左右转15°按钮调方向，再拖到方形轮廓。','打开“看看每块拼板的位置”比较边；松手吸附后再选下一块，重新开始可恢复散块。'],juniorWhy:'每块只搬动和转动，没有变大或变小。边对边拼好，七块才能铺满同一块方形。',seniorWhy:'平移、旋转是保持距离和面积的刚性变换。总面积相等还不够：必须覆盖目标，内部无重叠、无空隙；同形同大的块可以交换槽位。',life:'铺方形桌垫或拼地板时，材料面积足够还要让接缝和边界对齐。'},
 creative:{observe:'先找轮廓的凸角、凹口和倾斜边；哪些边只能由某种拼块靠近。',actions:['先找轮廓中最明显的尖角，选形状相符的三角块，转动后再拖入。','再沿已放好的边拼相邻块；可打开位置图逐块比较，重置后挑战减少自动求助次数。'],juniorWhy:'同样七块可以换一个队形。先找外边和特殊角，再补里面，像把几张小纸片拼成一张剪影。',seniorWhy:'目标由当前快照的七个刚性变换组成，总面积保持。角度与边长决定局部匹配，非对称的四边形不能仅靠翻转想象替代本页允许的旋转。',life:'做剪纸拼贴时，先用纸片形成外轮廓，再把内部空白填满，图案可以变而纸的总面积不变。'}
};
const round=n=>Number(n.toFixed(3)),norm=r=>((r%360)+360)%360;
function legalRotation(t,slot){
 for(let r=0;r<360;r+=15){const a=r*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const projected=t.corners.map(p=>({x:p.x*c-p.y*s+slot.position.x,y:p.x*s+p.y*c+slot.position.y}));
  if(projected.length===slot.points.length&&Math.max(...projected.map(p=>Math.min(...slot.points.map(q=>Math.hypot(p.x-q.x,p.y-q.y)))))<.006)return r;
 }
 return null;
}
export function tangramQuestion(goal,difficulty,actual,target,slots,usedHelp,selected=0){
 const limit={free:Infinity,two:2,none:0}[difficulty],shape=goal==='square'?'方形':'创意轮廓',placements=[],used=new Set(slots.values());
 for(let i=0;i<actual.tans.length;i++){
  const t=actual.tans[i];if(slots.has(i)){placements.push({piece:i,slot:slots.get(i),placed:true});continue;}
  for(let j=0;j<target.tans.length;j++){if(used.has(j))continue;const r=legalRotation(t,target.tans[j]);if(r===null)continue;
   let turn=norm(r-norm(t.rotation));if(turn>180)turn-=360;placements.push({piece:i,slot:j,placed:false,rotation:r,turn,position:[target.tans[j].position.x,target.tans[j].position.y]});used.add(j);break;
  }
 }
 const next=placements.find(p=>p.piece===selected&&!p.placed)||placements.find(p=>!p.placed),constraint=limit===Infinity?'可按需要使用“帮我放一块”':limit===0?'不用“帮我放一块”':'最多用2次“帮我放一块”';
 const turnText=p=>Math.abs(p.turn)<.01?'当前方向已经合适':`${p.turn>0?'左':'右'}转${Math.abs(p.turn)}°（${Math.abs(p.turn)/15}次15°按钮）`;
 const intent=`用全部七块填满${shape}，不留空隙、不重叠；${constraint}。文字提示不计自动求助次数。`;
 const hints=[goal==='square'?'先看方形的四角，把大块方向调好，让直边贴住外边。':'先找创意轮廓的尖角和凹口，从外边最容易辨认的位置开始。',`当前已放好${slots.size}/7块，自动求助${usedHelp}次。${limit===Infinity?'可以先靠自己试一块。':`本题${constraint}，剩余可自动求助${Math.max(0,limit-usedHelp)}次。`}`,next?`选第${next.piece+1}块，${turnText(next)}；位置图中的${next.slot+1}号槽位能与它匹配，再拖过去并松手。`:'七块均已吸附，检查求助次数后点击“看看拼好了没有”。'];
 const steps=[`确认当前${shape}任务与求助限制：${constraint}；已用${usedHelp}次。`,'打开位置图时，各槽位会显示号码；先旋转，再拖动，靠近且边方向相合后松手吸附。',...placements.map(p=>p.placed?`第${p.piece+1}块已放在${p.slot+1}号槽位，保留它。`:`第${p.piece+1}块：${turnText(p)}，移到${p.slot+1}号槽位；当前中心（${round(actual.tans[p.piece].position.x)}，${round(actual.tans[p.piece].position.y)}）随拖动更新。`),'全部吸附后检查7/7，再核对；若自动求助超出限制，重新开始降低求助次数。'];
 const commonMistakes=[goal==='square'?'只对齐中心，边的方向没有与方形槽位重合。':'把创意轮廓当成方形的摆法，忽略尖角与倾斜边。','认为总面积相同就一定拼满；局部可能仍有空隙或重叠。',limit===Infinity?'一直看位置图，忘记关掉后独立再拼一次。':'自动放块超过挑战限制；读文字提示与自动放块是不同操作。'];
 return {id:goal+'/'+difficulty,intent,hints,steps,commonMistakes,placements};
}
