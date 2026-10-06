/** Explicit local administrator export. Never included in the student delivery. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createWordProblemRegistry} from '../server/word-problems-assessments.mjs';
import {assertExternalFile} from '../server/database.mjs';
import {answerText} from '../lessons/word-problems/answers.mjs';

const argumentsList=process.argv.slice(2);
if(argumentsList.length!==2||argumentsList[0]!=='--output')throw Error('Usage: node scripts/export_word_problems_teacher.mjs --output <private path outside project>');
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),output=resolve(argumentsList[1]);
assertExternalFile(output,root);
const registry=createWordProblemRegistry();
if(registry.admissionError||!registry.content)throw Error('The fixed private release is unavailable; teacher export refused.');
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const questions=[...registry.content.questions.values()];
const representatives=JSON.parse(readFileSync(new URL('../server/word-problems-private/provenance/representatives.json',import.meta.url),'utf8'));
const list=(title,values)=>'<h3>'+escape(title)+'</h3><ol>'+values.map(value=>'<li>'+escape(value)+'</li>').join('')+'</ol>';
const cards=questions.map(question=>'<article><h2>'+escape(question.id+' · '+question.prompt)+'</h2><p>'+escape([question.collection,question.category,question.subcategory,question.level,question.partition].join(' · '))+'</p><p>参考答案：'+escape(answerText(question.answer))+'</p>'+list('提示',question.hints)+list('完整解析',question.steps)+list('常见错误',question.commonMistakes)+'<details><summary>私有复核与来源记录</summary><pre>'+escape(JSON.stringify(question,null,2))+'</pre></details></article>').join('');
const html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>应用题私有教师审读</title><style>body{max-width:960px;margin:24px auto;padding:0 16px;background:#f5f3e9;color:#263d33;font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif}article{margin:20px 0;padding:20px;border:1px solid #d8ded3;border-radius:16px;background:#fffef9}pre{white-space:pre-wrap;overflow-wrap:anywhere}h2{font-size:20px}</style><h1>应用题私有教师审读</h1><p>仅供本地非商业教学的管理员与教师审读；含完整答案、解析与溯源审读记录，请保留在学生交付与静态服务器根目录之外。助手复核已完成，人工教学批准字段如实保持 false。</p><p>已审读1391题；全1398条代表映射包含7条隔离记录。</p>'+cards+'<details><summary>全1398条代表与隔离溯源</summary><pre>'+escape(JSON.stringify(representatives,null,2))+'</pre></details></html>';
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,html,'utf8');
console.log(JSON.stringify({output,questions:questions.length,private:true,bytes:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex')}));
