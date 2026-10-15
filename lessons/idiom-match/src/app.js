(async function () {
'use strict';
let sync=null;
try{if(parent!==window&&parent.location.origin===location.origin)sync=parent.MathPhysicsSync?.createClient()||null;}catch{}
await sync?.ready;
const storage=sync?.createStorage()||{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
if(sync)document.documentElement.classList.add('mp-embedded');
const DATA=JSON.parse(document.getElementById('idiomData').textContent);
const PRACTICE=JSON.parse(document.getElementById('practiceData').textContent);
const GROUPS=JSON.parse(document.getElementById('groupData').textContent);
const SOURCE=JSON.parse(document.getElementById('sourceData').textContent);
const POOLS=[200,400,600,800,1000],DIFFICULTIES={easy:{name:'轻松',mode:'free',desc:'自由配对 · 前后分色'},normal:{name:'标准',mode:'mahjong',desc:'直线配对 · 可拖动牌组'},hard:{name:'挑战',mode:'mahjong',desc:'直线配对 · 不标前后段'}};
const ENGINES=new Map();
const entriesFor=size=>size==='practice'?PRACTICE:DATA.slice(0,size);
const validPool=size=>size==='practice'||POOLS.includes(size);
const poolName=size=>size==='practice'?'练习词库':size+' 词库';
const engineFor=size=>{if(!ENGINES.has(size))ENGINES.set(size,createIdiomEngine(entriesFor(size),{maxCount:size==='practice'?PRACTICE.length:30}));return ENGINES.get(size);};
const ALL_DATA=[...DATA,...PRACTICE.filter(e=>!DATA.some(original=>original.id===e.id))];
const ALL=createIdiomEngine(ALL_DATA),$=id=>document.getElementById(id),STORE=sync?'mathphysics.progress.v1.idiom-match':'idiom-match-random-v2',OLD_STORE='idiom-match-1000-v1';
let E=engineFor(200);
const VERSION=2;
const icon=name=>'<svg class="icon" aria-hidden="true"><use href="#i-'+name+'"/></svg>';
const clone=o=>JSON.parse(JSON.stringify(o));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const simplify=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s0-9']/g,'').toLowerCase();
const defaults=()=>({version:VERSION,settings:{pinyin:true,sound:false,speech:false,poolSize:200,difficulty:'easy',count:10},seen:[],rounds:0,totalMatches:0,session:null});
let saved=defaults(),state=null,history=[],selected=null,hintUids=[],busy=false,epoch=0,noticeTimer=null,lastTick=performance.now(),confirmResolve=null,pointer=null,suppressClickUntil=0,audioContext=null,bookTab='round',bookPage=0,lastModality='pointer',lastFocused=null,restoreNotice=false;
const timed=(fn,ms)=>{const token=epoch;return setTimeout(()=>{if(token===epoch)fn();},ms);};
function validSession(s){
 if(!s||!validPool(s.poolSize)||!DIFFICULTIES[s.difficulty]||s.mode!==DIFFICULTIES[s.difficulty].mode||!Number.isInteger(s.count))return false;
 if(s.poolSize==='practice'?s.count!==PRACTICE.length:s.count<4||s.count>30)return false;
 if(!Number.isInteger(s.cols)||s.cols<2||s.cols>12||!Number.isInteger(s.rows)||s.rows<1||s.rows>30||!Array.isArray(s.board)||s.board.length!==s.cols*s.rows||s.board.length<s.count*2||s.board.length>s.count*2+30)return false;
 const engine=engineFor(s.poolSize);
 if(!Array.isArray(s.ids)||s.ids.length!==s.count||!engine.safeSelection(s.ids))return false;
 if(!Array.isArray(s.found)||s.found.some(id=>!s.ids.includes(id))||new Set(s.found).size!==s.found.length)return false;
 const uids=new Set();
 for(const t of s.board)if(t){
  if(!s.ids.includes(t.sourceId)||![0,1].includes(t.part))return false;
  const e=engine.byId.get(t.sourceId);
  if(!e||t.uid!==t.sourceId+':'+t.part||uids.has(t.uid)||t.text!==e.word.slice(t.part*2,t.part*2+2)||!Array.isArray(t.py)||t.py.join(' ')!==e.pinyin.split(' ').slice(t.part*2,t.part*2+2).join(' '))return false;
  uids.add(t.uid);
 }
 if(uids.size%2!==0||uids.size+s.found.length*2!==s.count*2||!uids.size||!engine.hasPerfectMatching(s.board))return false;
 // Multiset validation also rejects backups that delete the wrong halves.
 const expected=new Map(),actual=new Map();
 for(const id of s.ids)if(!s.found.includes(id)){const e=engine.byId.get(id);for(let p=0;p<2;p++){const k=p+':'+e.word.slice(p*2,p*2+2);expected.set(k,(expected.get(k)||0)+1);}}
 for(const t of s.board)if(t){const k=t.part+':'+t.text;actual.set(k,(actual.get(k)||0)+1);}
 if(expected.size!==actual.size||[...expected].some(([k,v])=>actual.get(k)!==v))return false;
 for(const k of ['elapsed','mistakes','hints','shuffles','moves'])if(!Number.isFinite(s[k])||s[k]<0||s[k]>1e9)return false;
 return s.lastId===null||s.found.includes(s.lastId);
}
function validateStore(v,strict=false){
 if(!v||![1,VERSION].includes(v.version)||!v.settings||!Array.isArray(v.seen))throw new Error('这不是有效的游戏进度文件。');
 const clean=defaults();
 for(const k of ['pinyin','sound','speech'])if(typeof v.settings[k]==='boolean')clean.settings[k]=v.settings[k];
 clean.seen=[...new Set(v.seen.filter(id=>Number.isInteger(id)&&ALL.byId.has(id)))];
 if(v.version===1){clean.settings.difficulty=v.settings.mode==='mahjong'?'normal':'easy';return clean;}
 for(const k of ['rounds','totalMatches'])if(Number.isInteger(v[k])&&v[k]>=0&&v[k]<1e9)clean[k]=v[k];
 if(validPool(v.settings.poolSize))clean.settings.poolSize=v.settings.poolSize;
 if(DIFFICULTIES[v.settings.difficulty])clean.settings.difficulty=v.settings.difficulty;
 if(Number.isInteger(v.settings.count)&&v.settings.count>=4&&v.settings.count<=30)clean.settings.count=v.settings.count;
 if(v.session&&validSession(v.session)){clean.session=clone(v.session);for(const k of ['poolSize','difficulty'])clean.settings[k]=clean.session[k];if(clean.session.poolSize!=='practice')clean.settings.count=clean.session.count;}
 else if(v.session&&strict)throw new Error('存档中的牌面数据不完整，未导入。');
 return clean;
}
let migrated=false;
try{const raw=storage.getItem(STORE);if(raw)saved=validateStore(JSON.parse(raw));else{const old=(!sync||!sync.snapshot().accountsEnabled||!sync.snapshot().account)?(localStorage.getItem('idiom-match-random-v2')||localStorage.getItem(OLD_STORE)):null;if(old){saved=validateStore(JSON.parse(old));migrated=true;}}}catch(e){/* Storage is optional. */}
function save(){
 saved.session=state&&state.board.some(Boolean)?clone(state):null;
 try{storage.setItem(STORE,JSON.stringify(saved));document.body.classList.remove('no-save');}
 catch(e){document.body.classList.add('no-save');}
}
function notice(text,ms=2800){
 clearTimeout(noticeTimer);$('notice').textContent=text;$('notice').classList.add('show');
 noticeTimer=setTimeout(()=>$('notice').classList.remove('show'),ms);
}
function anyDialog(){return !!document.querySelector('dialog[open]');}
function openDialog(id){
 if(busy)return;clearGesture();selected=null;hintUids=[];clearLine();paintSelection();lastFocused=document.activeElement;
 if(!$(id).open)$(id).showModal();lastTick=performance.now();
}
function closeDialog(id){if($(id).open)$(id).close();lastTick=performance.now();}
for(const btn of document.querySelectorAll('[data-close]'))btn.addEventListener('click',()=>closeDialog(btn.dataset.close));
for(const d of document.querySelectorAll('dialog')){
 d.addEventListener('close',()=>{lastTick=performance.now();if(lastFocused&&document.contains(lastFocused))lastFocused.focus({preventScroll:true});});
 d.addEventListener('click',ev=>{if(ev.target===d&&d.id!=='confirmDialog'&&d.id!=='victoryDialog'){
  const r=d.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)d.close();
 }});
}
$('confirmDialog').addEventListener('cancel',ev=>{ev.preventDefault();resolveConfirm(false);});
$('confirmNo').onclick=()=>resolveConfirm(false);$('confirmYes').onclick=()=>resolveConfirm(true);
function resolveConfirm(answer){closeDialog('confirmDialog');const cb=confirmResolve;confirmResolve=null;if(cb)cb(answer);}
function ask(title,text){if(confirmResolve)return Promise.resolve(false);$('confirmTitle').textContent=title;$('confirmText').textContent=text;$('confirmDialog').showModal();return new Promise(r=>confirmResolve=r);}
function showSettings(){
 $('settingPinyin').checked=saved.settings.pinyin;$('settingSound').checked=saved.settings.sound;$('settingSpeech').checked=saved.settings.speech;openDialog('settingsDialog');
}
function applySettings(){
 document.body.classList.toggle('no-pinyin',!saved.settings.pinyin);$('pinyinBtn').classList.toggle('active',saved.settings.pinyin);$('pinyinBtn').setAttribute('aria-pressed',String(saved.settings.pinyin));
 $('pinyinBtn').setAttribute('aria-label',saved.settings.pinyin?'隐藏拼音':'显示拼音');
 for(const [id,key]of [['settingPinyin','pinyin'],['settingSound','sound'],['settingSpeech','speech']])$(id).checked=saved.settings[key];
}
function togglePinyin(){saved.settings.pinyin=!saved.settings.pinyin;applySettings();save();}
function getLocalVoice(){
 if(!('speechSynthesis' in window))return null;
 return speechSynthesis.getVoices().filter(v=>v.localService&&/^zh(?:[-_]|$)/i.test(v.lang)).sort((a,b)=>Number(/^zh[-_]CN$/i.test(b.lang))-Number(/^zh[-_]CN$/i.test(a.lang)))[0]||null;
}
function speak(entry,manual=false){
 if(!manual&&!saved.settings.speech)return;
 const voice=getLocalVoice();
 if(!voice){if(manual)notice('设备未提供可用的离线中文语音；拼音与游戏不受影响。',4200);return;}
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(entry.word);u.voice=voice;u.lang=voice.lang;u.rate=.8;u.pitch=1;u.onerror=()=>{if(manual)notice('这次朗读未能播放，可继续看拼音学习。');};speechSynthesis.speak(u);}catch(e){if(manual)notice('当前浏览器无法朗读。');}
}
function tone(success=false){
 if(!saved.settings.sound)return;
 try{
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  if(!audioContext)audioContext=new AC();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  const t=audioContext.currentTime,notes=success?[523.25,659.25,783.99]:[440];
  notes.forEach((f,k)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t+k*.075);g.gain.linearRampToValueAtTime(.045,t+k*.075+.008);g.gain.exponentialRampToValueAtTime(.001,t+k*.075+.18);o.connect(g);g.connect(audioContext.destination);o.start(t+k*.075);o.stop(t+k*.075+.2);});
 }catch(e){/* Optional audio. */}
}
function currentConfig(){return {poolSize:saved.settings.poolSize,difficulty:saved.settings.difficulty,count:saved.settings.poolSize==='practice'?PRACTICE.length:saved.settings.count};}
function freshState(config=currentConfig(),ids=null){
 E=engineFor(config.poolSize);const mode=DIFFICULTIES[config.difficulty].mode;
 const rect=$('boardShell').getBoundingClientRect(),aspect=Math.max(.65,rect.width/Math.max(260,rect.height));
 const picked=ids||(config.poolSize==='practice'?PRACTICE.map(e=>e.id):E.sample(config.count)),b=E.createBoard(picked,mode,Math.random,aspect);
 return {...config,mode,ids:picked,...b,found:[],elapsed:0,mistakes:0,hints:0,shuffles:0,moves:0,lastId:null};
}
function startRound(config=currentConfig(),ids=null){
 if(config.poolSize==='practice')config={...config,count:PRACTICE.length};
 epoch++;busy=false;clearGesture();
 try{state=freshState(config,ids);}catch(e){notice(e.message,4000);return;}
 history=[];selected=null;hintUids=[];saved.settings.poolSize=config.poolSize;saved.settings.difficulty=config.difficulty;if(config.poolSize!=='practice')saved.settings.count=config.count;lastTick=performance.now();
 for(const id of ['roundDialog','victoryDialog','bookDialog'])closeDialog(id);
 applySettings();renderBoard(true);renderStats();showFeedback();clearLine();save();
}
function renderStats(){
 $('roundName').textContent=DIFFICULTIES[state.difficulty].name+' · '+poolName(state.poolSize);
 $('roundCaption').textContent=state.count+' 个词语 / '+state.count*2+' 张牌 · '+(state.poolSize==='practice'?'全部出现':'随机抽取');
 $('matchedCount').textContent=state.found.length;$('targetCount').textContent=state.count;
 $('progressFill').style.width=state.found.length/state.count*100+'%';
 $('progressTrack').setAttribute('aria-valuemax',String(state.count));$('progressTrack').setAttribute('aria-valuenow',String(state.found.length));
 $('seenCount').textContent=saved.seen.length;$('timer').textContent=formatTime(state.elapsed);
 $('totalWords').textContent=ALL_DATA.length;
 $('roundsCount').textContent=saved.rounds;
 const done=!state.board.some(Boolean);
 for(const id of ['hintBtn','shuffleBtn'])$(id).disabled=busy||done;
 $('undoBtn').disabled=busy||!history.length||done;
 for(const id of ['restartBtn','roundsBtn','roundBookBtn','newRoundBtn'])$(id).disabled=busy;
 $('poolSelect').value=String(state.poolSize);$('difficultySelect').value=state.difficulty;$('countInput').value=saved.settings.count;
}
function applyDifficulty(){document.body.classList.toggle('hard-mode',state?.difficulty==='hard');}
function fitTiles(){
 if(!state)return;const board=$('board'),first=board.children[0];if(!first)return;
 const r=first.getBoundingClientRect();const h=Math.max(48,r.height),w=r.width;
 board.style.setProperty('--han-size',Math.max(17,Math.min(49,w/3.1,(h-23)*.56))+'px');
 board.style.setProperty('--py-size',Math.max(8,Math.min(15,w/10.2,h*.15))+'px');
}
function formatTime(s){s=Math.floor(s);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function tileHTML(t,i){return '<button class="tile" data-index="'+i+'" data-uid="'+t.uid+'" data-part="'+t.part+'" data-label="'+(t.part===0?'上':'下')+'" aria-label="'+(state.difficulty==='hard'?'成语片段':t.part===0?'上半句':'下半句')+'，'+esc(t.text)+'，'+esc(t.py.join(' '))+'" style="--order:'+i+'">'+[...t.text].map((c,k)=>'<span class="glyph"><span class="py" aria-hidden="true">'+esc(t.py[k])+'</span><span class="han" aria-hidden="true">'+c+'</span></span>').join('')+'</button>';}
function fitPracticeGrid(){
 if(state?.poolSize!=='practice')return false;
 const board=$('board'),gap=parseFloat(getComputedStyle(board).columnGap)||8;
 const maxCols=Math.max(3,Math.floor((board.clientWidth+gap)/(52+gap)));
 if(state.cols<=maxCols)return false;
 const used=state.board.findLastIndex(Boolean)+1;
 state.cols=maxCols;state.rows=Math.ceil(Math.max(state.count*2,used)/maxCols);
 state.board=Array.from({length:state.cols*state.rows},(_,i)=>state.board[i]||null);
 return true;
}
function renderBoard(deal=false){
 fitPracticeGrid();
 applyDifficulty();const board=$('board');board.dataset.mode=state.mode;board.style.setProperty('--cols',state.cols);board.style.setProperty('--rows',state.rows);board.style.setProperty('--min-board-h',(state.rows*62)+'px');document.querySelector('.app').style.setProperty('--board-floor',(state.rows*(innerWidth<720?66:72)+54)+'px');board.setAttribute('aria-rowcount',state.rows);board.setAttribute('aria-colcount',state.cols);
 board.innerHTML=state.board.map((t,i)=>'<div class="slot" role="gridcell" aria-rowindex="'+(Math.floor(i/state.cols)+1)+'" aria-colindex="'+(i%state.cols+1)+'">'+(t?tileHTML(t,i):'')+'</div>').join('');
 board.classList.toggle('dealing',deal);if(deal)timed(()=>board.classList.remove('dealing'),650);
 paintSelection();requestAnimationFrame(fitTiles);
}
function paintSelection(){for(const el of $('board').querySelectorAll('.tile')){el.classList.toggle('selected',Number(el.dataset.index)===selected);el.classList.toggle('hint',hintUids.includes(el.dataset.uid));el.setAttribute('aria-pressed',String(Number(el.dataset.index)===selected));}}
function clearLine(){$('connection').innerHTML='';}
function center(i){const slot=$('board').children[i],base=$('boardShell').getBoundingClientRect();if(!slot)return {x:0,y:0};const r=slot.getBoundingClientRect();return {x:r.left-base.left+r.width/2,y:r.top-base.top+r.height/2-2};}
function linePoints(a,b,arrow=false,dashed=false){const shell=$('boardShell').getBoundingClientRect();$('connection').setAttribute('viewBox','0 0 '+shell.width+' '+shell.height);
 $('connection').innerHTML=(arrow?'<defs><marker id="arrowHead" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7Z" fill="#fae39b"/></marker></defs>':'')+'<path class="trail '+(dashed?'dashed':'')+'" d="M '+a.x+' '+a.y+' L '+b.x+' '+b.y+'" '+(arrow?'marker-end="url(#arrowHead)"':'')+'/><circle class="trail-end" cx="'+a.x+'" cy="'+a.y+'" r="4"/>'+(arrow?'':'<circle class="trail-end" cx="'+b.x+'" cy="'+b.y+'" r="4"/>');
}
function connect(i,j,dashed=false){linePoints(center(i),center(j),false,dashed);}
function showFeedback(entry=null){
 if(!entry&&state.lastId)entry=E.byId.get(state.lastId);
 if(!entry){$('feedback').innerHTML='<div class="feedback-placeholder"><span class="example"><span class="mini-tile">一心</span>＋<span class="mini-tile tail">一意</span><span>＝ 一心一意</span></span><span>'+(state.mode==='free'?'点选两张牌，拼成一个成语':'同行或同列，中间无遮挡；也可拖动牌组')+'</span></div>';return;}
 $('feedback').innerHTML='<div class="result-word"><span class="result-py">'+esc(entry.pinyin)+'</span><span class="result-han">'+entry.word+'</span></div><div class="result-info"><div class="result-label">配对成功 · 读一读</div>'+esc(entry.meaning)+'</div><button class="iconbtn result-speech" id="resultSpeakBtn" aria-label="朗读'+entry.word+'" title="朗读成语">'+icon('sound')+'</button>';
 $('resultSpeakBtn').onclick=()=>speak(entry,true);
}
function snapshot(){return clone(state);}
function pushHistory(before=snapshot()){history.push(before);if(history.length>30)history.shift();}
function focusTile(i){const buttons=[...$('board').querySelectorAll('.tile')];const el=buttons.find(b=>Number(b.dataset.index)>=i)||buttons[0];if(el)el.focus({preventScroll:true});}
function particles(i){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const p=center(i);for(let n=0;n<8;n++){const e=document.createElement('span');e.className='confetti';e.style.cssText='left:'+p.x+'px;top:'+p.y+'px;--c:'+(['#f7daa0','#e9f1bc','#b4d9ad'][n%3])+';--dx:'+((Math.random()-.5)*130)+'px;--dy:'+((Math.random()-.65)*130)+'px;';$('boardShell').appendChild(e);setTimeout(()=>e.remove(),700);}}
function attempt(i,j,before=null){
 if(busy||i===j||!state.board[i]||!state.board[j])return;
 const a=state.board[i],b=state.board[j],entry=E.compatible(a,b);
 if(!entry){
  if(a.part===b.part){notice(state.difficulty==='hard'?'这两张牌还不能组成完整成语，再试试。':'选一张「上」牌，再选一张「下」牌。');}
  else{state.mistakes++;notice('再想一想，这两段还不能拼成词库中的成语。');save();}
  for(const k of [i,j]){const el=$('board').querySelector('[data-index="'+k+'"]');if(el){el.classList.remove('invalid');void el.offsetWidth;el.classList.add('invalid');}}
  selected=j;hintUids=[];clearLine();paintSelection();return;
 }
 if(state.mode==='mahjong'&&!E.straight(state.board,state.cols,i,j)){
  notice('成语对了！但要同行或同列且中间无遮挡。试试拖动牌组。',3500);selected=null;paintSelection();clearLine();return;
 }
 performMatch(i,j,entry,before);
}
function performMatch(i,j,entry,before=null){
 if(busy)return;pushHistory(before||snapshot());busy=true;selected=null;hintUids=[];paintSelection();renderStats();connect(i,j);particles(i);particles(j);tone(true);
 for(const k of [i,j]){const el=$('board').querySelector('[data-index="'+k+'"]');if(el)el.classList.add('eliminating');}
 timed(()=>{
  state.board[i]=null;state.board[j]=null;state.found.push(entry.id);state.moves++;state.lastId=entry.id;
  if(!saved.seen.includes(entry.id))saved.seen.push(entry.id);
  clearLine();renderBoard();showFeedback(entry);speak(entry);busy=false;renderStats();save();
  if(!state.board.some(Boolean)){busy=true;renderStats();timed(finish,500);}
  else{if(lastModality==='keyboard')focusTile(Math.min(i,j));ensurePlayable();}
 },350);
}
function tap(i){
 if(busy||anyDialog()||!state.board[i])return;
 hintUids=[];clearLine();tone(false);
 if(selected===i){selected=null;paintSelection();return;}
 if(selected===null||!state.board[selected]){selected=i;paintSelection();return;}
 const previous=selected;attempt(previous,i);
}
function ensurePlayable(){
 if(busy||!state.board.some(Boolean))return;
 if(!E.findMove(state.board,state.cols,state.rows,state.mode)){
  shuffleBoard(true);notice('暂时没有可行步骤，已自动重排剩余牌。',3400);
 }
}
function shuffleBoard(auto=false){
 if(busy||!state.board.some(Boolean))return;clearGesture();pushHistory();
 state.board=E.arrange(state.board.filter(Boolean),state.cols,state.rows,state.mode);state.shuffles++;selected=null;hintUids=[];clearLine();renderBoard(true);renderStats();save();if(!auto)notice('已换好位置，还是本局剩下的这些成语。');
}
function hint(){
 if(busy||!state.board.some(Boolean))return;clearGesture();selected=null;hintUids=[];clearLine();
 let move=E.findMove(state.board,state.cols,state.rows,state.mode);
 if(!move){shuffleBoard(true);move=E.findMove(state.board,state.cols,state.rows,state.mode);}
 if(!move){notice('这局数据需要重新开始，请点重玩。');return;}
 state.hints++;
 if(move.type==='pair'){
  hintUids=[state.board[move.i].uid,state.board[move.j].uid];paintSelection();connect(move.i,move.j,true);notice('找到了：'+move.entry.word.slice(0,2)+' ＋ '+move.entry.word.slice(2),4000);
 }else{
  const t=state.board[move.start],a=center(move.start),dest=E.shiftIndex(move.start,E.directions[move.dir].dr,E.directions[move.dir].dc,state.cols,state.rows,move.steps),b=center(dest);
  hintUids=move.moved;selected=move.start;paintSelection();linePoints(a,b,true,true);notice('把「'+t.text+'」向'+E.directions[move.dir].name+'拖 '+move.steps+' 格，拼出「'+move.pair.entry.word+'」。',5000);
 }
 renderStats();save();
}
function undo(){
 if(busy||!history.length||!state.board.some(Boolean))return;clearGesture();epoch++;
 const elapsed=state.elapsed;state=history.pop();state.elapsed=Math.max(state.elapsed,elapsed);selected=null;hintUids=[];clearLine();renderBoard();renderStats();showFeedback();save();notice('已撤销上一步。收集过的成语仍保留在成语本里。',3300);
}
async function restart(){if(busy)return;if(state.found.length||state.moves||state.mistakes){if(!await ask('重玩这组词？','保留本局成语，只重新打乱牌面；已经收集的成语会保留。'))return;}startRound({poolSize:state.poolSize,difficulty:state.difficulty,count:state.count},state.ids);}
function configFromControls(){
 const pool=$('poolSelect').value,poolSize=pool==='practice'?'practice':Number(pool),count=poolSize==='practice'?PRACTICE.length:Number($('countInput').value);
 if(poolSize!=='practice'&&(!Number.isInteger(count)||count<4||count>30)){notice('每局成语数量请填写 4—30 的整数。');$('countInput').focus();return null;}
 return {poolSize,difficulty:$('difficultySelect').value,count};
}
async function requestRound(config=currentConfig()){
 if(busy)return;
 if(state?.board.some(Boolean)&&state.found.length&&!await ask('开始新牌局？','未完成的牌局会结束，已收集词语保留。新牌局使用所选词库。'))return;
 if(config.difficulty!==state?.difficulty)saved.settings.pinyin=config.difficulty!=='hard';
 startRound(config);
}
function openRoundSettings(){
 $('poolSelect').value=String(saved.settings.poolSize);$('difficultySelect').value=saved.settings.difficulty;$('countInput').value=saved.settings.count;
 previewConfig();openDialog('roundDialog');
}
function previewConfig(){
 const practice=$('poolSelect').value==='practice',count=practice?PRACTICE.length:Number($('countInput').value)||10,diff=DIFFICULTIES[$('difficultySelect').value];
 $('countField').hidden=practice;
 $('poolNote').textContent=practice?'图片中的 '+PRACTICE.length+' 个词语，每局全部出现。':'小词库包含在大词库中，按公开新闻语料的文档频次排序。';
 $('configPreview').textContent=(practice?'练习词库全部 '+count+' 个词语':$('poolSelect').value+' 条词库中随机抽取 '+count+' 个成语')+'，共 '+count*2+' 张牌。'+diff.desc+'。';
 $('startRoundLabel').textContent=practice?'开始练习':'随机开局';
 for(const b of document.querySelectorAll('[data-count]'))b.classList.toggle('active',Number(b.dataset.count)===count);
}
function executeSlide(move,before=null){
 if(busy||!move)return;const old=before||snapshot();state.board=move.board;selected=null;hintUids=[];clearLine();renderBoard();performMatch(move.pair.i,move.pair.j,move.pair.entry,old);
}
function clearGesture(){
 if(pointer){try{$('board').releasePointerCapture(pointer.id);}catch(e){}pointer=null;}
 for(const el of $('board').querySelectorAll('.dragging')){el.style.transform='';el.classList.remove('dragging');}
}
$('board').addEventListener('pointerdown',ev=>{
 if(busy||anyDialog()||pointer||ev.button!==0)return;
 const el=ev.target.closest('.tile');if(!el)return;lastModality='pointer';
 const index=Number(el.dataset.index);if(!state.board[index])return;
 pointer={id:ev.pointerId,start:index,x:ev.clientX,y:ev.clientY,drag:false,axis:null,dir:null,steps:0,train:null};
 try{$('board').setPointerCapture(ev.pointerId);}catch(e){}
});
$('board').addEventListener('pointermove',ev=>{
 if(!pointer||ev.pointerId!==pointer.id||busy)return;
 const p=pointer,dx=ev.clientX-p.x,dy=ev.clientY-p.y;
 if(!p.drag&&Math.hypot(dx,dy)<10)return;
 if(!p.drag){p.drag=true;selected=null;hintUids=[];paintSelection();clearLine();}
 ev.preventDefault();
 if(state.mode==='free'){
  const base=$('boardShell').getBoundingClientRect();linePoints(center(p.start),{x:ev.clientX-base.left,y:ev.clientY-base.top});return;
 }
 if(!p.axis)p.axis=Math.abs(dx)>=Math.abs(dy)?'x':'y';
 const diff=p.axis==='x'?dx:dy,direction=p.axis==='x'?(diff>=0?0:1):(diff>=0?2:3);
 const tr=E.train(state.board,state.cols,state.rows,p.start,direction),c0=center(0),c1=center(p.axis==='x'?1:state.cols),unit=Math.abs(p.axis==='x'?c1.x-c0.x:c1.y-c0.y);
 p.dir=direction;p.train=tr;p.steps=Math.min(tr.capacity,Math.max(0,Math.round(Math.abs(diff)/unit)));
 for(const el of $('board').querySelectorAll('.dragging')){el.style.transform='';el.classList.remove('dragging');}
 const distance=Math.min(Math.abs(diff),tr.capacity*unit)*(diff>=0?1:-1);
 for(const i of tr.indices){const el=$('board').querySelector('[data-index="'+i+'"]');if(el){el.classList.add('dragging');el.style.transform=p.axis==='x'?'translateX('+distance+'px)':'translateY('+distance+'px)';}}
});
$('board').addEventListener('pointerup',ev=>{
 if(!pointer||ev.pointerId!==pointer.id)return;
 const p=pointer;clearGesture();suppressClickUntil=performance.now()+350;
 if(busy)return;
 if(!p.drag){tap(p.start);return;}
 clearLine();
 if(state.mode==='free'){
  const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.tile');
  if(target&&Number(target.dataset.index)!==p.start)attempt(p.start,Number(target.dataset.index));
  else{selected=p.start;paintSelection();}return;
 }
 const outcome=p.steps>0?E.slideOutcome(state.board,state.cols,state.rows,p.start,p.dir,p.steps):null;
 if(outcome)executeSlide(outcome);
 else{selected=p.start;paintSelection();notice(p.train&&p.train.capacity===0?'这个方向被挡住了，换个方向试试。':'拖动后要组成新的可消除成语，牌才会留下。',2800);}
});
$('board').addEventListener('pointercancel',()=>{clearGesture();clearLine();});
$('board').addEventListener('lostpointercapture',()=>{if(pointer){clearGesture();clearLine();}});
$('board').addEventListener('click',ev=>{
 if(performance.now()<suppressClickUntil)return;
 const el=ev.target.closest('.tile');if(el){lastModality=ev.detail===0?'keyboard':'pointer';tap(Number(el.dataset.index));}
});
$('board').addEventListener('contextmenu',ev=>ev.preventDefault());
function finish(){
 busy=false;saved.rounds++;saved.totalMatches+=state.found.length;saved.session=null;save();renderStats();
 $('victoryBody').innerHTML='<div class="victory-badge">完成</div><h2 id="victoryTitle">'+state.count+' 个词语，全部找齐</h2><div class="v-sub">'+DIFFICULTIES[state.difficulty].name+'难度 · '+poolName(state.poolSize)+' · '+(state.poolSize==='practice'?'完整练习':'随机对局')+'</div><div class="v-stat"><div><b>'+formatTime(state.elapsed)+'</b><span>本局用时</span></div><div><b>'+state.mistakes+'</b><span>误配次数</span></div><div><b>'+saved.rounds+'</b><span>累计完成对局</span></div></div><div class="v-words">'+state.found.map(id=>'<button data-review="'+id+'" title="查看释义">'+ALL.byId.get(id).word+'</button>').join('')+'</div><p class="v-sub">点一下词语，回想它的意思。</p><div class="v-actions"><button class="tool" id="victoryReview">读一读</button><button class="tool" id="victoryConfig">调整难度</button><button class="tool primary" id="victoryNext">再来一局'+icon('shuffle')+'</button></div>';
 $('victoryReview').onclick=()=>{closeDialog('victoryDialog');openBook('round');};
 $('victoryConfig').onclick=()=>{closeDialog('victoryDialog');openRoundSettings();};
 $('victoryNext').onclick=()=>startRound();
 for(const b of $('victoryBody').querySelectorAll('[data-review]'))b.onclick=()=>{const e=ALL.byId.get(Number(b.dataset.review));notice(e.word+'：'+e.meaning,5000);speak(e,true);};
 openDialog('victoryDialog');
}
$('victoryDialog').addEventListener('cancel',()=>{timed(()=>{renderStats();notice('本局已完成，点“换一组”开始新的随机对局。');},30);});
for(let g=0;g<GROUPS.length;g++){const op=document.createElement('option');op.value=String(g);op.textContent=GROUPS[g];$('bookGroup').appendChild(op);}
function openBook(tab='round'){
 if(busy)return;bookTab=tab;bookPage=0;$('bookPool').value=String(state.poolSize);$('bookSearch').value='';$('bookGroup').value='';renderBook();openDialog('bookDialog');
}
function renderBook(){
 const query=simplify($('bookSearch').value.trim()),group=$('bookGroup').value;
 const practice=bookTab==='round'&&state.poolSize==='practice'||bookTab==='pool'&&$('bookPool').value==='practice';
 let entries=bookTab==='round'?state.ids.map(id=>ALL.byId.get(id)):bookTab==='seen'?ALL_DATA.filter(e=>saved.seen.includes(e.id)):bookTab==='pool'?entriesFor($('bookPool').value==='practice'?'practice':Number($('bookPool').value)):ALL_DATA;
 if(group!=='')entries=entries.filter(e=>e.group===Number(group));
 if(query)entries=entries.filter(e=>simplify(e.word+e.pinyin+e.meaning).includes(query));
 const count=entries.length,pageSize=30,total=Math.max(1,Math.ceil(count/pageSize));bookPage=Math.min(bookPage,total-1);
 $('bookSubtitle').textContent=bookTab==='round'?(practice?'本局包含全部 ':'本局随机抽取 ')+state.count+' 个词语':bookTab==='pool'?(practice?'练习词库 · 图片中的全部 '+PRACTICE.length+' 个词语':'当前查看 '+$('bookPool').value+' 词库 · 按文档频次排序'):'已收集 '+saved.seen.length+' / '+ALL_DATA.length+' 个词语';
 document.querySelector('[data-book-tab=round]').textContent='本局 '+state.count+' 个';
 $('bookPool').disabled=bookTab!=='pool';
 for(const b of document.querySelectorAll('[data-book-tab]'))b.classList.toggle('active',b.dataset.bookTab===bookTab);
 $('wordList').innerHTML=entries.slice(bookPage*pageSize,(bookPage+1)*pageSize).map(e=>{
  const seen=saved.seen.includes(e.id),source=practice||!e.frequency?'图片练习词语':'库内序号 '+e.rank+' · '+(e.frequency.df===null?'未匹配到来源词条':'文档频次 '+e.frequency.df.toLocaleString());return '<article class="word-card '+(seen?'seen':'')+'"><div class="word-py">'+esc(e.pinyin)+'</div><strong>'+(seen?'<span class="seen-dot" aria-label="已收集"></span>':'')+e.word+'</strong><p class="def">'+esc(e.meaning)+'</p><div class="split">'+e.word.slice(0,2)+' ＋ '+e.word.slice(2)+' · '+GROUPS[e.group]+'</div><div class="freq-line">'+source+'</div><button class="word-speak" data-speak="'+e.id+'" aria-label="朗读'+e.word+'">'+icon('sound')+'</button></article>';
 }).join('')||'<div class="book-empty">'+(bookTab==='seen'&&!saved.seen.length?'还没有收集成语。配对成功后，它就会出现在这里。':'没有找到匹配的成语。')+'</div>';
 $('bookPages').innerHTML='<button id="bookPrev" '+(bookPage===0?'disabled':'')+'>上一页</button><span>'+count+' 个结果 · '+(bookPage+1)+' / '+total+'</span><button id="bookNext" '+(bookPage>=total-1?'disabled':'')+'>下一页</button>';
 $('bookPrev').onclick=()=>{bookPage--;renderBook();$('bookBody').scrollTop=0;};$('bookNext').onclick=()=>{bookPage++;renderBook();$('bookBody').scrollTop=0;};
 for(const b of $('wordList').querySelectorAll('[data-speak]'))b.onclick=()=>speak(ALL.byId.get(Number(b.dataset.speak)),true);
}
$('bookSearch').addEventListener('input',()=>{bookPage=0;renderBook();});$('bookGroup').addEventListener('change',()=>{bookPage=0;renderBook();});
for(const b of document.querySelectorAll('[data-book-tab]'))b.onclick=()=>{bookTab=b.dataset.bookTab;bookPage=0;renderBook();};
$('roundsBtn').onclick=openRoundSettings;$('newRoundBtn').onclick=()=>requestRound();$('startRoundBtn').onclick=()=>{const config=configFromControls();if(config)requestRound(config);};
 for(const id of ['poolSelect','difficultySelect','countInput'])$(id).addEventListener('input',previewConfig);
 for(const b of document.querySelectorAll('[data-count]'))b.onclick=()=>{$('countInput').value=b.dataset.count;previewConfig();};
 $('bookPool').onchange=()=>{bookPage=0;renderBook();};
 $('sourceBtn').onclick=()=>openDialog('sourceDialog');$('bookSourceBtn').onclick=()=>openDialog('sourceDialog');
 $('bookBtn').onclick=()=>openBook('pool');$('roundBookBtn').onclick=()=>openBook('round');$('collectionBtn').onclick=()=>openBook('seen');
$('pinyinBtn').onclick=togglePinyin;$('settingsBtn').onclick=showSettings;$('helpBtn').onclick=()=>openDialog('helpDialog');
$('hintBtn').onclick=hint;$('shuffleBtn').onclick=()=>shuffleBoard();$('undoBtn').onclick=undo;$('restartBtn').onclick=restart;

$('fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else notice('可使用浏览器的全屏功能。');}catch(e){notice('当前浏览器不支持此方式全屏，可使用浏览器菜单。');}};
$('settingPinyin').onchange=()=>{saved.settings.pinyin=$('settingPinyin').checked;applySettings();save();};
$('settingSound').onchange=()=>{saved.settings.sound=$('settingSound').checked;save();tone(true);};
$('settingSpeech').onchange=()=>{
 saved.settings.speech=$('settingSpeech').checked;
 if(saved.settings.speech&&!getLocalVoice()){saved.settings.speech=false;notice('没有检测到离线中文语音。可先在设备系统中安装中文语音。',4500);}
 applySettings();save();if(saved.settings.speech)speak(ALL.byId.get(state.lastId||state.ids[0]),true);
};
$('exportProgressBtn').onclick=()=>{
 save();const blob=new Blob([JSON.stringify(saved,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='成语消消乐_进度备份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('已导出进度备份。');
};
$('importProgressBtn').onclick=()=>$('importProgressFile').click();
$('importProgressFile').onchange=async ev=>{
 const file=ev.target.files?.[0];ev.target.value='';if(!file)return;
 try{if(file.size>1500000)throw new Error('文件过大，不像是游戏进度文件。');const incoming=validateStore(JSON.parse(await file.text()),true);
  if(!await ask('导入进度？','当前浏览器中的游戏进度将被备份文件替换。建议先导出当前进度。'))return;
  saved=incoming;epoch++;busy=false;clearGesture();history=[];selected=null;hintUids=[];closeDialog('settingsDialog');
  state=saved.session?clone(saved.session):freshState();E=engineFor(state.poolSize);applySettings();renderBoard(true);renderStats();showFeedback();clearLine();save();notice('进度已导入。');
 }catch(e){notice(e instanceof SyntaxError?'这个文件不是有效的 JSON 进度文件。':e.message,4200);}
};
document.addEventListener('keydown',ev=>{
 if(ev.ctrlKey||ev.metaKey||ev.target.closest('input,select,textarea')||anyDialog()||busy)return;
 lastModality='keyboard';
 const key=ev.key.toLowerCase();
 if(key==='h'){ev.preventDefault();hint();return;}if(key==='s'){ev.preventDefault();shuffleBoard();return;}if(key==='u'){ev.preventDefault();undo();return;}if(key==='p'){ev.preventDefault();togglePinyin();return;}
 if(ev.key==='Escape'){selected=null;hintUids=[];clearLine();paintSelection();return;}
 const dirs={ArrowRight:0,ArrowLeft:1,ArrowDown:2,ArrowUp:3};if(!(ev.key in dirs))return;ev.preventDefault();
 const d=dirs[ev.key];
 if(ev.altKey&&state.mode==='mahjong'&&selected!==null){const tr=E.train(state.board,state.cols,state.rows,selected,d);for(let n=1;n<=tr.capacity;n++){const move=E.slideOutcome(state.board,state.cols,state.rows,selected,d,n);if(move){executeSlide(move);return;}}notice('这个方向暂时不能形成新的可消除成语。');return;}
 let i=Number(document.activeElement?.dataset.index);if(!Number.isInteger(i)||!state.board[i]){focusTile(0);return;}
 const {dr,dc}=E.directions[d];let r=Math.floor(i/state.cols),c=i%state.cols;
 for(let k=0;k<state.board.length;k++){r=(r+dr+state.rows)%state.rows;c=(c+dc+state.cols)%state.cols;const next=r*state.cols+c;if(state.board[next]){const el=$('board').querySelector('[data-index="'+next+'"]');if(el)el.focus({preventScroll:true});return;}}
});
setInterval(()=>{
 const now=performance.now(),delta=Math.min(2,(now-lastTick)/1000);lastTick=now;
 if(state&&!document.hidden&&!anyDialog()&&state.board.some(Boolean)){state.elapsed+=Math.max(0,delta);$('timer').textContent=formatTime(state.elapsed);if(Math.floor(state.elapsed)%5===0)save();}
},1000);
document.addEventListener('visibilitychange',()=>{lastTick=performance.now();save();});window.addEventListener('pagehide',save);
window.addEventListener('resize',()=>{clearGesture();clearLine();hintUids=[];if(fitPracticeGrid()){renderBoard();save();}else{paintSelection();fitTiles();}});
new ResizeObserver(()=>{if(fitPracticeGrid())requestAnimationFrame(()=>{renderBoard();save();});else fitTiles();}).observe($('board'));
if('speechSynthesis'in window)speechSynthesis.getVoices();
applySettings();
if(saved.session&&validSession(saved.session)){state=clone(saved.session);E=engineFor(state.poolSize);restoreNotice=true;renderBoard();renderStats();showFeedback();save();}
else startRound();
if(restoreNotice)notice('已继续上次的牌局。',2800);
else if(migrated)notice('已保留旧版的收集记录；关卡存档已改为随机对局。',4000);
sync?.register('idiom-match',()=>{save();return clone(saved);},window);
window.addEventListener('message',ev=>{if(ev.source===parent&&ev.origin===location.origin&&ev.data?.type==='mp-reset')restart();});
window.__mpReady=true;
if(parent!==window)parent.postMessage({type:'mp-ready',id:'idiom-match'},location.origin);
window.render_game_to_text=()=>JSON.stringify({pool:state.poolSize,difficulty:state.difficulty,mode:state.mode,total:state.count,found:state.found.map(id=>ALL.byId.get(id).word),busy,dialog:document.querySelector('dialog[open]')?.id||null,coordinates:'row/col start at 0, rows down, columns right',tiles:state.board.flatMap((tile,index)=>tile?[{index,row:Math.floor(index/state.cols),col:index%state.cols,text:tile.text,part:tile.part}]:[])});
if(new URLSearchParams(location.search).has('test'))window.__IDIOM_TEST__={get engine(){return E;},all:ALL,data:DATA,practice:PRACTICE,pools:POOLS,getState:()=>clone(state),getSaved:()=>clone(saved),getHistory:()=>clone(history),isBusy:()=>busy,loadRound:config=>startRound(config),hint,shuffleBoard,undo,validSession,validateStore};
})();
