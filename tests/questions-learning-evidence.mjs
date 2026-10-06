import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sources=['lessons/primary-math/bank.mjs','lessons/primary-math/bank-guides.mjs','lessons/primary-math/curriculum.mjs','lessons/primary-math/curriculum-generators.mjs','lessons/primary-math/unit-guides.mjs','lessons/primary-math/app.mjs','lessons/primary-math/index.html','lessons/primary-math/style.css','lessons/primary-math/practice.css','lessons/question-bank/practice-generators.mjs','lessons/question-bank/practice-catalog.mjs','lessons/question-bank/generators.mjs','lessons/question-bank/teaching.mjs','lessons/question-bank/engine.mjs','lessons/question-bank/app.mjs'];
export function questionSourceHashes(){return Object.fromEntries(sources.map(file=>[file,createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex')]));}
export function attachQuestionBrowserEvidence(manifest,browser){
 const current=JSON.stringify(manifest.sourceHashes)===JSON.stringify(browser.sourceHashes);
 manifest.browser={report:'output/playwright/learning-coverage/questions/report.json',passed:current&&browser.passed,sourceHashesMatch:current,templates:browser.templates.length,fixedQuestions:browser.fixedQuestions.length,units:browser.units.length,pageErrors:browser.pageErrors,serverClosed:browser.serverClosed,layouts:browser.layouts};
 if(current)for(const key of ['fixedQuestions','templates','units'])for(const item of manifest[key]){const match=browser[key].find(row=>row.id===item.id);if(match){item.browserChecks=match.checks;item.screenshots=[match.screenshot,match.promptScreenshot,match.modelScreenshot,match.questionScreenshot,...(match.modelStates||[]).map(s=>s.screenshot)].filter(Boolean);if(match.modelStates)item.modelStates=match.modelStates;item.browserPassed=match.passed;}}
 manifest.passed=manifest.unitPassed&&manifest.browser.passed;return manifest;
}
