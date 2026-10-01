# MathPhysics 前端风格统一验收

日期：2026-09-30。`npm test` 通过：58 项，57 通过、1 项平台条件跳过、0 失败；改动前基线为 57 项，56 通过、1 跳过。最终输出见[单测记录](unit-tests-final-2026-09-30.txt)。浏览器使用隔离的 Playwright Chromium context，站点通过 `/MathPhysics/` 子路径提供。

首页、教师家长工作台、几何证明、航天课堂、JSXGraph、平面七巧板、Matter、原 Tangram、PhET 均纳入实际浏览器覆盖。63 个入口直接启动全部就绪；宿主逐个打开 63 个 iframe 并成功返回。巡检包含 Matter 48 个示例和 PhET 4 模块共 13 个屏幕；入口数据、资源及页面异常记录见[63 入口报告](../../output/playwright/style-unification/entry-sweep-2026-09-30T11-48-13.816Z/report.json)。页面矩阵对首页、几何证明、航天、JSXGraph、平面 Tangram、Matter 在桌面、平板、手机共生成 18 张截图，见[核心复验目录](../../output/playwright/style-unification/core-recheck-2026-09-30T11-36-43.161Z/)；首页和宿主交互也在其中。

核心复验发现两块 Tangram 编号对比度不足，已修复。七个 SVG 编号和七个选块按钮在三种视口的最终实测对比度均不低于 4.75:1，按钮高度为 44 px；选块、旋转、提示操作通过。Matter 手机端实际拖动选中 body 51，屏幕 24 px 移动对应模拟坐标 51.61，按 canvas 缩放预期为 51.34，抓取对象保持不变。3D Tangram 有效 `t=` 快照、canvas 和开始/返回操作通过。JSXGraph、Matter、3D Tangram、PhET 宿主 iframe 在平板和手机的 8 项检查均无内部横向溢出，主要控制可达。详细数值见[最终适配器复验](../../output/playwright/style-unification/adapter-recheck-2026-09-30T12-02-42.454Z/report.json)。我实际查看了其中的[平面七巧板手机图](../../output/playwright/style-unification/adapter-recheck-2026-09-30T12-02-42.454Z/tangram-flat-mobile.png)、[3D Tangram 手机图](../../output/playwright/style-unification/adapter-recheck-2026-09-30T12-02-42.454Z/tangram-3d-mobile.png)、[Matter 手机图](../../output/playwright/style-unification/adapter-recheck-2026-09-30T12-02-42.454Z/matter-stack-mobile-drag.png)和[JSXGraph 平板图](../../output/playwright/style-unification/adapter-recheck-2026-09-30T11-56-36.546Z/host-jsxgraph-playground-tablet.png)：控件和标签未见裁切，画布与浅色主题协调。

四个独立 HTML 均在临时副本内重建并以真实 `file://` 打开。12 张三视口截图均无横向溢出或页面错误；各页 `__mpReady` 成功、没有外链运行时脚本/样式或外网请求，并完成一项实际交互。文件、截图和 JSON 见[离线验收目录](../../output/playwright/style-unification/offline-file-2026-09-30T11-59-22.647Z/)；生成的四个 HTML 保留在 `workspace/dist/`，临时源码副本已删除。

两份早期报告保留了验收中发现的问题：入口巡检唯一失败来自测试错误查找 Matter 鼠标约束，已改为查找 `label === 'Mouse Constraint'` 的约束及 `bodyB`；针对性复验确认实际抓取和坐标映射通过，没有重跑完整 63 项巡检。核心复验的 Tangram SVG 对比度曾读取 `fill="var(...)"` 原字符串；检查器已改为读取 computed fill，当前值由后续复验确认。PhET 手机竖屏可加载且无横向溢出，但其上游场景整体缩放后偏小，建议平板或横屏；未重排内部场景。未覆盖真实 iOS/Safari 设备。

复跑脚本为 `tests/style-unification-core.mjs`、`tests/style-unification-entries.mjs`、`tests/style-unification-adapter-recheck.mjs`、`tests/style-unification-offline.mjs` 和 `tests/phet-theme.test.mjs`。浏览器由脚本关闭，HTTP 探针在 `finally` 中关闭；巡检端口 `54750` 已确认无监听。所有新报告和截图均位于 `output/playwright/style-unification/`。
