# MathPhysics 全量测试报告

测试日期：2026-09-30。测试对象为当前工作区，包含原有未提交修改。

应用功能、数学计算、离线资源、构建与打包检查均通过：42 项单元测试和 283 条浏览器检查记录没有失败。发现 **1 个尚未修复的 Windows 命令入口兼容问题**，因此整体结论为“测试完成，有待修复事项”。

## 执行结果

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 单元测试 | 42/42 通过；无跳过、取消或失败 | [日志](unit-tests.txt) |
| 全目录离线浏览器冒烟 | 59/59；覆盖 57 个活动、宿主控制和平板导航 | [报告](test-report.json) |
| 课堂综合验收 | 74/74；真实 HTTP、57 个活动、配置迁移、交互、4 个 file:// 独立课堂 | [报告](classroom-browser-report.json) |
| 几何课堂专项 | 29/29；24 题、步骤、滑块边界、答案、反馈失效、布局与独立 HTML | [报告](geometry-browser-report.json) |
| 航天课堂专项 | 93/93；62 个阶段、8 个实验、7 种结构图、对接、播放、笔记与布局 | [报告](spaceflight-browser-report.json) |
| 独立 HTML 内存载入 | 10/10；六个动态几何实验、七巧板和布局 | [报告](classroom-inline-report.json) |
| PhET 原版/改编版回归 | 7/7；13 个实验页面、25 个模型指纹、32 组情景，含六级共 36 道面积随机题 | [报告](phet-runtime-report.json) |
| 首页补充交互 | 11/11；28 组主题/年级组合、搜索、配置导入导出及非法输入、预览、深链接、重置和 390–1440 px 布局 | [报告](host-extended-report.json) |
| 构建与交付一致性 | 13/13；4 个构建入口、4 个现有独立 HTML、4 个 PhET 页面及修改账本 | [报告](build-report.json) |
| 脚本语法 | 27 个 JavaScript 文件及 9 个 Python 文件通过 | [JavaScript](javascript-syntax-report.json) · [Python](python-syntax-report.json) |
| 重建离线 ZIP | 7/7；1,650 个文件 CRC 与字节校验通过；57 个入口、1,296 个清单资源和4个改编 PhET 入口齐全 | [报告](package-report.json) |
| 现有离线 ZIP | CRC 通过；1,439 个运行及启动文件与工作区逐字节一致 | [报告](existing-package-report.json) |
| 源码与清理 | 162 个源码/配置/测试文件未改动；4 个测试端口及测试浏览器进程均已释放 | [源码校验](source-integrity-report.json) · [清理](cleanup-report.json) |
| Windows 原始 npm 启动入口 | **失败：退出码 9009**；Python 启动器可用 | [报告](windows-command-report.json) · [原始日志](windows-npm-start.txt) |

浏览器检查的不同套件存在覆盖重叠，283 是本轮执行记录数，不表示 283 个互不重复的功能。

## 发现的问题

**Windows 的部分命令硬编码 `python3`，在当前机器无法直接运行。**

已直接复现 `npm start` 退出码 9009；`py -3` 能正常找到 `C:\Program Files\python\python.exe`。`package.json:11` 的启动命令使用 `python3 scripts/serve.py`。同文件的其他八个 npm 入口，以及 `tests/smoke.mjs:10`、`tests/geometry-browser.mjs:8`，也使用该名称。这些入口的同类风险来自源码检查，未逐一执行所有原始命令。

影响是 Windows 用户无法直接使用相关 npm 启动、构建和测试入口。当前可以运行 `python scripts/serve.py`；`START_WINDOWS.bat` 使用的 `py -3` 启动器也已验证可用。后续需要修正解释器选择，再复跑原始入口。本次仅进行测试，没有修改这些文件。

## 环境与执行方式

- Windows，Node.js 24.14.0，Python 3.12.5。
- Node 与 Python Playwright 均为项目锁定的 1.56.0；Chromium Headless Shell 141.0.7390.37，构建号 1194。
- 运行全部现有 Node 单元测试，以及 `smoke.mjs`、`geometry-browser.mjs`、`classroom-browser.py` 的 HTTP 与 inline 两种模式、`spaceflight-browser.py`，并执行现有 PhET 数值对照页面。
- 两个 Node 浏览器脚本使用临时副本，仅替换 Python 解释器和输出路径；Python 验收脚本仅重定向输出。原始断言和业务代码保留。
- 重建输出先写入临时目录，与现有交付物比较；现有独立 HTML 允许操作系统换行差异，PhET 页面和修改账本按原始字节比较。正式离线 ZIP 未覆盖。
- 浏览器套件阻断外部网络，检查本地资源缺失及未捕获异常。被阻断的上游可选请求计数保留在对应报告中。
- 本次日志和截图单独保存，原有报告与截图保留。Node 测试依赖留在被忽略的 `node_modules/`；临时 Python 依赖、浏览器、构建副本和测试 ZIP 已删除。

## 覆盖边界

浏览器验证基于 Chromium，包括实际 HTTP、file:// 和触屏/视口模拟。未进行真实 iPad Safari、Firefox/WebKit 或触屏硬件验收，也未穷举所有上游随机题目及全部物理参数组合。PhET 面积对照使用测试页固定随机序列，生产页面的随机行为没有改动。
