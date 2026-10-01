# 课程融合验收报告

最终 `npm test` 结果为 **115 项：114 通过、0 失败、1 跳过**；跳过项是 Windows 上的 Linux Python 回退测试。完整日志见 [npm-test-final.txt](npm-test-final.txt)，融合前基线为 58 项、57 通过、1 跳过，见 [baseline-npm-test.txt](baseline-npm-test.txt)。

浏览器验收使用隔离的 Chromium context。Primary 的 48 道题分别经算术树独立核算；六个推荐年级各8题，人教、苏教、新加坡参考筛选均完整覆盖48题。分数等值、错误与非法答案、提示、解题步骤、模型滑块/键盘/播放、可访问名称，以及首页自定义和空开放列表保留、手动开放、ready、外层返回和 `mp-close` 均通过。[主课报告](../../output/playwright/curriculum-integration/primary-2026-09-30T12-42-39.421Z/report.json)；断点修复后的768/1024直接页和宿主复验见[平板报告](../../output/playwright/curriculum-integration/primary-layout-2026-09-30T12-45-51.219Z/report.json)。[768截图](../../output/playwright/curriculum-integration/primary-layout-2026-09-30T12-45-51.219Z/primary-tablet-768.png)

几何课堂保留24个主题及48种问题形式；深链、筛选后的题目导航、空结果禁用导航、扩展题答案显示与核对均通过。JSXGraph 六种模式各有六个不同挑战，原有前两目标和三角形可解目标通过。平面七巧板的两种轮廓、三个求助限制、实际拼板判题通过。对应浏览器数据见[三课堂首轮结果](../../output/playwright/curriculum-integration/browser-2026-09-30T12-46-29.880Z/report.json)和[修正后的JSXGraph目标复验](../../output/playwright/curriculum-integration/browser-2026-09-30T12-47-56.457Z/report.json)。

五个实际 `file://` 单文件（Geometry、Spaceflight、JSXGraph、Tangram、Primary）在桌面、768平板和390手机共15个页面视口均无横向溢出；每页一项真实交互通过，无页面错误或外部网络请求。报告和截图在[离线验收目录](../../output/playwright/curriculum-integration/offline-file-2026-09-30T12-52-13.175Z/report.json)。已查看主课平板及五页手机截图；768平板断点收起目录并让模型完整显示，宿主返回控件可见。

最终服务器包 [MathPhysics-server-curriculum-integration-20260930-final.tar.gz](../../dist/MathPhysics-server-curriculum-integration-20260930-final.tar.gz) 与 SHA-256 sidecar 已生成；[实现检查记录](implementation-checks.json)包含最终包与冻结工作树的完整核对。Nginx 模板静态包含课程文档白名单与 `.mjs` MIME 设置。本机没有 Nginx 可执行文件，因此未做 Nginx 运行时解析。浏览器和临时HTTP服务由测试 `finally` 关闭；测试命令均已退出，没有留下持续测试服务。

早期两类浏览器断言错误均已修正并有针对性复验：Primary 桌面隐藏题目下拉框，改用可见题目目录；JSXGraph 旧目标断言改为按整组坐标匹配。保留的首轮诊断报告中仅包含这些测试假设误报，不是产品失败。
