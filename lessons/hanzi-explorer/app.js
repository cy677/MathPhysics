import D from './data.js';
const PHOTOS=["assets/textbook-1.jpg", "assets/textbook-2.jpg", "assets/textbook-3.jpg", "assets/textbook-4.jpg", "assets/textbook-5.jpg", "assets/textbook-6.jpg"];
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy=o=>JSON.parse(JSON.stringify(o));
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const pick=a=>a[Math.floor(Math.random()*a.length)];
const ICONS={shuffle:'M3 6h3c5 0 6 12 11 12h4 M17 14l4 4-4 4 M3 18h3c2 0 3-2 4-4 M14 9c1-2 2-3 4-3h3 M17 2l4 4-4 4',book:'M3 4.5c3-1 6-.7 9 1.5 3-2.2 6-2.5 9-1.5v15c-3-1-6-.7-9 1.5-3-2.2-6-2.5-9-1.5z M12 6v15',bookmark:'M6 3h12v18l-6-4-6 4z',sound:'M4 9h4l5-4v14l-5-4H4z M17 8c3 2 3 6 0 8 M19 5c5 4 5 10 0 14',expand:'M9 3H3v6 M15 3h6v6 M3 15v6h6 M21 15v6h-6',arrow:'M5 12h14 M13 6l6 6-6 6',idea:'M8 15c-6-6-1-13 5-12 7 1 7 8 3 12l-1 3H9z M9 21h6',check:'M5 12l4 4L19 6',home:'M3 10l9-7 9 7 M6 9v12h12V9',star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z'};
function icon(name){return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]||ICONS.star}"/></svg>`}
function hydrateIcons(root=document){$$('[data-icon]',root).forEach(e=>e.innerHTML=icon(e.dataset.icon))}
const MODES=[
{id:'stroke',num:'01',title:'笔画小侦探',short:'第几笔',intro:'在心里写一写，找出指定的那一笔。',tag:'写字表与 PDF 字例 · 二选一'},
{id:'radical',num:'02',title:'偏旁分分家',short:'按偏旁分类',intro:'先看偏旁，再给汉字分类；难度可以自由选择。',tag:'5～6 个字 · 2～3 个偏旁 · 4 档难度'},
{id:'rule',num:'03',title:'笔顺有规矩',short:'笔顺写法',intro:'哪一种写法对？想一想先写哪儿、后写哪儿。',tag:'46 道规则与易错写法'},
{id:'meaning',num:'04',title:'图画猜汉字',short:'看图识意',intro:'看看图，听听线索，把汉字认出来。',tag:'50 道图形与含义题'},
{id:'formation',num:'05',title:'造字小工坊',short:'四种造字法',intro:'随机抽取汉字，按象形、形声、会意、指事分类。',tag:'48 个字例随机抽题 · 不固定每类字数'},
{id:'ancient',num:'06',title:'古字时光机',short:'古今字配对',intro:'穿过时间，认一认汉字从前的模样。',tag:'12 幅有出处的甲骨文字形'},
{id:'mixed',num:'✦',title:'综合练习',short:'六类随机练',intro:'六种题型轮流出现，每一次都有新发现。',tag:'随机轮换 · 不设关卡'}];
const STROKES={
'横':'M16 43 L82 40','竖':'M49 14 L48 86','撇':'M73 17 Q61 56 24 83','点':'M37 31 Q54 42 61 59','捺':'M25 17 Q48 64 81 80','提':'M21 70 L76 29','横折':'M21 24 L75 24 L69 81','横撇':'M22 24 L76 24 Q62 60 25 82','横钩':'M18 43 L82 37 L71 51','竖折':'M28 18 L28 77 L79 73','竖弯':'M29 17 L27 60 Q27 77 43 78 L78 78','竖提':'M38 16 L35 82 L76 60','竖钩':'M53 14 L53 76 Q53 85 35 69','撇折':'M60 17 L27 60 L76 48','撇点':'M57 16 L29 57 Q56 61 77 78','弯钩':'M39 17 Q65 47 54 79 Q50 88 34 71','斜钩':'M34 16 Q40 67 76 84 Q86 88 82 65','卧钩':'M21 36 Q31 69 63 75 Q78 79 77 59','横折折':'M22 24 L69 24 L57 48 L81 48','横折弯':'M19 25 L60 25 L57 62 Q59 81 85 79','横折提':'M20 22 L66 22 L64 77 L83 59','横折钩':'M20 24 L77 24 L73 76 Q70 89 54 71','横斜钩':'M15 24 L56 21 Q55 65 80 84 Q87 84 84 65','竖折折':'M26 15 L26 44 L74 44 L62 81','竖折撇':'M31 15 L28 41 L69 38 Q68 66 30 83','竖弯钩':'M30 18 L28 63 Q29 82 60 80 L77 80 L80 61','横折折折':'M15 32 L47 32 L47 55 L76 55 L75 81','横折折撇':'M19 23 L58 23 L43 49 L77 45 Q66 71 31 88','横折弯钩':'M15 35 L57 30 L53 64 Q53 85 74 81 Q83 78 82 61','横撇弯钩':'M18 22 L66 22 L49 46 Q86 64 61 84 L48 70','竖折折钩':'M29 15 L24 46 L78 46 L71 80 Q69 88 54 73','横折折折钩':'M15 25 L49 25 L38 46 L77 46 L68 79 Q64 90 50 73'};
const STROKE_EXAMPLES=['一十','上木','手八','火头','火人','虫我','口五','了水','你','牙山','西四','比长','可小','去云','女妈','手子','我','心','凹','船','话','用刀','风','鼎','专','七儿','凸','及','九几','那','马鸟','奶'];
function strokeSvg(name,cls=''){return `<svg class="stroke-svg ${cls}" viewBox="0 0 100 100" aria-hidden="true"><path d="${STROKES[name]||STROKES['横']}"/></svg>`}
const CONFUSABLE={'横':['提','竖'],'竖':['竖钩','撇'],'撇':['捺','点'],'点':['捺','撇'],'捺':['点','撇'],'提':['横','撇'],'横折':['横折钩','横撇'],'横撇':['横折','横钩'],'横钩':['横折钩','横撇'],'竖折':['竖弯','竖提'],'竖弯':['竖弯钩','竖折'],'竖提':['竖钩','竖弯钩'],'竖钩':['弯钩','竖'],'撇折':['撇点','横撇'],'撇点':['撇折','捺'],'弯钩':['竖钩','卧钩'],'斜钩':['卧钩','竖弯钩'],'卧钩':['斜钩','竖弯钩'],'横折钩':['横折','横折弯钩'],'横斜钩':['横折弯钩','横折钩'],'竖弯钩':['竖弯','卧钩'],'横折弯钩':['横斜钩','横折钩'],'竖折折钩':['横折钩','竖弯钩']};
const FORM_TYPES=['象形','形声','会意','指事'];
const FORM_INTRO={'象形':'画出事物的形状','形声':'一部分表义，一部分提示读音','会意':'把部件的意思合起来','指事':'用符号或标记指出意思'};
// These are four independent difficulty settings, not sequential levels.
const RADICAL_LEVELS = [
 {id:'basic',number:'01',title:'基础分类',short:'每个字都有家',outside:false,empty:false,
  instruction:'每个字都有对应的偏旁，每个偏旁框里都有字。'},
 {id:'extra',number:'02',title:'找多余字',short:'找出不属于的字',outside:true,empty:false,
  instruction:'不属于这些偏旁的字，拖到下方的“不属于这些偏旁”区。'},
 {id:'empty',number:'03',title:'判断空框',short:'有的框可以留空',outside:false,empty:true,
  instruction:'每个字都有对应的偏旁，但有的偏旁框没有字，可以留空。'},
 {id:'challenge',number:'04',title:'综合挑战',short:'多余字 + 空偏旁框',outside:true,empty:true,
  instruction:'有些字不属于这些偏旁，有的偏旁框也没有对应的字。'}
];
const OUTSIDE_ID = 'outside';
// Avoid visually ambiguous combinations, even when the textbook assigns a
// primary component. These guards are exclusions, not additional answers.
const RADICAL_VISUAL_GUARDS = {
 '莲':['辶'], '花':['亻'], '明':['月'], '和':['口'], '积':['口','八'],
 '答':['人','口'], '回':['口'], '问':['口'], '句':['口'], '语':['口'],
 '词':['口'], '做':['口'], '说':['丷','口'], '课':['日','木'],
 '草':['日'], '前':['月'], '空':['宀','八'], '院':['宀'],
 '影':['日','口'], '彩':['木'], '清':['月'], '喝':['日','勹'],
 '晚':['⺈'], '间':['日'], '校':['八'], '棋':['八'],
 '休':['木'], '体':['木'], '合':['口'], '谷':['口'], '认':['人'],
 '识':['口','八'], '圆':['口'], '猪':['日'], '猫':['艹'],
 '河':['口'], '肚':['土'], '阴':['月'], '队':['人'], '热':['扌']
};
const RADICAL_GROUPS = D.radicals.map((r,index)=>({...r,index,
 chars:[...new Set(r.chars)].filter(c=>D.readChars.includes(c))}));
const RADICAL_CHAR_POOL = [...new Set(RADICAL_GROUPS.flatMap(r=>r.chars))];
const radicalPlanCache = new Map();
function radicalMatches(c,groups){
 return groups.filter(r=>r.chars.includes(c)||(RADICAL_VISUAL_GUARDS[c]||[]).includes(r.symbol));
}
function radicalPlans(count,binCount,outsideCount,hasEmpty){
 const key=[count,binCount,outsideCount,hasEmpty].join(':');
 if(radicalPlanCache.has(key))return radicalPlanCache.get(key);
 const results=[],matchedCount=count-outsideCount;
 function visit(start,selected){
  if(selected.length===binCount){
   const usable=selected.map(r=>({...r,chars:r.chars.filter(c=>radicalMatches(c,selected).length===1)}));
   const outsiders=outsideCount?RADICAL_CHAR_POOL.filter(c=>radicalMatches(c,selected).length===0):[];
   if(outsiders.length<outsideCount)return;
   // In the empty-frame settings, exactly one displayed radical has no card.
   const emptyChoices=hasEmpty?selected.map((_,i)=>i):[-1];
   for(const emptyIndex of emptyChoices){
    const active=usable.filter((_,i)=>i!==emptyIndex);
    if(active.some(r=>r.chars.length<1)||active.length>matchedCount)continue;
    if(new Set(active.flatMap(r=>r.chars)).size<matchedCount)continue;
    results.push({groups:selected.slice(),active,outsiders,emptyIndex});
   }
   return;
  }
  for(let i=start;i<=RADICAL_GROUPS.length-(binCount-selected.length);i++){
   visit(i+1,[...selected,RADICAL_GROUPS[i]]);
  }
 }
 visit(0,[]);
 radicalPlanCache.set(key,results);
 return results;
}
function makeRadical(options={}){
 const level=RADICAL_LEVELS.find(l=>l.id===(options.level||state.radicalLevel))||RADICAL_LEVELS[0];
 const count=options.count??pick([5,6]),binCount=options.binCount??pick([2,3]);
 if(![5,6].includes(count)||![2,3].includes(binCount))throw Error('偏旁题必须为5～6字、2～3个偏旁框');
 const outsideCount=level.outside?(options.outsideCount??pick([1,2])):0;
 if(level.outside&&![1,2].includes(outsideCount))throw Error('干扰字数量必须为1或2');
 const plans=radicalPlans(count,binCount,outsideCount,level.empty);
 if(!plans.length)throw Error('当前设置没有符合条件的偏旁题');
 const plan=take(`radical-v4:${level.id}:${count}:${binCount}:${outsideCount}`,plans);
 const targets={},cards=[];
 // At least one card per active radical. Additional cards are sampled, not
 // balanced into a fixed 3+3 pattern, so children cannot infer the answer by size.
 const active=shuffle(plan.active);
 active.forEach(r=>{const c=pick(r.chars);cards.push(c);targets[c]='r'+r.index});
 const remaining=shuffle(active.flatMap(r=>r.chars.filter(c=>!cards.includes(c)).map(c=>({c,id:'r'+r.index}))));
 remaining.slice(0,count-outsideCount-cards.length).forEach(({c,id})=>{cards.push(c);targets[c]=id});
 shuffle(plan.outsiders).slice(0,outsideCount).forEach(c=>{cards.push(c);targets[c]=OUTSIDE_ID});
 const bins=shuffle(plan.groups).map(r=>({id:'r'+r.index,symbol:r.symbol,title:r.name,hint:r.position}));
 const fingerprint=[level.id,bins.map(b=>b.id).sort().join(','),cards.slice().sort().map(c=>c+'='+targets[c]).join(',')].join('|');
 return {type:'radical',version:4,id:'radical-v4:'+fingerprint,cards:shuffle(cards),targets,bins,
  level:level.id,allowOutside:level.outside,
  title:'把汉字分进偏旁框',sub:level.instruction,
  explain:D.componentCaution,scopeUsed:'all'};
}

const STORE_KEY='hanzi-explorer-photos-v1';
function loadStore(){try{const x=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');return {stars:Number.isFinite(x.stars)?Math.max(0,x.stars):0,finished:Number.isFinite(x.finished)?Math.max(0,x.finished):0,first:Number.isFinite(x.first)?Math.max(0,x.first):0,wrong:Array.isArray(x.wrong)?x.wrong.filter(validWrong).slice(0,300):[],settings:x.settings&&typeof x.settings==='object'?x.settings:{}}}catch{return {stars:0,finished:0,first:0,wrong:[],settings:{}}}}
function validWrong(w){
 if(w?.q?.source&&!/^https:\/\//.test(w.q.source))return false;
 if(!w||typeof w.key!=='string'||!w.q||!MODES.some(m=>m.id===w.q.type)||w.q.type==='mixed')return false;
 const q=w.q;
 if(['radical','formation'].includes(q.type)){
  return Array.isArray(q.cards)&&q.cards.length>0&&q.cards.every(c=>D.readChars.includes(c))&&
   new Set(q.cards).size===q.cards.length&&Array.isArray(q.bins)&&q.bins.length>1&&q.bins.length<=4&&
   q.bins.every(b=>b&&typeof b.id==='string')&&q.targets&&
   q.cards.every(c=>q.bins.some(b=>b.id===q.targets[c])||(q.type==='radical'&&q.allowOutside===true&&q.targets[c]===OUTSIDE_ID));
 }
 return D.readChars.includes(q.char)&&Array.isArray(q.options)&&q.options.includes(q.correct);
}
const saved=loadStore();
const state={mode:'radical',q:null,solved:false,failed:false,assisted:false,wrongThis:false,done:0,first:0,assists:0,scope:['all','write'].includes(saved.settings.scope)?saved.settings.scope:'all',batch:[0,10,20,30].includes(saved.settings.batch)?saved.settings.batch:10,choices:[2,3].includes(saved.settings.choices)?saved.settings.choices:3,tiles:[5,6].includes(saved.settings.tiles)?saved.settings.tiles:6,radicalLevel:RADICAL_LEVELS.some(l=>l.id===saved.settings.radicalLevel)?saved.settings.radicalLevel:'basic',sound:false,selected:null,assign:{},rejected:[],badTiles:[],review:null,reviewPos:0,pools:{},mix:[],lastModalFocus:null,stepTimer:null,toastTimer:null};
state.scope='all';
let storageWarned=false;
function saveStore(){saved.settings={scope:state.scope,batch:state.batch,choices:state.choices,tiles:state.tiles,radicalLevel:state.radicalLevel};try{localStorage.setItem(STORE_KEY,JSON.stringify(saved))}catch{if(!storageWarned){toast('浏览器未允许保存记录；本次仍可正常练习。');storageWarned=true}}updateCounters()}
function updateCounters(){$('#totalStars').textContent=saved.stars;$('#wrongCount').textContent=saved.wrong.length}
function allowed(c){return state.scope==='all'||D.writeChars.includes(c)}
function take(key,pool){if(!pool.length)throw Error('题库为空：'+key);const k=key+'-'+state.scope;if(!state.pools[k]||!state.pools[k].length)state.pools[k]=shuffle(pool);return state.pools[k].pop()}
function optionChars(correct,preferred,count=3){const all=state.scope==='write'?D.writeChars:D.readChars;let others=shuffle(preferred.filter(c=>c!==correct&&all.includes(c)));if(others.length<count-1)others=[...others,...shuffle(all.filter(c=>c!==correct&&!others.includes(c)))];return shuffle([correct,...others.slice(0,count-1)])}
function makeQuestion(type){
 if(type==='stroke'){const positions=D.strokeChars.filter(allowed).flatMap(c=>D.strokes[c].map((_,i)=>({c,i})));const {c,i}=take('stroke',positions);const correct=D.strokes[c][i],wrong=pick(CONFUSABLE[correct]||Object.keys(STROKES).filter(n=>n!==correct));return {type,id:`stroke:${c}:${i}`,char:c,index:i,correct,options:shuffle([correct,wrong]),title:`“${c}”的第 ${i+1} 笔是什么？`,sub:'只选一个。转折或带钩的笔画，也可能是一笔写成。',explain:`“${c}”共 ${D.strokes[c].length} 笔，第 ${i+1} 笔是${correct}。`,source:D.strokeSources[c]||D.sources[1].url}}
 if(type==='rule'){const r=take('rule',D.rules.filter(x=>allowed(x.char)));return {type,id:'rule:'+r.char,char:r.char,correct:r.correct,options:shuffle([r.correct,...shuffle(r.wrong).slice(0,state.choices-1)]),title:`“${r.char}”怎样写才正确？`,sub:r.kind+' · 选出正确的描述',explain:r.explain,source:D.sources[1].url}}
 if(type==='meaning'){const m=take('meaning',D.meanings.filter(x=>allowed(x.char)));return {type,id:'meaning:'+m.char,char:m.char,correct:m.char,options:optionChars(m.char,m.options,state.choices),title:'看图和线索，猜一个字',sub:'可以点“读题”，听一听文字线索。',clue:m.clue,art:m.art,explain:m.explain}}
 if(type==='ancient'){const c=take('ancient',Object.keys(D.ancient).filter(allowed)),a=D.ancient[c];const others=Object.keys(D.ancient).filter(x=>x!==c);return {type,id:'ancient:'+c,char:c,correct:c,options:optionChars(c,others,state.choices),title:'它变成了今天的哪个字？',sub:'观察字形轮廓，不用猜它的年代。',explain:a.explain,source:a.source}}
 if(type==='radical')return makeRadical();
 if(type==='formation')return makeFormation();
 throw Error('未知题型');
}

function makeFormation(){
 const pool=D.formations.filter(f=>allowed(f.char)),key='formation-random-v2-'+state.scope;
 const chosen=[];
 // Shuffled bag: vary both characters and category counts; never repeat a card
 // within one question and do not force every category to appear every time.
 while(chosen.length<state.tiles){
  if(!state.pools[key]?.length)state.pools[key]=shuffle(pool.filter(f=>!chosen.some(c=>c.char===f.char)));
  const f=state.pools[key].pop();
  if(f&&!chosen.some(c=>c.char===f.char))chosen.push(f);
 }
 const cards=shuffle(chosen.map(f=>f.char)),targets={};chosen.forEach(f=>targets[f.char]=f.kind);
 return {type:'formation',id:'formation:'+cards.slice().sort().join(''),cards,targets,
  bins:FORM_TYPES.map(t=>({id:t,title:t,hint:FORM_INTRO[t]})),title:'这些字用了什么造字方法？',
  sub:`本题随机抽取 ${cards.length} 个字。按造字方法分类，不用把每个框都填满。`,
  explain:'象形画样子，形声有音义，会意合意思，指事用标记。题目随机抽取，不按固定字组重复出题。'};
}
function normalizeSavedQuestion(q){
 const n=copy(q);
 if(n.type==='formation')n.bins=FORM_TYPES.map(t=>({id:t,title:t,hint:FORM_INTRO[t]}));
 if(n.type==='radical'){
  if(![2,3].includes(n.bins?.length)||![5,6].includes(n.cards?.length)){
   const updated=makeRadical({count:n.cards?.length===5?5:6,level:'basic'});
   return {...updated,id:n.id,legacyAdjusted:true};
  }
  const hasOutside=n.cards.some(c=>n.targets[c]===OUTSIDE_ID);
  const hasEmpty=n.bins.some(b=>!n.cards.some(c=>n.targets[c]===b.id));
  n.allowOutside=hasOutside;
  n.level=hasOutside?(hasEmpty?'challenge':'extra'):(hasEmpty?'empty':'basic');
  n.title='把汉字分进偏旁框';
  n.sub=RADICAL_LEVELS.find(l=>l.id===n.level).instruction;
 }
 return n;
}
function mixedTypes(){return MODES.slice(0,6).map(m=>m.id).filter(id=>state.scope!=='write'||id!=='radical')}
function setMode(id){stopSpeech();stopSteps();const scopeChanged=id==='radical'&&state.scope==='write';if(scopeChanged)state.scope='all';state.mode=id;state.review=null;resetRound();renderNav();updateSettingsUI();updateModeIntro();nextQuestion();saveStore();if(scopeChanged)toast('偏旁分类使用课本与 PDF 补充字库，随机出现5～6个字和2～3个偏旁框。')}
function resetRound(){state.done=0;state.first=0;state.assists=0;state.pools={};state.mix=[];state.reviewPos=0}
function nextQuestion(){stopSpeech();stopSteps();$('#parentBox').open=false;
 if(state.review){if(state.reviewPos>=state.review.length){showSummary();return}state.q=normalizeSavedQuestion(state.review[state.reviewPos++]);if(state.q.options)state.q.options=shuffle(state.q.options);if(state.q.cards)state.q.cards=shuffle(state.q.cards)}
 else{if(state.batch&&state.done>=state.batch){showSummary();return}let t=state.mode;if(t==='mixed'){if(!state.mix.length)state.mix=shuffle(mixedTypes());t=state.mix.pop()}state.q=makeQuestion(t)}
 state.solved=false;state.failed=false;state.assisted=false;state.wrongThis=false;state.rejected=[];state.selected=null;state.assign={};state.badTiles=[];renderQuestion();
}
function renderNav(){$('#nav').innerHTML=MODES.map(m=>`<button class="nav-item ${m.id==='mixed'?'mixed':''} ${state.mode===m.id&&!state.review?'active':''}" type="button" data-mode="${m.id}" ${state.mode===m.id&&!state.review?'aria-current="page"':''}><span class="num">${m.num}</span><span>${m.title}<small>${m.short}</small></span></button>`).join('');$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));requestAnimationFrame(()=>{const n=$('#nav'),a=$('.nav-item.active',n);if(a&&n.scrollWidth>n.clientWidth)n.scrollLeft+=a.getBoundingClientRect().left-n.getBoundingClientRect().left+a.clientWidth/2-n.clientWidth/2})}
function updateModeIntro(){const m=MODES.find(m=>m.id===state.mode);$('#modeTitle').textContent=state.review?'错题再发现':m.title;$('#modeIntro').textContent=state.review?'这是独立的再练习。一次答对后，这道题会从错题本移出。':m.intro;$('#scopeTag').textContent=state.review?'按原题内容复习，不受当前用字范围限制':m.tag;if(!state.review&&state.mode==='mixed'&&state.scope==='write'){$('#modeIntro').textContent='写字表范围内随机练习；偏旁分类需使用课本与 PDF 补充字库。';$('#scopeTag').textContent='5 类随机 · 不补入表外字'}}
function renderDifficulty(){
 const show=state.mode==='radical'||state.mode==='mixed'||state.q?.type==='radical';
 $('#radicalDifficulty').classList.toggle('hidden',!show);
 const active=state.review&&state.q?.type==='radical'?(state.q.level||'basic'):state.radicalLevel;
 $('#levelSwitch').innerHTML=RADICAL_LEVELS.map(l=>`<button type="button" class="level-option ${l.id===active?'active':''}" data-level-select="${l.id}" aria-pressed="${l.id===active}" title="${esc(l.instruction)}" ${state.review?'disabled':''}><span class="level-number">${l.number}</span><span class="level-name">${l.title}<small>${l.short}</small></span></button>`).join('');
 $$('[data-level-select]').forEach(b=>b.addEventListener('click',()=>{if(state.radicalLevel===b.dataset.levelSelect)return;onSetting('radicalLevel',b.dataset.levelSelect)}));
}
function updateSettingsUI(){$('#scopeSelect').value=state.scope;$('#scopeSelect option[value="write"]').disabled=state.mode==='radical';$('#scopeSelect').title=state.mode==='radical'?'偏旁分类使用课本与 PDF 补充字库，以组成每题5～6个字、2～3个分类框。':'';$('#batchSelect').value=state.batch;$('#choiceSelect').value=state.choices;$('#tileSelect').value=state.tiles;$('#choiceConfig').classList.toggle('hidden',['stroke','radical','formation'].includes(state.mode));$('#tileConfig').classList.toggle('hidden',!['formation','mixed'].includes(state.mode));renderDifficulty()}
function renderQuestion(){cancelActiveRadicalDrag?.();const q=state.q;$('#workspace').dataset.kind=q.type;renderDifficulty();const m=MODES.find(x=>x.id===q.type);$('#randomQuestionBtn').classList.toggle('hidden',!isSort(q)||Boolean(state.review));$('#questionType').innerHTML=`<b>${m.num}</b>${esc(m.title)}${state.review?' · 错题重练':''}`;$('#questionTitle').textContent=q.title;$('#questionSub').textContent=q.sub;$('#questionActions').classList.remove('hidden');$('#parentBox').classList.remove('hidden');$('#questionContent').innerHTML='';$('#answerDetails').innerHTML='';$('#answerDetails').className='answer-details';$('#nextBtn').disabled=true;$('#revealBtn').disabled=false;$('#revealBtn').textContent='看答案';
 if(q.type==='stroke'||q.type==='rule')renderWritten(q);
 else if(q.type==='meaning')renderMeaning(q);
 else if(q.type==='ancient')renderAncient(q);
 else renderSort(q);
 setFeedback(q.type==='radical'?'先看清给出的偏旁，再拖动字卡。放好以后，点“检查分类”。':q.type==='formation'?'先选字卡，再点一个家。放好以后点“检查分类”。':'慢慢想，选出一个答案就好。');
 $('#nextBtn').innerHTML=(isSort(q)?'检查分类':'下一题')+' '+icon(isSort(q)?'check':'arrow');if(isSort(q))$('#nextBtn').disabled=false;
 updateParent();updateProgress();hydrateIcons($('#questionActions'));
}
function isSort(q=state.q){return q&&['radical','formation'].includes(q.type)}
function charGrid(c){return `<div class="grid-char"><span class="hanzi">${esc(c)}</span></div>`}
function choiceHTML(q,charChoices=false){return q.options.map((o,i)=>`<button class="choice-btn ${q.type==='stroke'?'stroke-option':''} ${state.solved&&o===q.correct?'correct':''} ${state.rejected.includes(o)?'incorrect':''}" data-choice="${i}" type="button" ${state.solved||state.rejected.includes(o)?'disabled':''}><span class="choice-letter">${state.solved&&o===q.correct?'✓':state.rejected.includes(o)?'×':String.fromCharCode(65+i)}</span>${q.type==='stroke'?strokeSvg(o):''}<span class="${charChoices?'hanzi':'choice-label'}">${esc(o)}</span></button>`).join('')}
function bindChoices(){$$('[data-choice]').forEach(b=>b.addEventListener('click',()=>answerChoice(Number(b.dataset.choice))))}
function renderWritten(q){$('#questionContent').innerHTML=`<div class="split-question"><div class="character-zone ${q.type==='rule'?'rule-hero':''}">${charGrid(q.char)}<span class="char-caption">${D.writeChars.includes(q.char)?'写字表里的字':'PDF 补充字形'} · 共 ${D.strokes[q.char].length} 笔</span></div><div class="choice-list ${q.type==='stroke'?'stroke-options':''}">${choiceHTML(q)}</div></div>`;bindChoices()}
function renderMeaning(q){$('#questionContent').innerHTML=`<div class="picture-zone" aria-label="图画线索">${picture(q.art)}</div><p class="picture-clue">${esc(q.clue)}</p><div class="choice-list char-options">${choiceHTML(q,true)}</div>`;bindChoices()}
function ancientSvg(c,cl=''){const a=D.ancient[c];return `<svg class="ancient-svg ${cl}" viewBox="${a.viewBox}" aria-label="待识别的古文字形" role="img"><g class="ancient-content">${a.body}</g></svg>`}
function fitAncient(root=document){$$('.ancient-svg',root).forEach(s=>{try{const b=s.querySelector('.ancient-content').getBBox();if(b.width>0&&b.height>0){const p=Math.max(b.width,b.height)*.09;s.setAttribute('viewBox',`${b.x-p} ${b.y-p} ${b.width+2*p} ${b.height+2*p}`)}}catch{}})}
function renderAncient(q){$('#questionContent').innerHTML=`<div class="picture-zone ancient-zone">${ancientSvg(q.char)}</div><p class="ancient-mark">甲骨文字形 · 现代矢量摹本</p><div class="choice-list char-options">${choiceHTML(q,true)}</div>`;fitAncient($('#questionContent'));bindChoices()}
function tileHTML(c){
 const q=state.q,isRadical=q?.type==='radical',assigned=state.assign[c];
 const place=assigned===OUTSIDE_ID?'不属于这些偏旁区':q.bins.find(b=>b.id===assigned)?.title;
 const label=isRadical?`${c}，${place?'已放入'+place:'待分类'}，按住拖动；也可点选后点分类框`:`${c}，${assigned?'已分类':'待分类'}，点选后点分类框`;
 return `<button type="button" class="tile hanzi ${state.selected===c?'selected':''} ${state.badTiles.includes(c)?'error':''} ${state.solved?'right':''}" data-tile="${esc(c)}" draggable="${!isRadical&&!state.solved}" aria-label="${esc(label)}" aria-pressed="${state.selected===c}" ${state.solved?'disabled':''}><span class="tile-char">${esc(c)}</span>${isRadical?'<span class="tile-grip" aria-hidden="true">···</span>':''}</button>`;
}
function dragZoneAt(x,y){
 const target=document.elementFromPoint(x,y);
 if(!target)return null;
 return target.closest('[data-bin-area]')||target.closest('#sortTray');
}
// Custom Pointer Events are required: native HTML drag/drop does not reliably work
// with Safari touch input. Mouse, finger and stylus share the same behavior.
let cancelActiveRadicalDrag=null;
function bindRadicalDrag(tile){
 tile.addEventListener('pointerdown',down=>{
  if(state.solved||(down.pointerType==='mouse'&&down.button!==0))return;
  cancelActiveRadicalDrag?.();
  const char=tile.dataset.tile, pointerId=down.pointerId;
  const startX=down.clientX,startY=down.clientY;
  let x=startX,y=startY,ghost=null,zone=null,dragging=false,frame=0,finished=false;
  cancelActiveRadicalDrag=()=>{cleanup();if(dragging&&state.q?.type==='radical')renderSort(state.q)};
  try{tile.setPointerCapture(pointerId)}catch{}
  function highlight(next){
   if(zone===next)return;
   zone?.classList.remove('hover');zone=next;zone?.classList.add('hover');
  }
  function placeGhost(){
   if(!ghost)return;
   ghost.style.transform=`translate3d(${Math.round(x-ghost.offsetWidth/2)}px,${Math.round(y-ghost.offsetHeight/2-14)}px,0)`;
   highlight(dragZoneAt(x,y));
  }
  function scrolling(){
   if(!dragging||finished)return;
   const edge=76;
   let speed=0;
   if(y>innerHeight-edge)speed=Math.min(17,(y-(innerHeight-edge))*.34+2);
   else if(y<edge)speed=-Math.min(17,((edge-y)*.34+2));
   if(speed){window.scrollBy(0,speed);placeGhost()}
   frame=requestAnimationFrame(scrolling);
  }
  function move(e){
   if(e.pointerId!==pointerId||finished)return;
   x=e.clientX;y=e.clientY;
   if(!dragging&&Math.hypot(x-startX,y-startY)>=7){
    dragging=true;
    tile.dataset.suppressClick='1';
    tile.classList.add('is-source-dragging');
    ghost=document.createElement('div');
    ghost.className='tile hanzi drag-ghost';
    ghost.setAttribute('aria-hidden','true');ghost.textContent=char;
    document.body.appendChild(ghost);
    frame=requestAnimationFrame(scrolling);
    $('#sortSelected').textContent=`拖动“${char}”，在目标区域松手；拖回上方可重新分类。`;
   }
   if(dragging){if(e.cancelable)e.preventDefault();placeGhost()}
  }
  function cleanup(){
   if(finished)return;finished=true;cancelActiveRadicalDrag=null;
   cancelAnimationFrame(frame);
   tile.removeEventListener('pointermove',move);
   tile.removeEventListener('pointerup',up);
   tile.removeEventListener('pointercancel',cancel);
   try{if(tile.hasPointerCapture(pointerId))tile.releasePointerCapture(pointerId)}catch{}
   tile.classList.remove('is-source-dragging');ghost?.remove();highlight(null);
  }
  function cancel(e){if(e.pointerId!==pointerId)return;cleanup();if(dragging)renderSort(state.q)}
  function up(e){
   if(e.pointerId!==pointerId||finished)return;
   x=e.clientX;y=e.clientY;
   const ending=dragging?dragZoneAt(x,y):null;
   cleanup();
   if(!dragging)return; // A simple tap retains keyboard/tap accessibility.
   if(ending?.hasAttribute('data-bin-area'))moveTile(char,ending.dataset.binArea);
   else if(ending?.id==='sortTray')moveTile(char,null);
   else{state.selected=null;renderSort(state.q);setFeedback('没有放进区域内。请拖到目标区域再松手，或拖回上方待分类区。','info')}
  }
  tile.addEventListener('pointermove',move);
  tile.addEventListener('pointerup',up);
  tile.addEventListener('pointercancel',cancel);
 });
}
function radicalPlaceholder(solved=false){
 return solved?'<span class="empty-correct"><span aria-hidden="true">✓</span>本题没有对应的字<br><small>留空也是正确答案</small></span>':`<span class="drop-placeholder"><span class="drop-ring" aria-hidden="true">${icon('arrow')}</span>把字拖到这里</span>`;
}
function renderSort(q){
 if(q.type==='formation')q.bins=FORM_TYPES.map(t=>({id:t,title:t,hint:FORM_INTRO[t]}));
 const pending=q.cards.filter(c=>!state.assign[c]),radical=q.type==='radical';
 const totalAssigned=q.cards.length-pending.length;
 const outsideCards=q.cards.filter(c=>state.assign[c]===OUTSIDE_ID);
 const level=RADICAL_LEVELS.find(l=>l.id===q.level)||RADICAL_LEVELS[0];
 let html=`<div class="sort-board ${radical?'radical':'formation'}" data-bin-count="${q.bins.length}" data-level="${radical?level.id:'formation'}">`;
 if(radical)html+=`<div class="stage-heading"><span class="stage-label"><i aria-hidden="true">1</i>待分类汉字 <small>${q.cards.length} 个字</small></span><div class="placement-info"><span class="placement-dots" aria-hidden="true">${q.cards.map((_,i)=>`<i class="${i<totalAssigned?'filled':''}"></i>`).join('')}</span><span>已放置 ${totalAssigned}/${q.cards.length}</span><button class="tray-reset" id="resetTilesBtn" type="button" ${!totalAssigned||state.solved?'disabled':''}>全部拿回</button></div></div>`;
 html+=`<div class="sort-tray" id="sortTray" style="--cards:${q.cards.length}" aria-label="待分类字卡">${pending.length?pending.map(tileHTML).join(''):`<span class="tray-complete">${icon('check')}字卡都放好了，检查一下吧。</span>`}</div>`;
 const selectedText=state.selected?`已选“${esc(state.selected)}”，点击要放入的区域；也可以拖拽。`:radical?'按住字卡拖动 · 放错了可以换框，也能拖回上方':'点字卡 → 点家；已经放好的字也能重新移动。';
 html+=`<div class="sort-selected" id="sortSelected" aria-live="polite">${selectedText}</div>`;
 if(radical)html+=`<div class="stage-heading destinations-heading"><span class="stage-label"><i aria-hidden="true">2</i>按偏旁分类 <small>${q.bins.length} 个偏旁框</small></span><span class="level-chip">${esc(level.title)}</span></div>`;
 html+=`<div class="bins" style="--bins:${q.bins.length}">${q.bins.map(b=>{
  const placed=q.cards.filter(c=>state.assign[c]===b.id);
  const emptyCorrect=radical&&state.solved&&!q.cards.some(c=>q.targets[c]===b.id);
  return `<section class="bin ${emptyCorrect?'bin-empty-correct':''}" data-bin-area="${esc(b.id)}" role="group" aria-label="${esc(b.title)}分类框"><button type="button" class="bin-head" data-bin="${esc(b.id)}" aria-label="放入${esc(b.title)}" ${state.solved?'disabled':''}>${b.symbol?`<span class="symbol hanzi">${esc(b.symbol)}</span>`:''}<span class="bin-title">${esc(b.title)}<small>${esc(b.hint)}</small></span></button><div class="bin-landing" data-bin-landing="${esc(b.id)}">${placed.map(tileHTML).join('')||(radical?radicalPlaceholder(emptyCorrect):'<span class="drop-placeholder">拖到这里</span>')}</div></section>`;
 }).join('')}</div>`;
 if(radical&&q.allowOutside)html+=`<section class="outside-zone" data-bin-area="${OUTSIDE_ID}" role="group" aria-label="不属于这些偏旁"><button type="button" class="outside-head" data-bin="${OUTSIDE_ID}" aria-label="放入不属于这些偏旁区" ${state.solved?'disabled':''}><span class="outside-symbol" aria-hidden="true">≠</span><span><strong>不属于这些偏旁</strong><small>没有对应的框，就放这里</small></span></button><div class="outside-landing" data-bin-landing="${OUTSIDE_ID}">${outsideCards.map(tileHTML).join('')||'<span class="drop-placeholder">把不匹配的字拖到这里</span>'}</div></section>`;
 html+='</div>';
 $('#questionContent').innerHTML=html;
 $$('[data-tile]').forEach(tile=>{
  tile.addEventListener('click',e=>{
   e.stopPropagation();
   if(tile.dataset.suppressClick){delete tile.dataset.suppressClick;return}
   if(state.solved)return;
   state.selected=state.selected===tile.dataset.tile?null:tile.dataset.tile;
   renderSort(q);
   if(e.detail===0){const same=$$('[data-tile]').find(t=>t.dataset.tile===tile.dataset.tile);same?.focus({preventScroll:true})}
  });
  if(radical)bindRadicalDrag(tile);
  else tile.addEventListener('dragstart',e=>{if(state.solved)return;e.dataTransfer.setData('text/plain',tile.dataset.tile);e.dataTransfer.effectAllowed='move';state.selected=tile.dataset.tile});
 });
 $$('[data-bin]').forEach(b=>b.addEventListener('click',()=>moveTile(state.selected,b.dataset.bin)));
 $$('[data-bin-area]').forEach(b=>{
  b.addEventListener('dragover',e=>{if(!state.solved){e.preventDefault();b.classList.add('hover')}});
  b.addEventListener('dragleave',()=>b.classList.remove('hover'));
  b.addEventListener('drop',e=>{e.preventDefault();b.classList.remove('hover');moveTile(e.dataTransfer.getData('text/plain'),b.dataset.binArea)});
 });
 $$('[data-bin-landing]').forEach(b=>b.addEventListener('click',e=>{if(e.target.closest('[data-tile]'))return;moveTile(state.selected,b.dataset.binLanding)}));
 $('#sortTray').addEventListener('dragover',e=>{if(!state.solved)e.preventDefault()});
 $('#sortTray').addEventListener('drop',e=>{e.preventDefault();moveTile(e.dataTransfer.getData('text/plain'),null)});
 $('#sortTray').addEventListener('click',e=>{if(e.target.closest('[data-tile]'))return;if(state.selected)moveTile(state.selected,null)});
 $('#resetTilesBtn')?.addEventListener('click',()=>{if(state.solved)return;state.assign={};state.selected=null;state.badTiles=[];renderSort(q);setFeedback('字卡已全部拿回，可以重新分类。','info')});
}
function moveTile(c,bin){
 if(state.solved)return;
 if(!c){setFeedback(isSort()&&state.q.type==='formation'?'先点选一个汉字，再点对应的分类框。':'先按住汉字拖动；也可以点选一个字，再点目标区域。','info');return}
 const q=state.q;
 const validBin=!bin||q.bins.some(b=>b.id===bin)||(q.type==='radical'&&q.allowOutside&&bin===OUTSIDE_ID);
 if(!q.cards.includes(c)||!validBin)return;
 if(bin)state.assign[c]=bin;else delete state.assign[c];
 state.selected=null;state.badTiles=state.badTiles.filter(x=>x!==c);
 renderSort(q);
 const all=q.cards.every(c=>state.assign[c]);
 setFeedback(all?'都放好了！点“检查分类”看看。':q.type==='radical'&&q.allowOutside?'继续分类。不属于这些偏旁的字，放入下方的独立区域。':'继续把字卡放到合适的分类框，放错了可以再移动。');
}

function answerChoice(i){if(state.solved||!state.q||!state.q.options)return;const q=state.q,o=q.options[i];if(o===undefined||state.rejected.includes(o))return;if(o===q.correct){complete(false);if(q.type==='stroke'||q.type==='rule')renderWritten(q);else if(q.type==='meaning')renderMeaning(q);else renderAncient(q);showExplanation()}else{state.failed=true;state.rejected.push(o);recordWrong(q);beep(false);if(q.type==='stroke'||q.type==='rule')renderWritten(q);else if(q.type==='meaning')renderMeaning(q);else renderAncient(q);setFeedback('这次还不对。没关系，换个想法再看看。','retry');updateParent()}}
function checkSort(){
 if(state.solved||!isSort())return;
 const q=state.q,missing=q.cards.filter(c=>!state.assign[c]);
 if(missing.length){setFeedback(`还有 ${missing.length} 个字没有完成分类。${q.type==='radical'&&q.allowOutside?'不属于这些偏旁的字，也要拖入下方的独立区域。':'先把它们放到对应的分类框。'}`,'info');return}
 const bad=q.cards.filter(c=>state.assign[c]!==q.targets[c]);
 if(!bad.length){complete(false);renderSort(q);showExplanation()}
 else{state.failed=true;state.badTiles=bad;recordWrong(q);beep(false);renderSort(q);setFeedback(`有 ${bad.length} 个字需要再想想，已经用橙色标出来了。移动以后再检查。`,'retry');updateParent()}
}
function complete(assisted){if(state.solved)return;const clean=!state.failed&&!assisted;state.solved=true;state.assisted=assisted;state.done++;saved.finished++;saved.stars++;if(clean){state.first++;saved.first++;if(state.review)saved.wrong=saved.wrong.filter(w=>w.key!==state.q.id)}if(assisted){state.assists++;recordWrong(state.q)}$('#nextBtn').disabled=false;$('#nextBtn').innerHTML=(isLast()?'本组小结':'下一题')+' '+icon('arrow');$('#revealBtn').disabled=true;$('#revealBtn').textContent='已揭晓';saveStore();updateProgress();setFeedback(assisted?'先认识正确答案，再独立练一次。这道题已放进错题本。':clean?'答对了！找到一个汉字的小秘密，收下 1 颗学习星。':'这次改对了！收下 1 颗学习星，稍后可以在错题本再练。',assisted?'info':'success');beep(true);updateParent()}
function isLast(){return state.review?state.reviewPos>=state.review.length:state.batch>0&&state.done>=state.batch}
function recordWrong(q){if(state.wrongThis)return;state.wrongThis=true;const w=saved.wrong.find(w=>w.key===q.id);if(w){w.misses=(Number(w.misses)||0)+1;w.at=Date.now();w.q=copy(q)}else saved.wrong.unshift({key:q.id,q:copy(q),misses:1,at:Date.now()});saved.wrong=saved.wrong.slice(0,300);saveStore()}
function reveal(){if(!state.q||state.solved)return;state.failed=true;if(isSort())state.assign={...state.q.targets};complete(true);if(isSort())renderSort(state.q);else if(['stroke','rule'].includes(state.q.type))renderWritten(state.q);else if(state.q.type==='meaning')renderMeaning(state.q);else renderAncient(state.q);showExplanation()}
function updateProgress(){const total=state.review?state.review.length:state.batch;const display=state.solved?state.done:state.done+1;$('#roundLabel').textContent=total?`第 ${Math.min(display,total)} 题 / ${total}`:`已完成 ${state.done} 题`;const p=total?Math.min(100,state.done/total*100):state.done%10*10;$('#progressFill').style.width=p+'%';$('.progress-track').setAttribute('aria-valuenow',Math.round(p))}
function setFeedback(text,kind=''){const el=$('#feedback');el.className='feedback'+(kind?' '+kind:'');el.innerHTML=`<span class="feedback-icon">${kind==='success'?'✓':kind==='retry'?'↻':kind==='info'?'i':'?'}</span><span>${esc(text)}</span>`}
function strokeStrip(c,target=-1){return `<div class="stroke-strip" data-strip="${esc(c)}">${D.strokes[c].map((s,i)=>`<div class="stroke-step ${i===target?'target':''}" data-step="${i}"><small>第 ${i+1} 笔</small>${strokeSvg(s)}<span>${esc(s)}</span></div>`).join('')}</div>`}
function showExplanation(){const q=state.q;let body=`<h4>一起看看为什么</h4>`;
 if(q.type==='stroke'||q.type==='rule'){body+=`<p>${esc(q.explain)}</p>${strokeStrip(q.char,q.index??-1)}<button class="btn small" id="playSteps" type="button">按顺序看笔画</button> <span style="font-size:10px;color:#8b987c">单笔形状示意，不是整字书写动画</span><p style="margin-top:8px"><a href="${esc(q.source)}" target="_blank" rel="noopener noreferrer">笔顺规范参考 ↗</a></p>`}
 else if(q.type==='radical'){
  body+=q.bins.map(b=>{const cs=q.cards.filter(c=>q.targets[c]===b.id);return `<div class="explain-line"><span class="hanzi">${esc(b.symbol)}</span><span><strong>${esc(b.title)}</strong>：${cs.length?`<span class="hanzi" style="font-size:23px;letter-spacing:5px">${cs.map(esc).join('')}</span>`:'<span class="explain-empty">本题没有对应的字，留空正确。</span>'}</span></div>`}).join('');
  const outside=q.cards.filter(c=>q.targets[c]===OUTSIDE_ID);
  if(outside.length)body+=`<div class="outside-explain"><strong>不属于本题给出的偏旁：</strong><span class="hanzi">${outside.map(esc).join('')}</span>${outside.map(c=>{const r=RADICAL_GROUPS.find(r=>r.chars.includes(c));return `<p>“${esc(c)}”在本字库中按${esc(r?.name||'其他偏旁')}分类，本题没有给出这个偏旁框。</p>`}).join('')}<p>它们不是“没有偏旁”，只是与本题给出的偏旁不匹配。</p></div>`;
  body+=`<p style="font-size:11px;margin-top:10px;color:#859374">${esc(q.explain)}</p>`;
 }
 else if(q.type==='formation'){body+=FORM_TYPES.flatMap(t=>q.cards.filter(c=>q.targets[c]===t)).map(c=>{const f=D.formations.find(f=>f.char===c);return `<div class="explain-line"><span class="hanzi">${esc(c)}</span><div><span class="tag">${esc(f.kind)}</span>${esc(f.explain)} <a href="${esc(f.source)}" target="_blank" rel="noopener noreferrer">字源 ↗</a></div></div>`}).join('');body+='<p style="font-size:11px;margin-top:10px;color:#879476">声旁是读音线索，不保证今天完全同音；造字法不是只看现代字形拆字。</p>'}
 else{body+=`<p><span class="hanzi" style="font-size:28px;margin-right:8px">${esc(q.char)}</span>${esc(q.explain)}</p>`;if(q.type==='ancient')body+=`<p style="font-size:11px;margin-top:9px;color:#8d937b">这里是甲骨文字形的现代矢量摹本，不是拓片照片。同一个古字还可能有别的写法。</p><a href="${esc(q.source)}" target="_blank" rel="noopener noreferrer">原始素材说明 ↗</a> · <a href="https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=${encodeURIComponent(q.char)}" target="_blank" rel="noopener noreferrer">字源说明 ↗</a>`}
 $('#answerDetails').innerHTML=body;$('#answerDetails').classList.add('open');const b=$('#playSteps');if(b)b.addEventListener('click',()=>playSteps(q.char));updateParent();
}
function stopSteps(){if(state.stepTimer){clearInterval(state.stepTimer);state.stepTimer=null}$$('.stroke-step.current').forEach(e=>e.classList.remove('current'));const b=$('#playSteps');if(b)b.textContent='按顺序看笔画'}
function playSteps(c){if(state.stepTimer){stopSteps();return}let i=0,steps=$$('.stroke-step',$('#answerDetails'));const b=$('#playSteps');if(!steps.length)return;b.textContent='停止演示';steps[0].classList.add('current');state.stepTimer=setInterval(()=>{steps.forEach(x=>x.classList.remove('current'));i++;if(i>=steps.length){stopSteps();return}steps[i].classList.add('current')},850)}
function updateParent(){const q=state.q;if(!q)return;let text='';if(q.type==='stroke'){text=`请孩子先把“${q.char}”完整地在空中写一遍，再慢慢数到第 ${q.index+1} 笔。提醒她：<strong>从落笔到提笔才算一笔</strong>，带转折不一定要分开。先让她说说两个选项的形状哪里不同。`;if(state.solved)text+=`<br>本题答案是“${esc(q.correct)}”。可以让她按下方笔画序列再数一次，不需要反复抄写整页。`}
 else if(q.type==='radical'){
  const hasEmpty=q.bins.some(b=>!q.cards.some(c=>q.targets[c]===b.id));
  text=`本题给出<strong>${q.bins.length}个偏旁框</strong>和<strong>${q.cards.length}个汉字</strong>。先和孩子一起读出偏旁名称，再观察每个字的对应偏旁及其位置，让孩子说说为什么这样分类。`;
  if(q.allowOutside)text+='<br><strong>遇到不属于这些偏旁的字</strong>，请孩子明确放进下方的独立区域，而不是留在上方没做完。提醒：“不属于本题的偏旁”不等于“这个字没有偏旁”。';
  if(hasEmpty)text+='<br><strong>允许偏旁框没有字</strong>。问孩子：“这些字里，真的有这一家的吗？”不要为了把框填满而随便放一个字，也不要暗示哪一个框应该空着。';
  if(!q.allowOutside&&!hasEmpty)text+='<br>基础题中，每个字都与给出的某一个偏旁对应，每个偏旁框至少有一个字；但每个框里的字数不一定相同。';
  if(state.solved)text+='<br>核对时先讲孩子的判断依据，再看每个字的归属。偏旁可以提供线索，不表示带同一偏旁的字意思都一样。';
 }
 else if(q.type==='rule'){text=`先读两个或三个选项，不急着作答。让孩子用手指写“${q.char}”，边写边说先后顺序，再对照哪个描述一致。<strong>笔顺口诀有适用条件</strong>，不能把一条口诀套到所有汉字。`;if(state.solved)text+='<br>'+esc(q.explain)}
 else if(q.type==='meaning'){text='先让孩子说“图里画了什么”或“它在什么位置”，再读文字线索，最后比较选项。<strong>根据这一题的意思选字</strong>，不是看到一个相似形状就选。';if(state.solved)text+=`<br>本题的字是“${q.char}”。${esc(q.explain)}`}
 else if(q.type==='formation'){text='按这四类来讲：<strong>象形——画样子；形声——一部分表义，一部分提示读音；会意——把意思合起来；指事——用符号或标记指出意思</strong>。本题的字是随机抽取的，不一定四类都有；不要因为某个框是空的就硬放一个字。先请孩子解释为什么想放在某一类，再检查。这个活动适合亲子讨论，不必要求一年级孩子独立背完全部分类。';if(state.solved)text+='<br>按本题逐字讲解来核对。不要把好记的拆字故事当成真实字源，也不要认为声旁今天一定和整字同音。'}
 else{text='先问：“你看到了什么线条？哪些部分像某个东西？”先观察整体，再比较选项，不用先告诉现代字。<strong>古字不是每一笔都与今天相同</strong>，同一个字也会有不同古代写法。';if(state.solved)text+=`<br>本题是“${q.char}”。${esc(q.explain)}`}
 $('#parentBody').innerHTML=text;
}
function showSummary(){stopSpeech();stopSteps();$('#randomQuestionBtn').classList.add('hidden');$('#questionContent').innerHTML=`<div class="summary-view"><div class="summary-medal">✦</div><h3>这一组，认真完成啦</h3><p>不用比速度。多看懂一个字，就是一次发现。</p><div class="summary-stats"><div><strong>${state.done}</strong><span>完成题目</span></div><div><strong>${state.first}</strong><span>一次答对</span></div><div><strong>${state.done}</strong><span>收集学习星</span></div></div><div class="summary-actions"><button class="btn primary" id="againBtn" type="button">再来一组</button><button class="btn" id="summaryWrong" type="button">看看错题本</button></div></div>`;$('#questionTitle').textContent='本组小结';$('#questionSub').textContent=state.assists?`其中 ${state.assists} 题看过答案，可以之后独立再练。`:'继续保持自己的节奏。';$('#questionActions').classList.add('hidden');$('#answerDetails').className='answer-details';$('#answerDetails').innerHTML='';$('#parentBox').classList.add('hidden');setFeedback('学习星记录完成次数；“一次答对”才表示没有试错或看答案。','info');$('#againBtn').addEventListener('click',()=>setMode(state.review?'mixed':state.mode));$('#summaryWrong').addEventListener('click',openWrong);state.q=null}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000)}
let audio=null;
function beep(good){if(!state.sound)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume();const t=audio.currentTime;[0,.12].forEach((dt,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=good?[660,880][i]:[390,330][i];g.gain.setValueAtTime(0,t+dt);g.gain.linearRampToValueAtTime(.035,t+dt+.015);g.gain.exponentialRampToValueAtTime(.001,t+dt+.16);o.connect(g);g.connect(audio.destination);o.start(t+dt);o.stop(t+dt+.17)})}catch{toast('当前浏览器暂时不能播放音效。')}}
function stopSpeech(){if('speechSynthesis' in window)window.speechSynthesis.cancel()}
function speakQuestion(){if(!state.q)return;if(!('speechSynthesis' in window)){toast('当前浏览器没有朗读功能，请由家长读题。');return}const q=state.q;let s=q.title;if(q.type==='meaning')s+='。'+q.clue;else if(isSort(q))s+='。'+q.bins.map(b=>b.title).join('，')+(q.type==='radical'?'。'+q.sub+'请拖动汉字完成分类。':'。请先点字，再点相应的家。');else if(q.options&&q.type!=='ancient')s+='。'+q.options.map((o,i)=>`选项${['一','二','三'][i]}，${o}`).join('。');stopSpeech();const u=new SpeechSynthesisUtterance(s);u.lang='zh-CN';u.rate=.84;const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/zh[-_]CN/i.test(v.lang))||voices.find(v=>/^zh/i.test(v.lang))||null;u.onerror=e=>{if(e.error!=='interrupted'&&e.error!=='canceled')toast('朗读未成功，请检查设备中文语音或由家长读题。')};speechSynthesis.speak(u)}
function picture(key){
 const EM={mouth:'👄',eye:'👁️',ear:'👂',hand:'✋',foot:'🦶',fish:'🐟',bird:'🐦',cow:'🐄',sheep:'🐑',horse:'🐎',dog:'🐕',rabbit:'🐇',flower:'🌸',leaf:'🍃',fruit:'🍎',knife:'🔪',book:'📖',car:'🚗'};
 if(EM[key])return `<span class="emoji" aria-hidden="true">${EM[key]}</span>`;
 const red='#bf6553',green='#789879',ink='#738269',sand='#d8c393';
 const circle=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
 const line=(x1,y1,x2,y2,stroke=ink,w=5)=>`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
 const tree=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 10v74m0-29-22 20M0 55l22 20" stroke="#9c8461" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M-35 37Q-47 15-21 9Q-14-14 8 0Q36-8 37 17Q58 37 29 47Q10 62-8 48Q-30 56-35 37" fill="${green}"/></g>`;
 const person=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${circle(0,0,12,green)}<path d="M0 18v38m0-29-20 15M0 27l20 15M0 54l-16 28M0 54l16 28" stroke="${green}" stroke-width="8" stroke-linecap="round" fill="none"/></g>`;
 let b='';
 switch(key){
 case 'sun':b=circle(120,82,35,'#dfb556')+Array.from({length:12},(_,i)=>{const t=i*Math.PI/6;return line(120+Math.cos(t)*48,82+Math.sin(t)*48,120+Math.cos(t)*63,82+Math.sin(t)*63,'#ddbb6b',4)}).join('');break;
 case 'moon':b='<path d="M144 28A58 58 0 1 0 171 133A60 60 0 0 1 144 28" fill="#d8b768"/>'+circle(176,44,3,'#ddd0a0')+circle(72,30,2,'#ddd0a0')+circle(192,84,3,'#ddd0a0');break;
 case 'mountain':b='<path d="M22 140L82 37L138 140Z" fill="#a8b99d"/><path d="M77 140L149 24L222 140Z" fill="#709576"/><path d="M133 51L149 24L166 53L152 48L145 57Z" fill="#f9faf3"/>';break;
 case 'water':b='<path d="M120 20Q88 62 84 91a36 36 0 0 0 72 0Q152 65 120 20Z" fill="#8ab7bc"/><path d="M102 90q-4 16 11 23" fill="none" stroke="#e8f5f2" stroke-width="6" stroke-linecap="round"/>'+line(54,141,188,141,'#cadbd7',3);break;
 case 'fire':b='<path d="M114 20Q142 42 136 67Q157 62 165 47Q201 103 165 136Q117 166 79 134Q46 103 82 67Q78 99 102 80Q125 59 114 20Z" fill="#ca8260"/><path d="M117 75Q115 109 139 102Q161 139 121 144Q89 140 101 118Z" fill="#e6b465"/>';break;
 case 'tree':b=tree(120,32,1.12);break;
 case 'grain':b='<path d="M117 139V59Q109 28 139 24" fill="none" stroke="#96a271" stroke-width="5" stroke-linecap="round"/><path d="M115 112Q80 120 79 83Q99 83 115 103M120 94Q149 95 154 66Q133 66 120 88" fill="#a9b47d"/>'+Array.from({length:7},(_,i)=>`<ellipse cx="${142+i*2}" cy="${32+i*10}" rx="7" ry="10" transform="rotate(22 ${142+i*2} ${32+i*10})" fill="#c7a85e"/>`).join('');break;
 case 'field':b='<rect x="43" y="30" width="154" height="111" rx="7" fill="#bec799" stroke="#7d9367" stroke-width="6"/>'+line(120,33,120,139,'#f5eed8',7)+line(46,86,194,86,'#f5eed8',7)+[65,92,144,171].map(x=>line(x,43,x,73,'#a2b07d',2)+line(x,99,x,127,'#a2b07d',2)).join('');break;
 case 'rain':case 'cloud':b='<path d="M65 98C24 92 47 46 79 54C77 11 143 8 151 45C199 23 225 87 189 96Z" fill="#bdcdd0"/>';if(key==='rain')b+=[73,112,151,183].map((x,i)=>line(x,112+(i%2)*7,x-8,133+(i%2)*7,'#8eb0b8',5)).join('');break;
 case 'snow':b=Array.from({length:6},(_,i)=>`<g transform="rotate(${i*60} 120 82)">${line(120,82,120,26,'#95b5bf',5)}${line(120,48,103,37,'#95b5bf',4)}${line(120,48,137,37,'#95b5bf',4)}</g>`).join('');break;
 case 'wind':b='<g fill="none" stroke="#a2b7b0" stroke-width="6" stroke-linecap="round"><path d="M44 68H159Q186 68 186 47Q186 25 163 31"/><path d="M23 94H183Q216 94 204 120Q198 133 179 121"/><path d="M64 119H130"/></g>';break;
 case 'door':case 'closed':case 'open':b='<rect x="67" y="18" width="106" height="137" rx="5" fill="#d4b98e" stroke="#a18b6c" stroke-width="5"/>';b+=key==='open'?'<path d="M69 19L139 40V145L69 153Z" fill="#b39b73" stroke="#937b5b" stroke-width="4"/><path d="M143 40L169 22V152L143 145Z" fill="#405b51"/>'+circle(127,96,4,'#f3dfb3'):'<rect x="81" y="33" width="78" height="48" rx="3" fill="#dfccab"/>'+circle(151,98,4,'#886f4c');break;
 case 'above':case 'below':b=line(39,88,199,88,'#9dad99',5)+circle(120,key==='above'?47:124,14,red);break;
 case 'middle':b=[55,120,185].map(x=>circle(x,83,19,x===120?red:'#cbd5bf')).join('')+line(34,127,209,127,'#d6ddca',3);break;
 case 'big':case 'small':b=circle(75,87,22,key==='small'?red:'#aebf9e')+circle(161,87,43,key==='big'?red:'#aebf9e');break;
 case 'many':case 'few':b=`<rect x="16" y="28" width="93" height="111" rx="11" fill="none" stroke="${key==='many'?red:'#cad3bd'}" stroke-width="4"/><rect x="131" y="28" width="93" height="111" rx="11" fill="none" stroke="${key==='few'?red:'#cad3bd'}" stroke-width="4"/>`+[0,1,2,3,4,5].map(i=>circle(40+(i%2)*42,52+Math.floor(i/2)*31,9,green)).join('')+circle(162,82,11,green)+circle(197,82,11,green);break;
 case 'long':case 'short':b=line(30,58,213,58,key==='long'?red:'#acbda0',12)+line(67,115,175,115,key==='short'?red:'#acbda0',12);break;
 case 'person':b=person(120,34,1.1);break;
 case 'follow':b=person(76,36,.9)+person(166,36,.9)+line(105,93,131,93,'#c3b489',3)+'<path d="m124 86 8 7-8 7" fill="none" stroke="#c3b489" stroke-width="3"/>';break;
 case 'woods':b=tree(74,34,.92)+tree(166,34,.92);break;
 case 'forest':b=tree(121,18,.83)+tree(65,59,.78)+tree(176,59,.78);break;
 case 'root':b=tree(120,24,.95)+'<path d="M100 128L119 108L140 128M119 108v32" fill="none" stroke="#a08763" stroke-width="5" stroke-linecap="round"/>'+line(83,129,151,129,red,4)+line(186,114,157,127,red,3)+'<path d="m164 119-9 9 13 2" fill="none" stroke="'+red+'" stroke-width="3"/>';break;
 case 'white':case 'red':case 'black':{const color={white:'#fff',red:'#bf5f50',black:'#303b36'}[key];b=`<rect x="64" y="28" width="112" height="113" rx="9" fill="${color}" stroke="#b5bdab" stroke-width="3"/>`;if(key==='white')b+=line(208,90,160,90,red,4)+'<path d="m173 79-14 11 14 11" fill="none" stroke="'+red+'" stroke-width="4"/>';break}
 default:b=circle(120,83,45,green);
 }
 return `<svg viewBox="0 0 240 170" aria-hidden="true">${b}</svg>`;
}
function openModal(title,tabs=''){state.lastModalFocus=document.activeElement;stopSpeech();$('#modalTitle').textContent=title;$('#modalTabs').innerHTML=tabs;$('#modalBackdrop').classList.add('open');document.body.style.overflow='hidden';$('#closeModal').focus()}
function closeModal(){$('#modalBackdrop').classList.remove('open');document.body.style.overflow='';state.lastModalFocus?.focus?.()}
const TABS=[['words','练习用字'],['pdf','PDF 补充字形'],['strokes','笔画与偏旁'],['formation','造字法入门'],['ancient','古字图谱'],['sources','资料依据'],['photos','课本原图']];
function openSources(tab='words'){openModal('字表与资料',TABS.map(([id,name])=>`<button type="button" data-tab="${id}" class="${id===tab?'active':''}">${name}</button>`).join(''));$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>renderSourceTab(b.dataset.tab)));renderSourceTab(tab)}
function renderSourceTab(tab){$$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));const body=$('#modalBody');let h='';
 if(tab==='words'){
  const coverage=[[`${D.strokeChars.length} 字 / ${D.strokeChars.reduce((n,c)=>n+D.strokes[c].length,0)} 笔位`,'笔画小侦探'],[`${D.radicals.length} 类 / ${RADICAL_CHAR_POOL.length} 字`,'偏旁分分家'],[`${D.rules.length} 题`,'笔顺有规矩'],[`${D.meanings.length} 题`,'图画猜汉字'],[`${D.formations.length} 字`,'造字小工坊'],[`${Object.keys(D.ancient).length} 幅`,'古字时光机']];
  h=`<p class="ref-intro">原识字表 ${D.textbookReadChars.length} 字，PDF 补充 ${D.pdf.addedReadChars} 个字，合并后共 ${D.readChars.length} 个不重复汉字。六类练习按各自内容选用适合的字例。</p><div class="coverage-grid">`+coverage.map(([a,b])=>`<div class="coverage-card"><strong>${a}</strong><span>${b}</span></div>`).join('')+'</div><h4>写字表 · 100 字</h4><p class="ref-intro">点一个字，查看笔画顺序。</p><div class="chip-line">'+D.writeChars.map(c=>`<button class="word-chip hanzi" data-inspect="${c}" type="button">${c}</button>`).join('')+'</div><h4>PDF 笔画补充 · 9 字</h4><div class="chip-line">'+D.strokeChars.filter(c=>!D.writeChars.includes(c)).map(c=>`<button class="word-chip hanzi" data-inspect="${c}" type="button">${c}</button>`).join('')+'</div><div id="inspectArea"></div><h4>识字表与补充字形</h4>'+D.readGroups.map(([g,cs])=>`<div class="group-row"><small>${esc(g)}</small><div class="hanzi">${esc(cs)}</div></div>`).join('');
 }
 else if(tab==='pdf'){
  h=`<p class="ref-intro">《${esc(D.pdf.title)}》</p><p class="ref-intro">四、课内重点字词归纳（第2—4页）；八、偏旁部首及代表字（第6—7页）。提取字词中的汉字，按字形去重；偏旁字例与原课本合并。</p><div class="coverage-grid"><div class="coverage-card"><strong>${D.pdf.addedReadChars} 字</strong><span>新补充字形</span></div><div class="coverage-card"><strong>${D.readChars.length} 字</strong><span>合并后用字</span></div><div class="coverage-card"><strong>${RADICAL_CHAR_POOL.length} 字</strong><span>偏旁分类代表字</span></div></div><h4>新增字形</h4><div class="pdf-char-grid">${D.pdf.addedChars.map(c=>`<span class="hanzi">${esc(c)}</span>`).join('')}</div>`;
 }
 else if(tab==='strokes'){
  h='<div class="notice">名称沿用照片。下列线条为笔形示意，不是字帖里的精确笔锋。偏旁分类根据课本称呼和在字中的位置进行；不把“偏旁”“部件”和字典检字部首混成同一回事。</div><h4>32 种笔画</h4><div class="ref-grid">'+Object.keys(STROKES).map((s,i)=>`<div class="ref-item">${strokeSvg(s)}<div><strong>${s}</strong><small class="hanzi">${STROKE_EXAMPLES[i]}</small></div></div>`).join('')+'</div><h4>29 种常用偏旁</h4><div class="ref-grid">'+D.radicals.map(r=>`<div class="ref-item"><span class="hanzi symbol">${r.symbol}</span><div><strong>${r.name}</strong><small class="hanzi">${r.chars.join(' ')}</small></div></div>`).join('')+'</div><p class="notice" style="margin-top:18px">偏旁分类先随机给出2或3个偏旁，再按所选难度生成5或6个不同汉字。基础分类保证每字有归属、每框有对应字；另有找多余字、判断空框、综合挑战三档。多余字必须放进独立的“不属于这些偏旁”区；该区域不计入2～3个偏旁框。所有汉字仍取自课本与 PDF 补充字库。只用写字表100字时，同旁字例不足，不通过增加分类框凑字数；写字表范围的综合练习不含本题型。</p>';
 }
 else if(tab==='formation'){
  h='<div class="notice">本练习按<strong>象形、形声、会意、指事</strong>四类归类，用于观察汉字怎么构成，不要求把字库里的每个字都硬分成四类。这里按所选字的形义来源作入门归类；没有把现代简化字的形状随意解释成字源。古文字学也有兼类和不同解释，本练习不把争议例字设成唯一判断题。</div>';
  for(const t of FORM_TYPES){h+=`<h4>${t} · ${FORM_INTRO[t]}</h4>`+D.formations.filter(f=>f.kind===t).map(f=>`<div class="explain-line"><span class="hanzi">${f.char}</span><div>${esc(f.explain)} <a href="${esc(f.source)}" target="_blank" rel="noopener noreferrer">字源 ↗</a></div></div>`).join('')}
  h+='<p class="notice" style="margin-top:16px">形声字的声旁只提供读音线索，经过语音变化，今天不一定和整字同音。亲子练习先用“日、妈、林、本”等容易理解的例子，不必要求孩子一次记住整张分类表。</p>';
 }
 else if(tab==='ancient'){
  h='<div class="notice">这些是有来源的甲骨文字形“现代矢量摹本”，不是出土原件、拓片照片，也不是给现代汉字换一种字体。页面完整内嵌字形，因此离线也能显示。每个字仅取一种字形，不表示它在古代只有这一种写法。</div><div class="ancient-gallery">'+Object.entries(D.ancient).map(([c,a])=>`<div class="ancient-card">${ancientSvg(c)}<span class="hanzi">${c}</span><small>甲骨文字形</small><p>${esc(a.explain)}</p><a href="${esc(a.source)}" target="_blank" rel="noopener noreferrer">素材说明 ↗</a> · <a href="${esc(a.mirror)}" target="_blank" rel="noopener noreferrer">SVG来源 ↗</a></div>`).join('')+'</div>';
 }
 else if(tab==='sources'){
  h='<div class="notice">练习本身不访问网络。这里的资料链接只在手动点击时访问原网站；设备朗读是否可用取决于浏览器和中文语音。题库整理日期：2026年10月16日。</div>'+D.sources.map(s=>`<section class="sources-item"><h4>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`:esc(s.title)}</h4><p>${esc(s.detail)}</p></section>`).join('')+'<h4>学习记录</h4><p class="notice">只有完成次数、一次答对次数、错题和练习设置保存在当前浏览器，不会上传。无痕模式、清理浏览器数据或换设备可能丢失记录。可在“错题本”导出记录备份；这不会导出任何系统字体。</p><h4>题目设计</h4><p class="notice">选择题与分类组合为围绕课本字表原创编排，并非复制某套试卷。图画线索与含义线索结合，干扰项限定在相应字表；全部选择题都有一个预设正确选项。笔画序列为写字表100字人工整理，规则题46道。资料链接作为核查入口，不表示本页替代正式教材或国家规范。</p>';
 }
 else if(tab==='photos')h='<div class="notice">以下是你提供的六张原图的压缩内嵌副本，供核对字表范围、笔画名称与偏旁名称。</div><div class="photos-nav">'+['识字表一','识字表二','识字表三','写字表','笔画名称','偏旁名称'].map((t,i)=>`<button type="button" data-photo="${i}" class="${i===0?'active':''}">${t}</button>`).join('')+'</div><img id="originalPhoto" class="original-photo" src="'+PHOTOS[0]+'" alt="识字表第一页原图">';
 body.innerHTML=h;body.scrollTop=0;
 if(tab==='ancient')fitAncient(body);
 if(tab==='photos')$$('[data-photo]').forEach(b=>b.addEventListener('click',()=>{$$('[data-photo]').forEach(x=>x.classList.toggle('active',x===b));$('#originalPhoto').src=PHOTOS[Number(b.dataset.photo)];$('#originalPhoto').alt=b.textContent+'原图'}));
 if(tab==='words')$$('[data-inspect]').forEach(b=>b.addEventListener('click',()=>{$('#inspectArea').innerHTML=`<div class="char-inspect"><h4>“${b.dataset.inspect}” · 共 ${D.strokes[b.dataset.inspect].length} 笔</h4>${strokeStrip(b.dataset.inspect)}</div>`;$('#inspectArea').scrollIntoView({block:'nearest',behavior:'smooth'})}));
}
function openWrong(){openModal('错题本');renderWrong()}
function labelQuestion(q){if(isSort(q))return (q.type==='radical'?'偏旁分类：':'造字分类：')+q.cards.join('、');return q.title+(q.type==='ancient'?`（${q.char}）`:q.type==='meaning'?`（${q.char}）`:'')}
function renderWrong(){const list=saved.wrong;$('#modalBody').innerHTML='<div class="notice">答错或查看答案会记入错题。答错后的当场改正不自动移出；在这里独立重练、一次答对后才移出。分类题按整组保留。本版错题保留原偏旁、字卡和难度，包括多余字与空框。更早版本的错题若不符合5～6字、2～3框的格式，会重建为基础分类题；造字法仍按象形、形声、会意、指事四类复习。</div><div class="wrong-controls"><button class="btn primary" type="button" id="reviewAll" '+(!list.length?'disabled':'')+'>全部重练（'+list.length+' 题）</button><button class="btn" type="button" id="exportStats">导出学习记录</button><button class="btn" type="button" id="importStats">导入记录</button><input id="recordFile" class="hidden" type="file" accept="application/json,.json"><button class="btn danger small" type="button" id="clearWrong">清空错题</button></div>'+(list.length?list.map((w,i)=>`<div class="wrong-row"><div><strong>${esc(labelQuestion(w.q))}</strong><small>需要复习 ${Number(w.misses)||1} 次 · ${MODES.find(m=>m.id===w.q.type).title}</small></div><button class="btn small" type="button" data-review="${i}">重练这题</button></div>`).join(''):'<div class="empty">这里暂时没有错题。保持自己的节奏，继续发现吧。</div>');
 $('#reviewAll').addEventListener('click',()=>startReview(saved.wrong.map(w=>w.q)));$$('[data-review]').forEach(b=>b.addEventListener('click',()=>startReview([saved.wrong[Number(b.dataset.review)].q])));$('#clearWrong').addEventListener('click',()=>{if(!saved.wrong.length){toast('错题本已经是空的。');return}if(confirm('清空当前浏览器里的全部错题？学习星和完成次数会保留。')){saved.wrong=[];saveStore();renderWrong()}});$('#exportStats').addEventListener('click',exportStats);$('#importStats').addEventListener('click',()=>$('#recordFile').click());$('#recordFile').addEventListener('change',importStats);
}
function startReview(qs){if(!qs.length)return;closeModal();resetRound();state.review=shuffle(copy(qs));renderNav();updateModeIntro();updateSettingsUI();nextQuestion();toast('开始重练。原题用字保留，不受当前范围设置限制。')}
function exportStats(){const o={format:'hanzi-explorer-records',version:1,exported:new Date().toISOString(),data:saved};const blob=new Blob([JSON.stringify(o,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='汉字探险家_学习记录.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function importStats(e){const file=e.target.files?.[0];if(!file)return;try{if(file.size>2000000)throw Error('记录文件过大');const o=JSON.parse(await file.text());if(o.format!=='hanzi-explorer-records'||o.version!==1||!o.data||!Array.isArray(o.data.wrong))throw Error('不是本页面导出的学习记录');if(o.data.wrong.some(w=>!validWrong(w)))throw Error('记录含有无法识别的题目');if(!confirm('用这份记录替换当前浏览器的学习星、完成次数和错题？'))return;for(const k of ['stars','finished','first'])saved[k]=Number.isFinite(o.data[k])?Math.max(0,Math.floor(o.data[k])):0;saved.wrong=o.data.wrong.slice(0,300);saveStore();renderWrong();toast('记录已导入。')}catch(err){toast('导入未成功：'+err.message)}}
async function fullScreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('此浏览器不支持网页全屏，可横屏使用或隐藏浏览器工具栏。')}catch{toast('浏览器未允许进入全屏；仍可正常练习。')}}
function onSetting(kind,value){state[kind]=Number.isFinite(Number(value))&&kind!=='scope'?Number(value):value;saveStore();setMode(state.mode)}
function init(){$('#randomQuestionBtn').addEventListener('click',()=>{if(!state.q||state.review||!isSort())return;nextQuestion();toast('已随机换题；跳过的题目不计完成次数。')});hydrateIcons();renderNav();updateSettingsUI();updateModeIntro();updateCounters();$('#scopeSelect').addEventListener('change',e=>onSetting('scope',e.target.value));$('#batchSelect').addEventListener('change',e=>onSetting('batch',e.target.value));$('#choiceSelect').addEventListener('change',e=>onSetting('choices',e.target.value));$('#tileSelect').addEventListener('change',e=>onSetting('tiles',e.target.value));$('#restartBtn').addEventListener('click',()=>{if(state.done||state.failed){if(!confirm('重新开始这一组？已获得的学习星和错题仍会保留。'))return}setMode(state.mode)});$('#nextBtn').addEventListener('click',()=>{if(isSort()&&!state.solved)checkSort();else if(state.solved)nextQuestion()});$('#revealBtn').addEventListener('click',reveal);$('#readBtn').addEventListener('click',speakQuestion);$('#sourceBtn').addEventListener('click',()=>openSources());$('#wrongBtn').addEventListener('click',openWrong);$('#closeModal').addEventListener('click',closeModal);$('#modalBackdrop').addEventListener('click',e=>{if(e.target===$('#modalBackdrop'))closeModal()});$('#soundBtn').addEventListener('click',()=>{state.sound=!state.sound;$('#soundBtn').setAttribute('aria-pressed',String(state.sound));$('#soundLabel').textContent=state.sound?'音效开':'音效关';if(state.sound)beep(true)});$('#fullBtn').addEventListener('click',fullScreen);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&cancelActiveRadicalDrag){cancelActiveRadicalDrag();return}const modalOpen=$('#modalBackdrop').classList.contains('open');if(e.key==='Escape'&&modalOpen){closeModal();return}if(modalOpen&&e.key==='Tab'){const a=$$('button:not(:disabled),a[href],input:not([type=hidden]),select,[tabindex="0"]',$('.modal')).filter(x=>x.offsetParent!==null);if(!a.length)return;const first=a[0],last=a[a.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}return}if(modalOpen||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(['1','2','3'].includes(e.key)&&state.q?.options&&!state.solved){answerChoice(Number(e.key)-1);e.preventDefault()}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelActiveRadicalDrag?.();stopSpeech();stopSteps()}});window.addEventListener('resize',()=>fitAncient());nextQuestion();
}
init();

document.documentElement.classList.toggle('embedded',parent!==window);
window.addEventListener('message',e=>{
 if(parent===window||e.source!==parent||e.origin!==location.origin)return;
 if(e.data?.type==='mp-reset'){if($('#modalBackdrop').classList.contains('open'))closeModal();setMode(state.mode)}
});
window.HanziExplorer={D,state,saved,MODES,RADICAL_LEVELS,RADICAL_GROUPS,RADICAL_VISUAL_GUARDS,makeQuestion,makeRadical,radicalMatches,setMode,nextQuestion,validWrong};
window.render_game_to_text=()=>JSON.stringify({mode:state.mode,question:state.q?.type,cards:state.q?.cards,options:state.q?.options,solved:state.solved,done:state.done,stars:saved.stars});
window.__mpReady=true;
if(parent!==window)parent.postMessage({type:'mp-ready',id:'hanzi-explorer'},location.origin);
