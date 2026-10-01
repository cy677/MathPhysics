#!/usr/bin/env node
import {writeFile} from 'node:fs/promises';
import {generateWorksheet,exportWorksheet,exportRecipe,TEMPLATES} from '../lessons/question-bank/engine.mjs';
const help='中文参数化题库\n用法：node scripts/generate_questions.mjs [--seed 练习A] [--count 20] [--difficulty 1] [--topic fractions] [--template fraction.add] [--answers] [--recipe] [--catalog] [--out questions.json]\n不加 --answers 默认导出学生题目；--recipe 仅导出复现配方。';
try{
 const args=process.argv.slice(2),config={},flags=new Set();let out;
 for(let i=0;i<args.length;i++){
  const key=args[i];if(['--help','--answers','--recipe','--catalog'].includes(key)){flags.add(key);continue;}
  if(!['--seed','--count','--difficulty','--topic','--template','--out'].includes(key))throw Error(`未知参数：${key}`);
  const value=args[++i];if(value===undefined||value.startsWith('--'))throw Error(`${key} 缺少值`);
  if(key==='--out')out=value;else if(key==='--topic')config.topics=value.split(',');else if(key==='--template')config.templateIds=value.split(',');else config[key.slice(2)]=['--count','--difficulty'].includes(key)?Number(value):value;
 }
 if(flags.has('--help'))console.log(help);
 else{const data=flags.has('--catalog')?TEMPLATES:flags.has('--recipe')?exportRecipe(generateWorksheet(config)):exportWorksheet(generateWorksheet(config),{includeAnswers:flags.has('--answers')});const text=JSON.stringify(data,null,2)+'\n';if(out){await writeFile(out,text,'utf8');console.error(`已写入 ${out}`);}else process.stdout.write(text);}
}catch(error){console.error(`生成失败：${error.message}`);process.exitCode=1;}
