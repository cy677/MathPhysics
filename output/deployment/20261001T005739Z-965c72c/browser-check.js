async (page) => {
  const report = {passed: false, url: page.url(), releaseId: '20261001T005739Z-965c72c', activities: [], errors: [], failedResources: []};
  const check = (value, label) => { if (!value) throw new Error(label); };
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/mathphysics/') && response.status() >= 400) report.failedResources.push({url: response.url(), status: response.status()});
  });
  const storage = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])));
  const state = JSON.parse(storage['mathphysics.state.v1']);
  check(state.visited['area-builder'] === 123456789 && state.visited['geometry-proofs'] === 987654321 && state.visited.spaceflight === 246810121, 'Old exploration records were changed');
  check(state.openIds.length === 0 && state.teacherPreview === true, 'Legacy preferences were changed');
  check(storage['meow.deploy-preservation-check'] === 'sample-record-20261001', 'Other application storage was changed');
  check(JSON.parse(storage['mathphysics.progress.v1.geometry-proofs']).completed['rectangle/0'] === 123456789, 'Geometry progress was changed');
  report.oldExplorationRecordsPreserved = true;
  report.oldGeometryProgressPreserved = true;
  report.unrelatedStoragePreserved = true;
  const build = await page.evaluate(async () => (await fetch('BUILD.json', {cache: 'no-store'})).json());
  check(build.releaseId === report.releaseId, 'Unexpected public release');
  report.sourceCommit = build.sourceCommit;
  report.registeredActivities = build.activityCount;
  report.visibleActivities = await page.getByRole('article').count();

  let questionFrame = page.frames().find(frame => frame.url().includes('/lessons/question-bank/'));
  check(questionFrame, 'Question bank iframe is absent');
  await questionFrame.waitForFunction(() => window.__mpReady === true);
  check(await questionFrame.getByRole('article').count() === 20, 'Initial worksheet did not contain 20 questions');
  await questionFrame.getByRole('combobox', {name: '题型', exact: true}).selectOption({label: '整数加法'});
  await questionFrame.getByRole('spinbutton', {name: '题目数量', exact: true}).fill('3');
  await questionFrame.getByRole('textbox', {name: '练习名称', exact: true}).fill('上线验收');
  await questionFrame.getByRole('button', {name: '生成练习', exact: true}).click();
  const first = questionFrame.getByRole('article').filter({hasText: '第 1 题'});
  check(await first.count() === 1, 'First question is ambiguous');
  const prompt = await first.getByRole('heading', {level: 3}).textContent();
  const operands = prompt.match(/(\d+)\s*[+＋]\s*(\d+)/);
  check(operands, 'Addition prompt was not rendered');
  await first.getByRole('textbox', {name: '你的答案', exact: true}).fill(String(Number(operands[1]) + Number(operands[2])));
  await first.getByRole('button', {name: '检查答案', exact: true}).click();
  check((await first.getByRole('status').textContent()).includes('答对了'), 'Answer was not accepted');
  const savedWorksheet = await questionFrame.evaluate(() => localStorage.getItem('mathphysics.question-bank.v1'));
  check(savedWorksheet, 'Worksheet was not saved');
  await page.reload();
  await page.waitForFunction(() => document.getElementById('loading').hidden, null, {timeout: 60000});
  questionFrame = page.frames().find(frame => frame.url().includes('/lessons/question-bank/'));
  await questionFrame.waitForFunction(() => window.__mpReady === true);
  check(await questionFrame.getByRole('article').count() === 3, 'Saved question count was not restored');
  check(await questionFrame.evaluate(() => localStorage.getItem('mathphysics.question-bank.v1')) === savedWorksheet, 'Saved worksheet or answers changed after refresh');
  check((await questionFrame.getByRole('article').filter({hasText: '第 1 题'}).getByRole('status').textContent()).includes('答对了'), 'Solved question was not restored');
  await page.screenshot({path: 'C:/Users/cheng/Desktop/MathPhysics/output/playwright/mathphysics-live-question-bank-20261001.png'});
  report.questionBank = {loaded: true, generatedQuestions: 3, answerCheckPassed: true, refreshRestoresWorksheetAndAnswers: true};
  await page.getByRole('button', {name: '← 返回小岛', exact: true}).click();

  const open = async title => {
    const card = page.getByRole('article').filter({has: page.getByRole('heading', {name: title, exact: true})});
    check(await card.count() === 1, 'Activity card is ambiguous: ' + title);
    await card.getByRole('button', {name: '进入探索 ↗', exact: true}).click();
    await page.waitForFunction(() => document.getElementById('loading').hidden, null, {timeout: 60000});
    return page.frames().find(frame => frame !== page.mainFrame());
  };
  const geometry = await open('看见公式');
  const geometryStatus = geometry.getByRole('status').filter({hasText: '已完成'});
  check(await geometryStatus.count() === 1, 'Geometry save status is ambiguous');
  const progress = await geometryStatus.textContent();
  check(progress.includes('已完成 1 / 48'), 'Old completed geometry lesson was not restored');
  report.geometryCompletionRestored = true;
  await page.getByRole('button', {name: '← 返回小岛', exact: true}).click();
  const primary = await open('数与生活');
  check(await primary.evaluate(() => window.__mpReady === true), 'Primary math did not load');
  check(await primary.getByRole('img').count() > 0, 'Primary math model was not rendered');
  report.primaryMathLoaded = true;
  await page.getByRole('button', {name: '← 返回小岛', exact: true}).click();
  for (const [id, title, screens] of [
    ['fractions-intro', '分数拼拼乐', 3], ['fraction-matcher', '分数找朋友', 2], ['balancing-act', '跷跷板平衡', 3],
    ['circuit-construction-kit-dc', '点亮小灯泡', 2], ['states-of-matter-basics', '冷热变变变', 2], ['build-a-molecule', '分子搭建工坊', 3]
  ]) {
    const frame = await open(title);
    await frame.waitForFunction(() => document.documentElement.dataset.expansionArt === 'ready', null, {timeout: 60000});
    const rendered = await frame.evaluate(() => {
      const sim = window.phet?.joist?.sim || window.phet?.sim;
      return {screens: (sim.simScreens || sim.screens).length, artReady: document.documentElement.dataset.expansionArt === 'ready', icons: window.__mpExpansionArt.icons.length};
    });
    check(rendered.screens === screens && rendered.artReady && rendered.icons >= screens, 'New artwork or screens are missing: ' + id);
    report.activities.push({id, title, ...rendered, loaded: true});
    if (id === 'circuit-construction-kit-dc') await page.screenshot({path: 'C:/Users/cheng/Desktop/MathPhysics/output/playwright/mathphysics-live-phet-20261001.png'});
    await page.getByRole('button', {name: '← 返回小岛', exact: true}).click();
  }
  await page.setViewportSize({width: 390, height: 844});
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile homepage overflows');
  await page.screenshot({path: 'C:/Users/cheng/Desktop/MathPhysics/output/playwright/mathphysics-live-mobile-20261001.png'});
  report.mobileWidth = 390;
  await page.setViewportSize({width: 1280, height: 900});
  await page.screenshot({path: 'C:/Users/cheng/Desktop/MathPhysics/output/playwright/mathphysics-live-home-20261001.png', fullPage: true});
  const finalStorage = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])));
  check(finalStorage['meow.deploy-preservation-check'] === storage['meow.deploy-preservation-check'], 'Other storage changed during classroom use');
  check(JSON.parse(finalStorage['mathphysics.progress.v1.geometry-proofs']).completed['rectangle/0'] === 123456789, 'Geometry progress changed during classroom use');
  check(!report.errors.length && !report.failedResources.length, JSON.stringify({errors: report.errors, resources: report.failedResources}));
  report.passed = true;
  return report;
}
