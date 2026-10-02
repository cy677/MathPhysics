async (page) => {
  await page.waitForSelector('[data-launch="primary-math"]');
  const result = await page.evaluate(async () => {
    const engine = await import('./lessons/question-bank/engine.mjs');
    const session = await import('./lessons/question-bank/session.mjs');
    const sheet = engine.generateWorksheet({seed:'兼容记录', difficulty:2, count:3, templateIds:['integer.add']});
    const first = sheet.questions[0];
    const attempt = session.checkAttempt(first, null, engine.answerText(first.answer)).attempt;
    session.saveSession(localStorage, sheet, {[first.id]:attempt});
    localStorage.setItem('mathphysics.state.v1', JSON.stringify({schemaVersion:1, openIds:[], visited:{'area-builder':123456789,'geometry-proofs':987654321,spaceflight:246810121},teacherPreview:true}));
    localStorage.setItem('mathphysics.progress.v1.geometry-proofs', JSON.stringify({schemaVersion:1,completed:{'rectangle/0':123456789},checkpoint:null}));
    localStorage.setItem('mathphysics.progress.v1.primary-math', JSON.stringify({schemaVersion:1,completed:{'pm-01':123456789},checkpoint:null}));
    localStorage.setItem('meow.deploy-preservation-check','sample-record-20261001T113119Z');
    return {oldRelease:(await (await fetch('BUILD.json',{cache:'no-store'})).json()).releaseId,recipe:engine.exportRecipe(sheet),questionIds:sheet.questions.map(q=>q.id),firstAnswer:engine.answerText(first.answer),firstAttempt:attempt,savedSession:JSON.parse(localStorage.getItem('mathphysics.question-bank.v1'))};
  });
  await page.reload();
  await page.waitForSelector('[data-launch="primary-math"]');
  return {...result, oldVersionLoadedWithFixture:true, fixtureScope:'Independent test browser only'};
}
