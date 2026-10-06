# 按年级题库融合交接

本文记录 2026-09-30 的融合结果，不作为当前操作说明。现已统一题库入口、取消开放设置并补齐教学内容，当前范围与检查见 [题库说明](../question-bank.md) 和 [全量覆盖清单](../learning-coverage/README.md)。原有来源和验收记录保留。

来源：`origin/feat/primary-curriculum-questions-20260930`，固定提交 `a7187a2f86007d23f1a04f3f7b49a04d7a4e591a`。按 [融合方案](plan.md) 在当前工作树实施，保留既有未提交修改；未执行整分支Git合并，未切换分支、提交或部署。来源分支的旧运行报告没有迁入。

## 实际功能

- “数与生活”48题，推荐1—6年级各8题；题库、算式树与课程映射保持来源字节，辅助模型和判分保持来源实现。新增页面使用本地共享主题，宿主内返回发送 `mp-close`，离线返回课堂顶部。
- 几何证明保留24个主题，扩展为48种问法；筛选不匹配时选首个匹配主题，前后题遵循当前筛选，空交集显示提示并禁用导航，合法 `?lesson=` 深链保留。
- JSXGraph六种实验各6个挑战，共36个目标。七巧板两种原轮廓各3档求助条件，共6张挑战卡，保留拼块颜色与编号对比度修复。
- 目录合计64个活动入口；原22项推荐、已有自定义开放列表及刻意空列表保留。新课堂可在老师/家长工作台开启，单年级标签显示为“5年级”等。
- 第五个独立离线HTML接入共享主题内联、npm Python入口、打包脚本与CI产物清单。服务器包显式包含新页所需的两份课程文档；Nginx模板仅允许这两份文档，并为三份primary模块指定JavaScript MIME。

## 构建与验收

```bash
npm run build:primary
npm run standalone:geometry
npm run build:spaceflight
npm run build:playground
npm run build:server -- --release curriculum-integration-20260930-final
npm run package
node --test tests/primary-math.test.mjs tests/geometry.test.mjs tests/catalog.test.mjs tests/playground.test.mjs
```

五个文件位于 `dist/MathPhysics-{Geometry-Proofs,Spaceflight,Playground,Tangram,Primary-Math}.html`。最终服务器包为 `dist/MathPhysics-server-curriculum-integration-20260930-final.tar.gz`，完整静态资源包为 `dist/MathPhysics-offline.zip`。

产品实施自检：相关88项单元测试通过，编辑后的JavaScript/Python语法通过，五页及两包构建成功。包内逐文件哈希、冻结工作树一致性、文档资源、原上游与本地主题保护结果见 [静态检查](implementation-checks.json)。原始服务器包生成后两份旧浏览器测试才完成融合，因此交付使用带 `-final` 的新版本，不覆盖历史包。

独立浏览器验收由GPT-6 luna执行，已通过primary题目与参考年级、三个原数学课堂扩题、宿主设置与返回、平板断点修复，以及五页file://的15项布局和5项交互。报告与截图保存在 `output/playwright/curriculum-integration/`；完整npm回归115项：114通过、1跳过、0失败，以独立测试报告为准。未重跑上一轮63入口全量浏览器巡检。

本机没有Nginx，配置只做静态审阅，未运行`nginx -t`，未访问或修改线上服务。课程来源与版本限制沿用 [课程依据](../primary-math-curriculum.md) 的历史研究记录；参考年级不是官方教材逐册认证，触控模拟不是实体iPad Safari验证。

## 变更追溯

本次文件清单、固定来源与前后SHA-256见 [change-manifest.json](change-manifest.json)。既有文件的编辑前字节保存在 `before-source/`；大型生成物只记录哈希。该基线是本次编辑前工作树，不是HEAD。固定vendor、共享主题与所有既有展示适配器保持当前本地版本。
