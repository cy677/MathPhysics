/* Presentation and screen navigation only. Scientific models remain owned by PhET. */
(() => {
  'use strict';
  const source = document.currentScript.src;
  const asset = name => new URL('assets/' + name, source).href;
  const id = location.pathname.split('/').at(-1).replace(/\.html$/, '');
  const experiences = {
    'vector-addition': {
      zone: '箭头港口', title: '把方向接起来，发现新的路线。',
      intro: '一支箭头，一段路。拖动、转向、连接，看看最后会到哪里。',
      art: 'workbench/navigation-harbor.png', note: '合箭头表示最终位移，其长度不一定等于走过的总路程。',
      screens: [
        ['一维向量', '沿一条直线出发', '向左还是向右？把箭头接起来，比较最后的方向。', '把右侧的箭头拖进网格，再拖动箭头尖改变长度。'],
        ['二维向量', '发现平面里的方向', '先向右，再向上。找到起点直达终点的那支箭头。', '两箭头首尾相接，把合箭头尾端移到第一段起点，再观察终点。'],
        ['实验', '试试不同的走法', '用两组箭头对照，看看不同路线能否到达同一终点。', '两组箭头从同一起点首尾相接，再比较合向量与分量。'],
        ['等式', '让方向变成算式', '选择加法、减法或闭合等式，观察结果箭头。', '先选等式，再调系数；c（或f）由当前等式决定，并非始终是相加的结果。']
      ]
    },
    'states-of-matter-basics': {
      zone: '微观天地', title: '温度变一变，观察粒子怎样运动。',
      intro: '走近看不见的微小世界，观察固体、液体和气体里的粒子。',
      art: 'expansion/menus/states-of-matter-basics-0.png', note: '先看物质与温标；这是定性模型，没有模拟相变潜热。',
      screens: [
        ['状态', '看见三种物态', '加热或冷却，看看粒子的排列与运动有什么不同。', '选一种物质，比较固体、液体、气体；拖动冷热滑块观察变化。'],
        ['相变', '探索温度与压力', '压一压盖子，加一点粒子，发现容器里的变化。', '每次只操作一个控制，同时看温度与压力；压盖和加粒子也可能改变温度。']
      ]
    },
    'build-a-molecule': {
      zone: '微观天地', title: '小小原子，搭出大大发现。',
      intro: '把原子从材料盒里取出来，靠近、连接，认识身边的分子。',
      art: 'expansion/menus/build-a-molecule-0.png', note: '这是结构搭建模型，拼接成功不等于现实中会自动反应。',
      screens: [
        ['单个分子', '搭出第一个分子', '从水分子开始，搭好后放进右侧的收集框。', '从盒中拖出两个 H 和一个 O，靠近组成水分子，再拖进对应收集框。'],
        ['多个分子', '完成你的分子收藏', '数一数原子，按目标搭建，看看能收集多少个分子。', '先读右侧目标和数量，再搭建分子并拖进对应的收集框。'],
        ['自由探索', '打开原子的更多可能', '换一盒原子，试试新的组合，还能查看立体结构。', '翻页更换原子材料，连接后查看名称、化学式与立体结构。']
      ]
    }
  };
  const experience = experiences[id];
  if (!experience) return;
  let timer, observer, detach = () => {};
  let attempts = 0;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  const styleURL = new URL('workbench.css', source); styleURL.search = new URL(source).search;
  style.href = styleURL; document.head.append(style);

  function attach() {
    const sim = window.phet?.joist?.sim || window.phet?.sim;
    if (document.documentElement.dataset.learningGuide !== 'ready' || !sim) {
      if (++attempts < 600) timer = setTimeout(attach, 100);
      return;
    }
    const screens = sim.simScreens || sim.screens;
    const selection = sim.screenProperty || sim.selectedScreenProperty || sim.screenIndexProperty;
    const display = sim.display?.domElement || sim.domElement;
    if (!display || !selection || screens.length !== experience.screens.length) return;
    // The native display now has a header above it. Use its bounding rectangle
    // for pointer coordinates instead of assuming it starts at the window origin.
    sim.display._assumeFullWindow = false;
    if (sim.display._input) sim.display._input.assumeFullWindow = false;
    const standalone = Boolean(document.getElementById('mp-science-viewport'));
    const canvas = document.createElement('div'); canvas.className = 'wb-canvas';
    document.body.classList.add('mp-workbench-page');
    document.body.dataset.workbench = id;
    let mount = document.getElementById('mp-science-viewport');
    if (!standalone) {
      mount = document.createElement('main'); mount.id = 'mp-workbench-stage';
      mount.setAttribute('aria-label', '科学模拟操作区');
      document.body.append(mount);
      const resize = sim.resize;
      sim.resize = function () {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 1 && rect.height > 1) return resize.call(this, Math.round(rect.width), Math.round(rect.height));
      };
    }
    mount.append(canvas); canvas.append(display);
    const chrome = document.createElement('section');
    chrome.id = 'mp-workbench'; chrome.setAttribute('aria-label', experience.zone + '实验导航');
    chrome.innerHTML = `<header class="wb-bar"><button class="wb-overview" type="button">实验总览</button><nav class="wb-tabs" aria-label="切换实验">${experience.screens.map((screen, index) => `<button type="button" data-screen="${index}" aria-pressed="false"><span>${String(index + 1).padStart(2, '0')}</span>${screen[0]}</button>`).join('')}</nav></header>
      <div class="wb-viewtools" aria-label="画布显示"><button type="button" data-zoom="fit" aria-pressed="true">适合屏幕</button><button type="button" data-zoom="large" aria-pressed="false">放大操作</button><button type="button" data-pan hidden>查看右侧</button></div>
      <section class="wb-home" aria-label="选择一个实验"><div class="wb-intro"><div class="wb-copy"><p class="wb-kicker">${experience.zone}</p><h1>${experience.title}</h1></div><img class="wb-art" src="${asset(experience.art)}" alt="" /></div><div class="wb-cards">${experience.screens.map((screen, index) => `<button class="wb-card" data-screen="${index}" type="button"><span class="wb-card-top"><span class="wb-number">${String(index + 1).padStart(2, '0')}</span><span class="wb-level">${screen[0]}</span></span><strong>${screen[1]}</strong><span class="wb-card-action">开始探索</span></button>`).join('')}</div></section>`;
    document.body.append(chrome);
    const home = chrome.querySelector('.wb-home');
    const tabs = [...chrome.querySelectorAll('.wb-tabs button')];
    const overview = chrome.querySelector('.wb-overview');
    const currentIndex = () => sim.screenProperty || sim.selectedScreenProperty ? screens.indexOf(selection.value) : selection.value;
    const atHome = () => sim.showHomeScreenProperty?.value === true || currentIndex() < 0;
    const sync = () => {
      const index = currentIndex(), isHome = atHome();
      home.hidden = !isHome;
      chrome.dataset.home = String(isHome);
      document.body.dataset.workbenchActive = String(!isHome);
      overview.setAttribute('aria-pressed', String(isHome));
      tabs.forEach((button, i) => button.setAttribute('aria-pressed', String(!isHome && i === index)));
      // Hide the covered native home from keyboard navigation; restore it on entering an experiment.
      mount.inert = isHome;
      mount.setAttribute('aria-hidden', String(isHome));
      document.documentElement.dataset.workbenchScreen = isHome ? 'home' : String(index);
    };
    const activate = target => {
      const button = target.closest('button');
      if (!button || !chrome.contains(button)) return;
      if (button.hasAttribute('data-zoom')) {
        const large = button.dataset.zoom === 'large';
        document.body.classList.toggle('wb-magnified', large);
        chrome.querySelectorAll('[data-zoom]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
        chrome.querySelector('[data-pan]').hidden = !large;
        chrome.querySelector('[data-pan]').textContent = '查看右侧';
        mount.scrollTo(0, 0); sim.resizeToWindow(); return;
      }
      if (button.hasAttribute('data-pan')) {
        const right = mount.scrollLeft < (mount.scrollWidth-mount.clientWidth)/2;
        mount.scrollTo({left:right ? mount.scrollWidth-mount.clientWidth : 0,top:0});
        button.textContent = right ? '查看左侧' : '查看右侧'; return;
      }
      if (button === overview) {
        if (sim.showHomeScreenProperty) sim.showHomeScreenProperty.value = true;
        else if (sim.homeScreen) selection.value = sim.homeScreen;
        sync();
        return;
      }
      if (!button.hasAttribute('data-screen')) return;
      const index = Number(button.dataset.screen);
      const fromHome = atHome();
      selection.value = sim.screenProperty || sim.selectedScreenProperty ? screens[index] : index;
      if (sim.showHomeScreenProperty) sim.showHomeScreenProperty.value = false;
      sync();
      if (fromHome) tabs[index].focus({ preventScroll: true });
    };
    // Legacy PhET forwards window input into its canvas and cancels HTML
    // clicks. Keep navigation gestures in HTML, just as the learning panel does.
    const events = new AbortController(), options = {capture:true, signal:events.signal};
    const pointers = new Map(), touches = new Set(); let mouseStarted = false;
    window.addEventListener('pointerdown', event => {
      if (!chrome.contains(event.target)) return;
      pointers.set(event.pointerId, {target:event.target.closest('button'), x:event.clientX, y:event.clientY});
      event.stopImmediatePropagation();
    }, options);
    window.addEventListener('pointerup', event => {
      const start = pointers.get(event.pointerId); if (!start) return;
      pointers.delete(event.pointerId); event.stopImmediatePropagation();
      if (start.target && start.target === event.target.closest('button') && Math.hypot(event.clientX-start.x,event.clientY-start.y)<12) {
        event.preventDefault(); activate(start.target);
      }
    }, options);
    window.addEventListener('pointercancel', event => pointers.delete(event.pointerId), options);
    window.addEventListener('mousedown', event => { mouseStarted=chrome.contains(event.target); if(mouseStarted)event.stopImmediatePropagation(); }, options);
    window.addEventListener('mouseup', event => { if(mouseStarted)event.stopImmediatePropagation(); mouseStarted=false; }, options);
    window.addEventListener('touchstart', event => { if(!chrome.contains(event.target))return; for(const touch of event.changedTouches)touches.add(touch.identifier);event.stopImmediatePropagation(); }, options);
    window.addEventListener('touchend', event => { let handled=false;for(const touch of event.changedTouches)handled=touches.delete(touch.identifier)||handled;if(handled)event.stopImmediatePropagation(); }, options);
    window.addEventListener('click', event => { if(!chrome.contains(event.target))return;event.stopImmediatePropagation();event.preventDefault();if(event.detail===0)activate(event.target); }, options);
    window.addEventListener('keydown', event => { if(!chrome.contains(event.target))return;event.stopImmediatePropagation();if((event.key==='Enter'||event.key===' ')&&event.target.closest('button')){event.preventDefault();activate(event.target);} }, options);
    selection.lazyLink(sync); sim.showHomeScreenProperty?.lazyLink(sync);
    observer = new ResizeObserver(() => sim.resizeToWindow()); observer.observe(canvas);
    detach = () => { selection.unlink(sync); sim.showHomeScreenProperty?.unlink(sync); observer.disconnect(); events.abort(); };
    sync(); sim.resizeToWindow();
    document.documentElement.dataset.workbenchReady = 'true';
  }
  attach();
  window.addEventListener('pagehide', () => { clearTimeout(timer); detach(); }, {once:true});
})();
