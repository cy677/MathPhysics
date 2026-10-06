# 数与生活：练习引擎说明

当前统一课堂及年级分类见[新加坡小学数学分类](singapore-primary-curriculum.md)。原题库入口已合并至“数与生活”；以下48个题型和默认API继续兼容旧配方。

## 兼容练习引擎

课堂入口为 `lessons/primary-math/index.html`，主站统一显示“数与生活”。旧地址 `lessons/question-bank/index.html` 自动跳转到统一课堂的练习区。界面、题干、提示、解析、反馈均为简体中文；新的练习携带年级和知识点范围，旧配方保留原题目及独立难度，不自动转换为大纲年级。

兼容旧配方的生成器有 **48 种题型、9 类知识点、3 档数值难度**；统一课堂另增29种课程模板，合计77种唯一生成模板。旧48种按类别为：整数与运算8种，数感与规律6种，分数9种，小数5种，百分数与比例3种，测量与时间5种，面积与体积5种，统计与可能性3种，生活应用4种。每批可请求1—500题；某个题型的参数空间较小，无法生成足够的不重复题目时会明确报错。

新版练习使用 `practiceVersion:2`，加载原77种生成模板、48道固定应用题和9种补充题型，共134个注册入口。补充仅参考 MathsMentales、MathALÉA 的小学题型；41份下载定义全部有加载映射，同类型复用。原始审查文件与许可证保存在 `vendor/question-sources/`，课堂使用本项目独立编写的中文生成器。来源、固定提交、哈希和去重结果见 [清单](../vendor/question-sources/manifest.json)，可运行 `node scripts/audit_practice_sources.mjs`重新核对。新版批内去重同时比较题干、答案和图示，旧配方仍使用原去重算法。

## 使用

沿用项目原有 HTTP 服务。启动后从主站进入“数与生活”，也可直接访问 `/lessons/primary-math/index.html`；旧题库地址自动跳到同一页面的练习区。源码 ES 模块通过 HTTP 服务运行；`npm run build:primary` 生成的单文件课堂可以离线打开。生成和判题不调用外部服务，不需要模型 API、数据库或 npm 运行时依赖。

首页只有一个“数与生活”入口，支持年级与搜索筛选。历史开放配置不限制入口，原有探索记录继续保留。练习使用独立存储键，不覆盖其他课堂进度。

在页面选择年级、知识点、基础／巩固／提高、题型和数量。复现种子内部保存，不再显示练习名称。每题的提示与解题过程在可关闭弹窗中，一次点击新增一步提示。基础检查直接概念与计算，巩固使用应用题，提高改变所求关系或增加条件；固定题仅在巩固层加载。旧成绩记录和配方兼容保留。

## 生成接口

```js
import {
  generateQuestion, generateWorksheet, validateAnswer,
  exportWorksheet, exportRecipe, importRecipe, listTemplates
} from './lessons/question-bank/engine.mjs';

const sheet = generateWorksheet({
  seed: '周末练习一', difficulty: 2, count: 30,
  topics: ['fractions', 'decimals']
});
const sameQuestion = generateQuestion(sheet.questions[0].templateId, {
  seed: sheet.questions[0].seed, difficulty: sheet.questions[0].difficulty
});
const feedback = validateAnswer(sameQuestion, '3/4');
const recipe = exportRecipe(sheet);
const restored = importRecipe(JSON.stringify(recipe));
const student = exportWorksheet(sheet); // 不含答案、参数、提示和解析
const teacher = exportWorksheet(sheet, {includeAnswers: true});
const templates = listTemplates({topic: 'fractions'});
```

`topics` 与 `templateIds` 可以同时传入，此时取交集。未知分类、空列表、无交集或非法难度都报错，不退回全部题型。配方的题型集合会规范排序；同版本、同配方可复现。单题种子上限 256 字符，批次种子上限 120 字符。随机生成器用于教学变式，不用于密码学。

## 数据结构

内部题目包含 `schemaVersion`、`engineVersion`、`id`、`templateId`、`title`、`topic`、`locale`、`difficulty`、`seed`、`fingerprint`、`params`、`prompt`、`answer`、`intent`、`hints`、`steps`、`commonMistakes`、`explanation`、`visual`、`source`；课程题目另含 `curriculum`。`intent` 说明本题所求，`hints` 为递进线索，`steps` 展示计算与检验，`commonMistakes` 针对本题的误用或易混条件。教学内容在生成后逐模板按实际参数派生，不消耗随机数。参数仅是数据，不能放入动态 JavaScript。

数值答案的 `value` 为约分后的 `{n: "3", d: "4"}`，采用 BigInt 有理数精确比较。比较题使用 `type: "choice"`、候选项及正确选项。答案格式可以要求最简分数或百分号，可以声明单位。普通数值题接受等值的整数、小数、分数和百分数，约分题要求规范的最简分数，百分数题要求 `%`。不接受 `eval`、算式、指数记法、无穷大或含无关文字的输入。

生成配方包含版本、种子、难度、题量与题型 ID；课程配方另含课程版本、年级及知识点 ID。导入会严格选择本地白名单生成器，并重新生成题目；文件中的题干、答案、HTML、代码均不被执行或直接使用。跨生成器版本的配方会拒绝。修改参数逻辑时必须提升 `core.mjs` 的版本。本次仅增补教学字段并更新提示、解析，完整教师 JSON 因此发生变化；题干、参数、答案、图示、指纹与 ID 的兼容性由924个冻结样本检查，旧配方和记录继续复现。

学生版 JSON 不含答案、参数、提示、步骤、常见错误或解析，但保留用于辨识与复现的生成元数据。教师版包含完整题目及4项教学内容。页面支持浏览器打印，不依赖服务端 PDF。

## 文件分工

- `catalog.mjs`：48 个题型的元数据和参考来源。
- `generators.mjs`：纯函数生成算法与中文提示、解析。
- `teaching.mjs`：77种唯一模板的实际参数教学内容；课程内复用模板不重复计数。
- `core.mjs`：确定性随机数、有理数、输入解析与判分。
- `engine.mjs`：统一接口、白名单筛选、批内去重、配方与导出。
- `session.mjs`：计分与本地记录；键名 `mathphysics.question-bank.v1`，不覆盖 `mathphysics.state.v1`。
- `app.mjs`：挂载到统一课堂的练习界面；`index.html` 是旧入口重定向。
- `practice-catalog.mjs`、`practice-generators.mjs`：新版完整注册表、分层问法和9种补充题型。
- `../primary-math/`：49个知识点、29种课程模板、48道固定应用题及统一页面；动手模型代码已删除。

本地记录仅保留当前一组练习及作答，不同步设备，也不上传服务器。生成新练习或导入新配方会替换当前题库练习记录，不影响主站或其他活动数据。配方导出恢复题目，不恢复历史分数。存储禁用或写满时给出提示，仍能练习。

## 命令行

```bash
npm run generate:questions -- --topic fractions --count 50 --difficulty 2 --seed 中文分数练习 --answers --out fractions.json
npm run generate:questions -- --catalog --out catalog.json
npm run generate:questions -- --template integer.add,fraction.add --count 20 --recipe --out recipe.json
npm run test:questions
```

命令行默认输出学生题目，添加 `--answers` 才输出答案与解析。不传 `--out` 时输出到标准输出。错误输入以非零退出码返回。

## 来源与许可边界

MathsMentales 官方说明与活动索引：
- https://mathsmentales.net/about.html
- https://mathsmentales.net/liste-des-exercices.html

已核对的主题参考入口为乘法表 `6ND6`、分数约分 `6NB5`、分数加法 `5NC7`、找零 `6NF1`、常见图形面积 `6MC1`。这些 ID 标明主题参考范围，不表示同一组生成参数或直接翻译；同类扩展会在 `source.reference.note` 中说明。MathsMentales 网站说明其项目为 Apache-2.0。

MathALÉA 当前开发入口为 https://forge.apps.education.fr/coopmaths/mathalea 。已从固定 GitHub 快照保存20份小学题型定义供审查，原文件保留 AGPL-3.0 许可。课堂的中文题目、生成器和判题独立编写，不执行或移植这些上游程序；审查文件、来源映射及哈希见 `vendor/question-sources/manifest.json`。

本次新增的中文生成器、页面、图示、提示与测试均按本仓库 MIT 许可发布。没有引入 Khan 的 NC-SA 旧题内容。将来要直接翻译或移植上游材料，需逐项保存源文件、固定版本、许可证及修改记录，不能只改 `source` 标签后发布。

## 验证

`tests/question-bank.test.mjs` 对每个题型的 3 档难度各抽取 100 个种子，合计 14,400 个题目样本，使用独立算式验算。同时覆盖批次复现、去重、格式校验、导出不泄露解答、导入限制、有限题池耗尽、记录损坏和重复计分。

`tests/question-bank-integration.test.mjs` 检查本地入口白名单、就绪状态、全部旧活动入口及已有开放配置保护。

`tests/questions-learning.test.mjs` 逐项检查48个原生题、77种唯一模板和49个知识点；为全部模板及其年级引用检查3档层次、每档20种种子，合计9,240个教学样本，结果写入 `docs/learning-coverage/questions.json`。另检查924个冻结算法样本及学生版解答隔离。模板 ID 只计一次，各知识点引用关系单列。

浏览器测试独立运行：
```bash
npm ci --ignore-scripts
npx playwright install chromium
npm run build:primary
npm run test:questions:failure
npm run test:questions:browser
npm run test:questions:learning:browser
```

本地与 CI 都运行 `tests/numbers-life-browser.mjs`：检查49知识点×3层次、旧入口跳转、实际作答、计分、导入导出和离线版；Python旧测试入口仅转发该脚本并保留退出码。`test:questions:failure` 实际注入 Node 与真实浏览器断言失败，检查退出码1、浏览器关闭及 HTTP 端口释放；Linux CI另验 `tee` 管道在 `pipefail` 下保留失败状态。

`test:questions:learning:browser` 对86种生成模板、48道固定应用题和49个知识点逐项操作并保存可读局部截图，报告为 `output/playwright/learning-coverage/questions/report.json`。`test:practice`检查新版三层题目与全部134个入口。主功能报告为 `output/playwright/numbers-life-sg/report.json`，失败传播证据为 `output/playwright/numbers-life-failure/propagation.json`。浏览器路径优先尊重 `PLAYWRIGHT_BROWSERS_PATH`；无外传配置时只在本地缓存存在时使用 `.test-deps/browsers`，否则采用 Playwright 默认缓存。可用 `CHROMIUM_EXECUTABLE` 指定已有浏览器。两个 CI 工作流使用明确的 Bash 与失败退出规则，任一断言失败均使任务失败。Chromium 的窄屏与触控模拟不等于真实 iPad/Safari 验收。
