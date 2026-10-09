/* Shared family account entry; practice completion never awards credits. MIT. */
(() => {
  const scriptURL=document.currentScript?.src;
  const rootURL=scriptURL?new URL('../',scriptURL):null;
  if(scriptURL&&!document.querySelector('link[data-mp-sync-style]')){const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('sync-ui.css',scriptURL);css.dataset.mpSyncStyle='';document.head.append(css);}
  const messages={'signed-out':'登录后记录考核与成长',connecting:'正在连接学习服务',unavailable:'学习服务未连接',expired:'登录已过期 · 请重新登录',offline:'离线副本已保留 · 待联网同步',failed:'同步失败 · 内容保留在本机',conflict:'版本冲突 · 请选择保留哪一版',queued:'本机已保存 · 等待同步',saving:'正在同步 · 尚未确认',saved:'服务器已确认存档'};
  const labels={host:'探索首页','question-bank':'当前练习单','primary-math':'数与生活','primary-math-view':'数与生活入口偏好','word-problems':'中文应用题预览','geometry-proofs':'几何证明','jsxgraph-playground':'图形画板','tangram-flat':'七巧板','spaceflight':'航天课堂','physics-demos':'物理演示'};
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const button=(text,fn,cls)=>{const n=el('button',text,cls);n.type='button';n.onclick=fn;return n;};
  async function start(){
    if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
    if(window.MathPhysicsSyncBootstrap)await window.MathPhysicsSyncBootstrap;
    const sync=window.MathPhysicsSync;if(!sync)return;await sync.ready;
    // The surrounding host owns account controls and status for its classroom.
    if(parent!==window)return;
    const bar=el('div',undefined,'mp-sync-bar');bar.setAttribute('aria-label','档案与同步');
    const mode=el('span',document.body.dataset.mpLearning?'考核与成长':'学习内容','mp-sync-mode'),name=el('strong'),status=el('span',undefined,'mp-sync-status');status.setAttribute('role','status');
    const open=button('账号与档案',()=>dialog.showModal());
    bar.append(mode,name,status,open);
    if(rootURL&&location.protocol!=='file:'){const a=el('a',document.body.dataset.mpLearning?'返回探索':'去考核 / 成长');a.href=new URL(document.body.dataset.mpLearning?'index.html':'learning/index.html',rootURL);a.target=parent!==window?'_top':'_self';bar.append(a);}
    document.body.prepend(bar);
    let playerAccount=null;
    if(document.body.dataset.mpHost){
      const actions=document.querySelector('#player .player-actions');
      if(actions){playerAccount=button('档案与同步',()=>dialog.showModal());const entry=el('a','去考核');entry.href=new URL('learning/index.html',rootURL);entry.onclick=()=>{const url=new URL('learning/index.html',rootURL),match=location.hash.match(/^#activity\/(.+)$/);if(match)url.searchParams.set('module',decodeURIComponent(match[1]));entry.href=url;};actions.append(playerAccount,entry);}
    }
    const measure=()=>document.body.style.setProperty('--mp-sync-height',bar.getBoundingClientRect().height+'px');
    new ResizeObserver(measure).observe(bar);measure();
    const dialog=el('dialog',undefined,'mp-account-dialog');dialog.setAttribute('aria-label','账号、档案与同步');document.body.append(dialog);
    const head=el('div',undefined,'mp-dialog-head');head.append(el('h2','我的学习档案'),button('×',()=>dialog.close()));dialog.append(head);
    const content=el('div'),alert=el('p');alert.setAttribute('role','alert');dialog.append(content,alert);
    let importRecords=null,importKey=null,renderedKey='';
    const run=async(fn)=>{alert.textContent='';try{await fn();}catch(e){if(e.name!=='AbortError')alert.textContent=e.message||'暂时无法完成，请重试。';}};
    function render(state){
      name.textContent=state.account?(state.profile?.label||'请选择档案'):'未登录';
      bar.dataset.status=state.status;if(playerAccount){playerAccount.textContent=state.profile?.label||'档案与同步';playerAccount.title=messages[state.status];}
      status.textContent=messages[state.status]+(state.queued?`（${state.queued}项）`:'');
      if(state.status==='saved'&&!state.serverConfirmed)status.textContent='同步已就绪';
      const renderKey=JSON.stringify([state.account,state.profiles,state.profileId,state.conflicts.map(c=>[c.moduleId,c.conflict.server?.revision]),sync.recoveryCopies().length,state.connection,state.status==='expired']);
      if(renderKey===renderedKey)return;renderedKey=renderKey;content.replaceChildren();
      if(!state.account){
        if(state.pendingLogout)content.append(el('p','本机已退出账号。联网后会先撤销旧服务器会话，再登录或继续。','mp-notice'));
        content.append(el('p','登录家庭账号后选择学习档案，开始考核并查看自己的最高成绩。'));
        if(!state.available)content.append(button('重新连接学习服务',()=>run(()=>sync.reconnect())));
        {
          const form=el('form'),user=el('input'),pass=el('input');user.name='username';user.autocomplete='username';user.required=true;user.maxLength=80;pass.type='password';pass.name='password';pass.autocomplete='current-password';pass.required=true;
          for(const [text,input]of[['账号',user],['密码',pass]]){const l=el('label',text);l.append(input);form.append(l);}
          const submit=el('button','登录','mp-primary');submit.type='submit';form.append(submit);form.onsubmit=e=>{e.preventDefault();submit.disabled=true;const username=user.value,password=pass.value;pass.value='';run(async()=>{if(!sync.snapshot().available)await sync.refreshSession();await sync.login(username,password);}).finally(()=>submit.disabled=false);};content.append(form);
          content.append(el('p','初始账号由本地操作者通过账号管理命令建立；此页没有默认密码。','mp-notice'));
        }
        return;
      }
      content.append(el('p',`当前账号：${state.account.username||'此前登录的账号（离线副本）'}`));
      if(state.connection==='offline')content.append(el('p','当前使用此前登录的本机档案副本。联网后会先核对会话和服务器版本。','mp-notice'));
      const select=el('select');select.setAttribute('aria-label','选择学习档案');for(const p of state.profiles){const o=el('option',p.label);o.value=p.id;select.append(o);}select.value=state.profileId;select.onchange=()=>run(()=>sync.selectProfile(select.value));const label=el('label','当前学习档案');label.append(select);content.append(label);
      const form=el('form'),input=el('input');input.placeholder='例如：小橙';input.maxLength=40;input.required=true;input.setAttribute('aria-label','新档案昵称');const submit=el('button','新建档案');submit.type='submit';form.append(input,submit);form.onsubmit=e=>{e.preventDefault();submit.disabled=true;run(()=>sync.createProfile(input.value.trim())).finally(()=>submit.disabled=false);};content.append(form);
      const actions=el('div',undefined,'mp-actions');actions.append(button('重试连接 / 同步',()=>run(()=>sync.reconnect())),button('退出账号',()=>run(()=>sync.logout())));content.append(actions);
      content.append(el('p','同一目标、难度可多次考核，成长记录保留最高成绩。','mp-notice'));
      if(state.errorMessage)content.append(el('p',state.errorMessage));
      if(state.conflicts.length){content.append(el('h3','需要你决定的版本'));for(const e of state.conflicts){
        const card=el('section',undefined,'mp-conflict');card.append(el('strong',labels[e.moduleId]||e.moduleId),el('p',`服务器版本 ${e.conflict.server?.revision||0}，本地待同步内容仍保留。选择前两份都会另存为恢复副本。`));
        const detail=el('details');detail.append(el('summary','预览服务器版和本地版'));detail.append(el('pre',JSON.stringify({服务器版:e.conflict.server?.payload,本地版:e.payload},null,2)));card.append(detail);
        const row=el('div',undefined,'mp-actions');row.append(button('使用服务器版',()=>run(async()=>{if(confirm('确认使用服务器版？本地笔记和当前练习会保留在恢复副本中，当前页面将重新载入。'))sync.resolveConflict(e.moduleId,'server');})),button('保留本地版并恢复同步',()=>run(async()=>{if(confirm('确认把本地版作为新版本同步？服务器旧版本和本地版都会保留为恢复副本。'))sync.resolveConflict(e.moduleId,'local');})));card.append(row);content.append(card);
      }}
      content.append(el('h3','旧浏览器记录'));
      const preview=el('div');content.append(preview);
      content.append(button('预览可导入的旧记录',()=>{
        importRecords=sync.legacyPreview();importKey=sync.uuid();preview.replaceChildren();
        preview.append(el('p',`找到 ${importRecords.length} 条 MathPhysics 旧记录。原始记录会保留，导入标为 legacy/unverified，积分为0。`));
        if(!importRecords.length)return;
        const details=el('details');details.open=true;details.append(el('summary','查看键名和内容'),el('pre',JSON.stringify(importRecords,null,2)));preview.append(details);
        const check=el('input');check.type='checkbox';const own=el('label','我确认这些旧记录属于当前档案','mp-inline-check');own.prepend(check);preview.append(own);
        const importButton=button('确认导入旧记录备份（0分）',()=>run(async()=>{if(!check.checked)throw Error('请先确认旧记录属于此档案。');importButton.disabled=true;try{const data=await sync.importLegacy(importRecords,importKey);preview.replaceChildren(el('p','旧记录已由服务器备份为 legacy/unverified。原浏览器记录保持原样，成长积分未增加。'),restoreButton(importRecords,data.import?.id));}finally{importButton.disabled=false;}}),'mp-primary');preview.append(importButton);
      }));
      const imports=el('div');content.append(imports,button('查看此档案已导入的备份',()=>run(async()=>{const data=await sync.legacyImports();imports.replaceChildren();if(!data.imports?.length){imports.append(el('p','此档案尚无已导入旧备份。'));return;}for(const archive of data.imports){const section=el('section',undefined,'mp-conflict'),details=el('details');details.append(el('summary',`预览 ${archive.recordCount} 条记录`),el('pre',JSON.stringify(archive.records,null,2)));section.append(el('strong','旧备份 · legacy/unverified · 0分'),el('p',new Date(archive.createdAt).toLocaleString('zh-CN')),details,restoreButton(archive.records,archive.id));imports.append(section);}})));
      content.append(el('h3','本机恢复副本'));
      const copies=sync.recoveryCopies();if(!copies.length)content.append(el('p','解决冲突或恢复旧练习时，会先在本机保留当前副本。'));
      for(const record of copies.slice(0,20)){const row=el('div',undefined,'mp-actions');row.append(el('span',(labels[record.moduleId]||record.moduleId)+' · '+new Date(record.createdAt).toLocaleString('zh-CN')),button('下载恢复副本',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json;charset=utf-8'})),a=el('a');a.href=url;a.download='MathPhysics-恢复副本.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));content.append(row);}
    }
    function restoreButton(records,id){return button('从此备份恢复未核验练习（0分）',()=>run(async()=>{if(!confirm('确认恢复这份旧练习？当前练习先保留为本机恢复副本，再按当前服务器版本同步。旧备份与原浏览器记录保持原样，正式成绩和积分不变。'))return;sync.restoreLegacy(records,id);}));}
    const unsubscribe=sync.subscribe(render);window.addEventListener('pagehide',unsubscribe,{once:true});
    window.MathPhysicsSyncUI={open:()=>dialog.showModal()};
    window.addEventListener('mathphysics:restore',()=>{if(!document.body.dataset.mpLearning)location.reload();});
    window.addEventListener('mathphysics:scope-change',()=>{if(parent===window&&!document.body.dataset.mpLearning&&!document.body.dataset.mpHost)location.reload();});
  }
  start();
})();
