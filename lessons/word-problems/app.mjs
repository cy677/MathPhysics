import {createCatalogLoader,categoriesFor,filterQuestions,selectQuestions,LEVELS} from './catalog.mjs';
import {normalizeAnswer,answerText,answerPlaceholder,checkAnswer} from './answers.mjs';
import {readSession,saveSession,sessionSnapshot,normalizeSelection,emptyAttempt,checkAttempt,restoreAttempts,makeSheet,computeResult,REWARD_POLICY} from './session.mjs';

export function mountWordProblems(root,{onBack = () => {},loader = createCatalogLoader()} = {}) {
  const $ = id => root.querySelector(`#word-${id}`);
  const element = (tag,text,cls) => {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
  const storage = window.MathPhysicsSync?.createStorage()||{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
  const remote=window.MathPhysicsSync?.getSnapshot('word-problems');
  const saved = readSession(remote?{getItem:()=>JSON.stringify(remote)}:storage),state=saved.state;
  let directory,allQuestions=[],questions=[],popups=[],loadVersion=0,loading=false,active=false,result=null,savedSuccessfully=true,formalSelections=[];
  const sync=window.MathPhysicsSync;
  const titleFor=value=>value.replace(/：直接关系基线（未证实变式操作）$/,'：直接数量关系').replace(/候选$/,'');
  const selectionId=row=>row?.selectionId||'';
  const formalRows=()=>formalSelections.filter(row=>row.collection===$('collection').value&&row.category===$('category').value&&row.subcategory===$('subcategory').value&&row.level===$('level').value);
  const selectedFormal=()=>formalRows().find(row=>selectionId(row)===$('objective').value);

  function status(message='',error=false) {
    $('status').textContent=message;$('status').className=error?'error':'';
  }
  function persist() {
    savedSuccessfully=saveSession(storage,state,allQuestions);
    if(!savedSuccessfully)status('本次记录未能保存，当前页面仍可继续答题。',true);
  }
  function closePopups(destroy=false) {
    for(const popup of popups) {if(destroy)popup.destroy();else popup.close();}
    if(destroy)popups=[];
  }
  function controls(busy=false,empty=false) {
    loading=busy;
    for(const name of ['collection','mode','category','subcategory','level','count','objective','generate','new']) $(name).disabled=busy || (empty && !['collection','mode'].includes(name));
    if(!busy&&$('mode').value==='assessment')$('count').disabled=true;
    $('questions').setAttribute('aria-busy',String(busy));
  }
  function currentSelection() {
    return normalizeSelection({collection:$('collection').value,category:$('category').value,subcategory:$('subcategory').value,
      level:$('level').value,mode:$('mode').value,count:Number($('count').value)});
  }
  function modeNote() {
    const mode=$('mode').value;
    $('generate').textContent=mode==='assessment'?'开始正式考核':mode==='demo'?'开始讲解':'生成练习';
    $('mode-note').textContent=mode==='assessment'?'按当前分类选择考核能力。题量沿用该能力的固定设置，原始答案由服务器判定。':mode==='demo'?'先读题，再跟着步骤理解数量关系。讲解不计成长分。':'先独立想一想，也可以逐步查看提示。答错后可以继续尝试，练习不计成长分。';
    $('objective-label').hidden=mode!=='assessment';$('new').textContent=mode==='assessment'?'另开一次考核':'换一组';
  }
  function fillCategories() {
    const selection=state.selection,available=categoriesFor(directory,$('collection').value,$('mode').value);
    $('category').replaceChildren(...available.map(category=>new Option(`${category.id} · ${category.title}`,category.id)));
    if($('mode').value==='assessment')$('category').prepend(new Option('全部分类 · 按数学能力组合','all'));
    if(available.some(category=>category.id===selection.category)||selection.category==='all'&&$('mode').value==='assessment')$('category').value=selection.category;
    return available.find(category=>category.id===$('category').value);
  }
  function fillFilters() {
    if($('mode').value==='assessment'){fillFormalFilters();return;}
    const selection=state.selection,base=filterQuestions(allQuestions,{collection:$('collection').value,category:$('category').value,mode:$('mode').value});
    const subcategories=[...new Set(base.map(question=>question.subcategory))].sort();
    $('subcategory').replaceChildren(new Option('全部子类','all'),...subcategories.map(title=>new Option(titleFor(title),title)));
    if(subcategories.includes(selection.subcategory))$('subcategory').value=selection.subcategory;
    const selected=base.filter(question=>$('subcategory').value==='all'||question.subcategory===$('subcategory').value);
    const levels=LEVELS.filter(level=>selected.some(question=>question.level===level.id));
    $('level').replaceChildren(new Option('全部层次','all'),...levels.map(level=>new Option(`${level.id} · ${level.title}`,level.id)));
    if(levels.some(level=>level.id===selection.level))$('level').value=selection.level;
    state.selection=currentSelection();limit();
  }
  function limit() {
    if($('mode').value==='assessment')return selectedFormal()?.fixedCount||0;
    const selected=filterQuestions(allQuestions,currentSelection()),capacity=Math.min(20,selected.length);
    $('count').max=String(Math.max(1,capacity));$('count').value=String(Math.max(1,Math.min(Number($('count').value)||5,capacity||1)));
    return capacity;
  }
  function fillFormalFilters() {
    const selection=state.selection,base=formalSelections.filter(row=>row.collection===$('collection').value&&row.category===$('category').value);
    const subs=[...new Set(base.map(row=>row.subcategory).filter(value=>value!=='all'))].sort();
    $('subcategory').replaceChildren(new Option('全部子类','all'),...subs.map(value=>new Option(titleFor(value),value)));
    if(subs.includes(selection.subcategory))$('subcategory').value=selection.subcategory;
    const selected=base.filter(row=>row.subcategory===$('subcategory').value);
    const levels=LEVELS.filter(level=>selected.some(row=>row.level===level.id));
    $('level').replaceChildren(new Option('全部层次','all'),...levels.map(level=>new Option(`${level.id} · ${level.title}`,level.id)));
    if(levels.some(level=>level.id===selection.level))$('level').value=selection.level;
    state.selection=currentSelection();paintFormal();
  }
  function paintFormal() {
    const previous=$('objective').value||state.formal?.selectionId,rows=formalRows();
    $('objective').replaceChildren(...rows.map(row=>{
      const option=new Option(`${row.objectiveTitle} · ${row.fixedCount}题${row.available?'':' · 暂无对应题目'}`,selectionId(row));
      option.disabled=!row.available;return option;
    }));
    if(rows.some(row=>selectionId(row)===previous&&row.available))$('objective').value=previous;
    else if(rows.some(row=>row.available))$('objective').value=selectionId(rows.find(row=>row.available));
    const choice=selectedFormal()||rows[0],connected=sync?.snapshot().available&&sync.snapshot().connection==='online';
    $('count').value=String(choice?.fixedCount||3);$('count').disabled=true;
    $('objective').disabled=!rows.some(row=>row.available);
    $('generate').disabled=$('new').disabled=!choice?.available||!connected;
    const panel=element('article',undefined,'question word-assessment-context');
    panel.append(element('h3',choice?.title||'当前分类的正式考核'),element('p','请选择适合的数学能力。应用题可先练习再考核，交卷后查看成绩。'));
    if(choice){
      panel.append(element('p',`${choice.categoryTitle} · ${choice.subcategory==='all'?'全部子类':titleFor(choice.subcategory)} · ${choice.levelTitle}`),
        element('p',`${choice.objectiveTitle}，固定${choice.fixedCount}题；当前分类有${choice.availableQuestions}道对应应用题。`),
        element('p','成长分沿用该数学能力的历史最佳成绩，只记录提高的差额。'));
      if(choice.nativeSupplementCount>0)panel.append(element('p',`本次采用当前分类应用题，并补充${choice.nativeSupplementCount}道同知识目标、同难度的原题。`));
      if(!choice.available)panel.append(element('p','当前范围暂无明确对应这一知识目标的应用题，可以选择其他知识目标。'));
    }else panel.append(element('p',formalSelections.length?'当前范围的知识目标尚未明确对应，自主练习和讲解仍可使用。':'本机课堂可继续自主练习；正式考核请打开支持账号的本地服务。'));
    $('questions').replaceChildren(panel);$('progress').replaceChildren();$('finish').hidden=true;
    if(choice?.available){state.formal={...(state.formal||{}),selectionId:selectionId(choice)};}
    state.selection=currentSelection();persist();
  }
  async function loadFormal(serial) {
    state.selection=currentSelection();formalSelections=[];
    if(!sync?.snapshot().available||sync.snapshot().connection!=='online'){
      controls(false);fillFormalFilters();status('正式考核需要连接支持账号的本地服务。自主练习和讲解可离线使用。');$('retry').hidden=false;return;
    }
    status('正在读取当前分类的考核能力…');
    try {
      const capabilities=await sync.request('/capabilities');if(serial!==loadVersion)return;
      const sources=capabilities.wordProblemSources?.assessmentSelections;
      if(!Array.isArray(sources))throw Error('暂时无法读取应用题考核能力，请重试。');
      formalSelections=sources;controls(false);fillFormalFilters();modeNote();status();
    }catch(error){if(serial!==loadVersion)return;controls(false);fillFormalFilters();status(error.message,true);$('retry').hidden=false;}
  }
  async function startFormal(fresh=false) {
    const choice=selectedFormal();if(!choice?.available){status('当前范围暂无明确对应知识目标的应用题，请选择其他知识目标。',true);return;}
    if(!sync?.snapshot().account){window.MathPhysicsSyncUI?.open();status('请登录并选择学习档案，再开始考核。');return;}
    if(sync.snapshot().connection!=='online'){status('连接恢复后才能开始正式考核。当前练习记录保留在本机。',true);return;}
    const current=state.formal;
    if(!fresh&&current?.lastSelectionId===selectionId(choice)&&current.lastAttemptId){
      window.location.assign(`../../learning/index.html?attempt=${encodeURIComponent(current.lastAttemptId)}#assessment`);return;
    }
    controls(true);status('正在准备考核…');
    try {
      const attempt=await sync.issueAttempt(choice.objectiveId,choice.difficulty,{kind:'word-problems',selectionId:selectionId(choice)});
      state.formal={selectionId:selectionId(choice),lastSelectionId:selectionId(choice),lastAttemptId:attempt.id};persist();
      window.location.assign(`../../learning/index.html?attempt=${encodeURIComponent(attempt.id)}#assessment`);
    }catch(error){controls(false);paintFormal();status(error.message,true);$('retry').hidden=false;}
  }
  function sourceDetails(question) {
    const details=element('details',undefined,'word-source'),summary=element('summary','题目来源'),link=element('a',`${question.source.dataset.toUpperCase()} · ${question.source.sourceId}`);
    link.href=question.source.url;link.target='_blank';link.rel='noopener';
    const credit=element('p');credit.append(link,document.createTextNode('；中文题面、单位、答案及讲解已完成独立助手复核。'));
    details.append(summary,credit,element('p',question.source.dataset==='asdiv'?'来源采用 CC BY-NC 4.0，仅限非商业使用。':question.source.dataset==='svamp'?'SVAMP 源仓库采用 MIT。与 ASDiv 的原题血缘尚未逐条确认，保留非商业使用边界。':'来源采用 MIT 许可。'));
    return details;
  }
  function teaching(question,container) {
    const steps=element('ol'),mistakes=element('ul');
    steps.append(...question.steps.map(text=>element('li',text)));mistakes.append(...question.commonMistakes.map(text=>element('li',text)));
    container.append(element('h4','解题过程'),element('p',`参考答案：${answerText(question.answer)}`),steps);
    if(question.commonMistakes.length)container.append(element('h4','容易混淆的地方'),mistakes);
  }
  function answerField(answer,key,index) {
    const row=element('div',undefined,'answer-row'),input=element(answer.type==='choice'?'select':'input');
    input.name=key;input.id=`word-answer-${index}-${key}`;
    if(answer.type==='choice')input.append(new Option('请选择',''),...answer.choices.map(value=>new Option(value,value)));
    else {input.type='text';input.maxLength=80;input.autocomplete='off';input.spellcheck=false;input.placeholder=answerPlaceholder(answer);}
    row.append(input,element('span',answer.unit||'','unit'));return {row,input};
  }
  function card(question,index) {
    const mode=state.sheet.selection.mode,article=element('article',undefined,'question');article.dataset.questionId=question.id;
    const header=element('header');header.append(element('b',`第${index+1}题 · ${question.level}`));article.append(header,element('h3',question.prompt));
    if(question.prerequisites.length)article.append(element('p',`先会这些：${question.prerequisites.join('、')}`,'word-prerequisites'));
    if(mode==='demo') {
      article.append(element('p',question.intent));const explanation=element('section',undefined,'word-demo-solution');teaching(question,explanation);article.append(explanation,sourceDetails(question));return article;
    }
    const answer=normalizeAnswer(question.answer),fields=[],form=element('form'),check=element('button','检查答案','primary'),feedback=element('div',undefined,'feedback');
    if(mode==='assessment')check.textContent='提交答案';check.type='submit';feedback.setAttribute('role','status');
    if(answer.type==='tuple') {
      const multiple=element('div',undefined,'word-multiple-answer');
      for(const part of answer.parts) {const field=answerField(part.answer,part.key,index),label=element('label',part.label);label.htmlFor=field.input.id;multiple.append(label,field.row);fields.push({key:part.key,...field});}
      form.append(multiple,check);
    } else {
      const field=answerField(answer,'answer',index),label=element('label','你的答案');label.htmlFor=field.input.id;field.row.append(check);form.append(label,field.row);fields.push({key:'answer',...field});
    }
    article.append(form,feedback);
    const readInput=()=>answer.type==='tuple'?Object.fromEntries(fields.map(field=>[field.key,field.input.value])):fields[0].input.value;
    function rememberDraft() {
      const previous=state.attempts[question.id]||emptyAttempt();if(previous.solved)return;
      state.attempts[question.id]={...previous,input:readInput(),submitted:false,solved:false,message:''};progress();persist();
    }
    for(const field of fields){field.input.addEventListener('input',rememberDraft);field.input.addEventListener('change',rememberDraft);}
    let hint,solution,hints,explanation;
    if(mode==='practice') {
      const trigger=element('button','提示','mp-help-trigger');trigger.type='button';header.append(trigger);
      const content=element('section');hint=element('button','下一步提示');solution=element('button','查看解题过程');hint.type=solution.type='button';hints=element('ol');explanation=element('div');content.append(element('p',question.intent),hint,hints,solution,explanation);
      popups.push(window.MathPhysicsHelp.create({title:`第${index+1}题 · 提示`,content,trigger,parent:article}));
    }
    function paint() {
      const attempt=state.attempts[question.id]||emptyAttempt(),locked=mode==='assessment'?attempt.submitted:attempt.solved;
      for(const field of fields) {field.input.value=answer.type==='tuple'?attempt.input?.[field.key]||'':typeof attempt.input==='string'?attempt.input:'';field.input.disabled=locked;}
      check.disabled=locked;
      const checked=checkAnswer(question.answer,attempt.input);
      feedback.textContent=mode==='assessment'&&result&&attempt.submitted?checked.message:attempt.message;
      feedback.className=`feedback${(mode==='practice'||result)&&attempt.submitted&&checked.correct?' correct':''}`;
      if(hint) {
        hint.disabled=attempt.hints>=question.hints.length;hint.textContent=`下一步提示 ${attempt.hints}/${question.hints.length}`;
        hints.replaceChildren(...question.hints.slice(0,attempt.hints).map(text=>element('li',text)));
        solution.disabled=attempt.revealed;explanation.replaceChildren();if(attempt.revealed)teaching(question,explanation);
      }
    }
    form.onsubmit=event=>{
      event.preventDefault();const checked=checkAttempt(question,state.attempts[question.id],readInput(),mode);
      if(!checked.result.valid) {feedback.textContent=checked.result.message;fields[0].input.focus();return;}
      state.attempts[question.id]=checked.attempt;paint();progress();persist();
    };
    if(hint) {
      hint.onclick=()=>{const attempt=state.attempts[question.id]||emptyAttempt();state.attempts[question.id]={...attempt,input:readInput(),hints:Math.min(question.hints.length,attempt.hints+1)};paint();persist();};
      solution.onclick=()=>{const attempt=state.attempts[question.id]||emptyAttempt();state.attempts[question.id]={...attempt,input:readInput(),revealed:true};paint();persist();};
    }
    article.append(sourceDetails(question));paint();return article;
  }
  function progress() {
    $('progress').replaceChildren();if(!state.sheet||!questions.length)return;
    const mode=state.sheet.selection.mode,computed=computeResult(state.sheet,questions,state.attempts);
    const values=mode==='demo'?[[computed.total,'演示题']]:mode==='assessment'&&!result?[[computed.submitted,'已提交'],[computed.total,'题目']]:[[computed.correct,'已答对'],[computed.total,'题目']];
    for(const [number,label] of values) {const node=element('span');node.append(element('strong',String(number)),document.createTextNode(label));$('progress').append(node);}
    $('finish').hidden=true;
  }
  function paintResult() {
    $('result').replaceChildren();$('result').hidden=!result;
    if(!result)return;
    const best=result.best;
    $('result').append(element('strong',`本次考核：${result.correct}/${result.total}，正确率 ${Math.round(result.accuracy*100)}%`),
      element('p',`同一目标的历史最佳：${best?.correct||0}/${best?.total||result.total}（${Math.round((best?.accuracy||0)*100)}%）。`),
      element('p',(savedSuccessfully?'已保存本地考核结果。':'本次结果未能存入浏览器，仅在当前页面有效。')+'本模块暂不发放成长积分。'));
  }
  function render() {
    closePopups(true);$('questions').replaceChildren(...questions.map(card));paintResult();progress();
  }
  function randomId() {
    if(crypto.randomUUID)return crypto.randomUUID();const values=new Uint32Array(3);crypto.getRandomValues(values);return `${Date.now()}-${values.join('-')}`;
  }
  function createGroup(fresh=false) {
    if(loading)return;
    if(currentSelection().mode==='assessment'){startFormal(fresh);return;}
    if(!allQuestions.length)return;
    try {
      if(!limit())throw Error('当前筛选条件暂无可用中文题，请更换子类或层次。');
      const selection=currentSelection(),seed=fresh?randomId():state.sheet?.seed||'数与生活';
      const chosen=selectQuestions(allQuestions,{...selection,seed});
      const same=!fresh&&state.sheet&&JSON.stringify(chosen.map(question=>question.id))===JSON.stringify(state.sheet.questionIds)&&JSON.stringify(selection)===JSON.stringify(state.sheet.selection);
      state.sheet=makeSheet(chosen,selection,{seed,attemptId:same?state.sheet.attemptId:randomId()});state.selection=state.sheet.selection;
      state.attempts=same?restoreAttempts(chosen,state.attempts,selection.mode):{};questions=chosen;result=null;
      render();status();persist();
    } catch(error) {status(error.message,true);}
  }
  function loadCategory({restore=false} = {}) {
    const serial=++loadVersion;closePopups(true);controls(true);$('retry').hidden=true;$('questions').replaceChildren();$('progress').replaceChildren();$('result').hidden=true;$('finish').hidden=true;
    allQuestions=[];questions=[];result=null;modeNote();
    const category=fillCategories();
    if($('mode').value==='assessment')return loadFormal(serial);
    if(!category) {
      controls(false,true);status(directory.counts.studentPractice?'当前条件没有可用练习，请选择另一种方式。':'当前分类尚无可用练习。');return Promise.resolve();
    }
    state.selection={...state.selection,collection:$('collection').value,mode:$('mode').value,category:category.id};
    status('正在加载当前分类…');
    return loader.category(category).then(loaded=>{
      if(serial!==loadVersion)return;
      allQuestions=loaded;fillFilters();controls(false);modeNote();
      if(restore&&state.sheet?.selection.collection===state.selection.collection&&state.sheet.selection.category===state.selection.category&&state.sheet.selection.mode===state.selection.mode) {
        try {
          const registry=new Map(loaded.map(question=>[question.id,question])),restored=state.sheet.questionIds.map(id=>registry.get(id));
          if(restored.some(question=>!question))throw Error('已保存的题目已被隔离');
          state.sheet=makeSheet(restored,state.sheet.selection,{seed:state.sheet.seed,attemptId:state.sheet.attemptId});state.selection=state.sheet.selection;
          state.attempts=restoreAttempts(restored,state.attempts,state.selection.mode);questions=restored;
          render();status(saved.status==='unavailable'?'上次记录无法恢复，已打开新练习。':'');persist();return;
        } catch {status('上次题目无法按当前题库恢复，已打开新练习。',true);}
      }
      createGroup();
    }).catch(error=>{
      if(serial!==loadVersion)return;controls(false,true);status(error.message,true);$('retry').hidden=false;
    });
  }
  $('collection').value=state.selection.collection;$('mode').value=state.selection.mode;$('count').value=String(state.selection.count);
  $('settings').onsubmit=event=>{event.preventDefault();createGroup();};$('new').onclick=()=>createGroup(true);
  $('collection').onchange=()=>{state.selection={...currentSelection(),category:'',subcategory:'all',level:'all'};loadCategory();};
  $('mode').onchange=()=>{state.selection={...currentSelection(),subcategory:'all',level:'all'};loadCategory();};
  $('category').onchange=()=>{state.selection={...currentSelection(),subcategory:'all',level:'all'};loadCategory();};
  $('subcategory').onchange=()=>{state.selection={...currentSelection(),level:'all'};fillFilters();if($('mode').value!=='assessment')createGroup(true);};
  $('level').onchange=()=>{state.selection=currentSelection();if($('mode').value==='assessment')paintFormal();else{limit();createGroup(true);}};
  $('objective').onchange=()=>paintFormal();
  $('retry').onclick=()=>{if(directory)loadCategory({restore:true});else activate();};
  $('back').onclick=()=>{deactivate();onBack();};
  $('finish').onclick=()=>status('正式考核只能在服务器签发的考核页完成。',true);
  window.MathPhysicsSync?.register('word-problems',()=>sessionSnapshot(state),window);
  function activate() {
    active=true;
    if(directory&&allQuestions.length)return Promise.resolve();
    controls(true);status('正在准备应用题目录…');$('retry').hidden=true;
    return loader.index().then(value=>{directory=value;const counts=value.counts;$('count-note').textContent=`可用练习 ${counts.studentPractice} 题，分为基础与综合两个题库。练习和考核可使用同题，考核沿用原知识目标。`;return loadCategory({restore:true});}).catch(error=>{controls(false,true);status(error.message,true);$('retry').hidden=false;});
  }
  function deactivate() {active=false;closePopups();}
  return {activate,deactivate,snapshot:()=>structuredClone({ready:!!directory&&!loading,active,loading,selection:state.selection,sheet:state.sheet,
    questions,attempts:state.attempts,result,records:state.records,publishedCounts:directory?.counts||null,
    formal:state.formal||null,formalSelections:formalRows(),loadedCategories:loader.loadedCategories(),saved:savedSuccessfully,rewardPolicy:REWARD_POLICY})};
}
