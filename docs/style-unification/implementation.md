# 本次产品实现交接

共享样式为 `src/theme.css`，嵌入标记为 `src/theme.js`。首页、四课堂及第三方展示页使用同一套 `--mp-*` 令牌；航天星空画布保留原场景色，课堂操作固定森林绿。七巧板编号使用单独的深色令牌，原拼块颜色和快照保持不变。

`src/activity-entry.js` 在启动时解析展示入口，保留库存原路径、活动 ID、查询参数和存储契约。Matter 使用 `src/adapters/matter.html`，`base` 保留上游相对 SVG/贴图资源，`src/matter-runner.js` 仅调整渲染属性及画布显示尺寸。固定旧入口通过 `scripts/fixtures/matter-legacy.html` 保留，导入脚本不再把演进中的展示页面复制进 vendor。

三维 Tangram 使用 `src/adapters/tangram.html`，由 `scripts/build_display_adapters.py` 从原快照与模板生成。派生 scene 的 12 处改动局限于展示与路径，并记录在 `src/adapters/generated/edit-ledger.json`；原 `puzzle.js`、`tangram.js`、`three.js` 直接加载。PhET 仅在现有可逆展示构建中添加共享主题引用。

构建命令为 `npm run build:adapters`、`npm run build:phet`、`npm run standalone:geometry`、`npm run build:spaceflight`、`npm run build:playground`。后两项 Playground 构建同时产生 JSXGraph 与平面七巧板两个单文件。服务器构建与离线打包校验实际展示入口，整个 `src` 随包保留。

自检结果见 `implementation-checks.json`：63 个入口、1296 个库存文件哈希、7 个页面的本地运行依赖、12 处 Tangram 派生反向还原、9 个 Python 文件语法及四个单文件无外部运行依赖均通过；10 个修改 JavaScript 文件的 `node --check` 通过。浏览器交互与视觉结果由独立验收报告记录。

`change-manifest.json` 记录本次改动与前置源哈希；`before-source/` 保留编辑前内容，未使用 HEAD 代替当前工作树基线。PhET 整页只保存编辑前哈希。四个离线生成文件未提前捕获基线，已在清单中如实标注。
