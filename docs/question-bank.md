# 中文参数化题库

## 本次交付

入口为 `lessons/question-bank/index.html`，主站增加“中文题库”分类与“中文题库工坊”活动。所有原有互动课程保持原样。界面、题干、提示、解析、反馈均为简体中文，不做教材映射，也不把难度当作教材年级。主站的 `[1,2,3,4,5,6]` 仅用于入口可见范围。

本版有 **48 个独立实现的参数化题型、9 类知识点、3 档数值难度**。整数与运算 8 个，数感与规律 6 个，分数 9 个，小数 5 个，百分数与比例 3 个，测量与时间 5 个，面积与体积 5 个，统计与可能性 3 个，生活应用 4 个。每批可请求 1—500 题；某个题型的参数空间可能较小，无法生成足够的不重复题目时会明确报错，不会用重复题补足。

这里的融合是知识点组织与统一生成接口的融合：参考 MathsMentales 的基础技能分类，补充 MathALÉA 方向的进阶主题。**没有批量导入这两个项目的题目或执行其代码；这 48 个生成器不是对上游完整题库的移植。** 未进行与所有其他分支题目的语义去重。当前批内去重按中文题干、答案类型和单位完成；跨批复习允许出现相同题目。

## 使用

沿用项目原有 HTTP 服务。启动后从主站进入中文题库，也可直接访问 `/lessons/question-bank/index.html`。不要双击 HTML；ES 模块需要 HTTP 服务。该模块的生成和判题不调用外部服务，不需要模型 API、数据库或 npm 运行时依赖。

首页的“中文题库”主题可直接进入工坊，也支持年级与搜索筛选。所有活动沿用当前首页的直接访问方式；历史开放配置不限制入口，原有探索记录继续保留。题库使用独立存储键，不覆盖其他课堂进度。

在页面选择知识点、题型、难度、数量和练习名称后生成练习。练习名称作为复现种子。每题可以判分、逐步查看提示或查看解题过程。首次独立答对、已经答对、查看答案分别统计，重复提交不会加分。先提示再答对、订正答对、看过答案后答对均不算首次独立答对。首次独立答对后再复习解析，不会抹掉这次成绩。

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

内部题目包含 `schemaVersion`、`engineVersion`、`id`、`templateId`、`title`、`topic`、`locale`、`difficulty`、`seed`、`fingerprint`、`params`、`prompt`、`answer`、`hints`、`explanation`、`visual`、`source`。参数仅是数据，不能放入动态 JavaScript。

数值答案的 `value` 为约分后的 `{n: "3", d: "4"}`，采用 BigInt 有理数精确比较。比较题使用 `type: "choice"`、候选项及正确选项。答案格式可以要求最简分数或百分号，可以声明单位。普通数值题接受等值的整数、小数、分数和百分数，约分题要求规范的最简分数，百分数题要求 `%`。不接受 `eval`、算式、指数记法、无穷大或含无关文字的输入。

生成配方只包含版本、种子、难度、题量与题型 ID。导入会严格选择本地白名单生成器，并重新生成题目；文件中的题干、答案、HTML、代码均不被执行或直接使用。不是上游 JSON/YAML 通用执行器。跨生成器版本的配方会拒绝，以防题目悄悄变化。修改参数逻辑时必须提升 `core.mjs` 的版本。

学生版 JSON 不含答案、参数、提示和解析，但保留用于辨识与复现的生成元数据。这是开放教学题库，不能作为具有保密答案要求的考试系统；算法和种子可以重建答案。教师版包含完整题目和解答。页面支持浏览器打印，不依赖服务端 PDF。

## 文件分工

- `catalog.mjs`：48 个题型的元数据和参考来源。
- `generators.mjs`：纯函数生成算法与中文提示、解析。
- `core.mjs`：确定性随机数、有理数、输入解析与判分。
- `engine.mjs`：统一接口、白名单筛选、批内去重、配方与导出。
- `session.mjs`：计分与本地记录；键名 `mathphysics.question-bank.v1`，不覆盖 `mathphysics.state.v1`。
- `app.mjs`、`index.html`、`style.css`：独立练习页，可在主站 iframe 中运行。

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

MathALÉA 当前开发入口为 https://forge.apps.education.fr/coopmaths/mathalea 。本版只参考进阶主题组织，**未导入其 AGPL 程序、原题文本、图像或判分器**，也不声称当前代码可以执行原始 MathALÉA 题目。

本次新增的中文生成器、页面、图示、提示与测试均按本仓库 MIT 许可发布。没有引入 Khan 的 NC-SA 旧题内容。将来要直接翻译或移植上游材料，需逐项保存源文件、固定版本、许可证及修改记录，不能只改 `source` 标签后发布。

## 验证

`tests/question-bank.test.mjs` 对每个题型的 3 档难度各抽取 100 个种子，合计 14,400 个题目样本，使用独立算式验算。同时覆盖批次复现、去重、格式校验、导出不泄露解答、导入限制、有限题池耗尽、记录损坏和重复计分。

`tests/question-bank-integration.test.mjs` 检查本地入口白名单、就绪状态、全部旧活动入口及已有开放配置保护。

融合后的页面通过 `src/theme.css` 与 `src/theme.js` 共用奶油白、森林绿和暖黄色主题；题目图示使用同一组颜色令牌。首页有独立练习册图示，嵌入时收起重复导航。生成器版本、题型 ID 和源码来源集中在本说明及导出数据中，练习页面保留题干、提示与解答。

浏览器测试独立运行：
```bash
python -m pip install playwright==1.56.0
python -m playwright install chromium
npm run test:questions:browser
```

可通过 `CHROMIUM_EXECUTABLE` 指定本地 Chromium；`QUESTION_BANK_SCREENSHOT` 可保存验收截图。分支 CI 运行全仓库 Node 测试与浏览器测试。物理 iPad/Safari 真机尚需另行验收，不把 Chromium 的窄屏检查等同于真机测试。
