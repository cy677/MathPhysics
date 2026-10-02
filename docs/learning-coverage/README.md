# 学习内容全量覆盖与验收

本清单以当前源码中的稳定 ID 为准。随机数值组合不重复计算为新题型；复用的生成模板只计一次，课程知识点另列。浏览器结果和截图对应本次工作区，未运行的检查必须明确标为未验证。

## 覆盖范围

| 范围 | 项数 | 逐项记录 |
| --- | ---: | --- |
| 原创生活题及可调整模型 | 48 | [questions.json](questions.json) |
| 兼容生成题型 | 48 | [questions.json](questions.json) |
| 课程新增生成题型 | 29 | [questions.json](questions.json) |
| 课程知识点与学习层次 | 49 × 3 | [questions.json](questions.json) |
| Matter.js 场景 | 48 | [matter-phet.json](matter-phet.json) |
| PhET 模拟与内部页面 | 10 模拟、28 页面 | [matter-phet.json](matter-phet.json) |
| PhET 内置数理题 | 4 模拟、5 游戏页面、46 配置、15 题型 | [phet-questions.json](phet-questions.json) |
| PhET 分子收集目标 | 2 页面、26 种参考分子、103 种有限目标参数 | [phet-molecule-questions.json](phet-molecule-questions.json) |
| 其余 PhET 题目边界审计 | 6 模拟、18 页面，含上述 2 个分子收集页面 | [phet-other-question-audit.json](phet-other-question-audit.json) |
| 旧七巧板入口 | 1 | [matter-phet.json](matter-phet.json) |
| JSXGraph 主模式及三角形子模式 | 6 主模式、2 子模式 | [local-classrooms.json](local-classrooms.json) |
| JSXGraph 小挑战 | 36 | [local-classrooms.json](local-classrooms.json) |
| 几何证明及问法 | 24 演示、48 问法 | [local-classrooms.json](local-classrooms.json) |
| 航天任务 | 4 路线、62 主阶段、2 回收支线 | [local-classrooms.json](local-classrooms.json) |
| 航天实验与结构图 | 8 实验、7 系统 | [local-classrooms.json](local-classrooms.json) |
| 航天路线中的问答 | 16 个路线实例 | [local-classrooms.json](local-classrooms.json) |
| 平面七巧板 | 2 轮廓、6 挑战 | [local-classrooms.json](local-classrooms.json) |

## 验收要求

题目逐项检查题意、至少三个递进提示、分步解题过程和常见错误。参数题的讲解使用当前实际数值；变换参数后，题干、答案和讲解同步。题库原有参数、答案、种子、ID、去重和配方保持兼容，学生版导出不得含解答字段。

PhET 内置数理题和分子收集题卡只读取当前原生目标、图形、数值与收集进度；不调用随机出题器或改写科学模型。46 个数理关卡配置全部验收，生成题另用实际原生样本和有限候选池核验；26 种分子与 103 种目标参数的范围是参考结构和容量，未穷举随机组合、位置与操作序列。拔河比赛是开放实验，其胜负结果不作为预设问答题计数。

演示逐项检查观察目标、真实操作、直观解释、生活例子和可展开的原理。Matter.js 每个场景单独设计预测、操作、解释任务，并验证初始暂停、继续、有限步进、专用操作和重置。场景的引导以对应上游代码的真实行为为依据。

CI 使用当前统一入口，旧入口继续跳转；本地与 CI 使用同一浏览器测试。实际注入失败，检查测试命令、兼容入口和汇总脚本返回非零退出码。流水线记录日志时保留测试退出状态。

桌面和小屏截图由 `gpt-6-luna`、`max` 完成视觉评审；应用编码由 `gpt-6.1-sol`、`max` 完成。检查内容包括文字与图形可读性、控件可达性、遮挡、横向溢出和展开讲解后的布局。Chromium 的触控模拟只代表本次浏览器验证。

## 本次验收状态

2026-10-01：上述范围的实现、逐项功能检查与独立视觉复核已完成。原始发现与修复证据保留在各清单及视觉报告中。以下结果来自当前 Windows 工作区，执行的是 CI 使用的命令；未触发远端 GitHub Actions。

| 检查 | 结果与证据 |
| --- | --- |
| 全套 Node 单元与集成测试 | 465 通过、0 失败；1 项 Linux 专属检查在 Windows 按条件跳过。[最终日志](../../output/learning-coverage-final-unit.log) |
| 题库主界面与兼容入口 | 49 知识点 × 3 层次、12 组操作通过，含作答、配方、导出与离线版。[报告](../../output/playwright/numbers-life-sg/report.json) |
| 逐题教学与生成兼容 | 48 固定题、77 唯一模板、49 知识点逐项通过；9,240 个教学样本、924 个冻结算法样本通过。[清单](questions.json)、[浏览器报告](../../output/playwright/learning-coverage/questions/report.json) |
| 失败传播 | Node、真实浏览器、旧 Python 入口均在注入断言失败后退出 1；Git Bash 的 `tee` 管道启用 `pipefail` 后仍退出 1。[注入报告](../../output/playwright/numbers-life-failure/propagation.json)、[管道证据](../../output/playwright/numbers-life-failure/pipeline-windows-bash.json) |
| Matter.js 与 PhET 演示 | 48 个场景的真实暂停、单帧、有限步进、专用操作与可复现重置通过；10 个 PhET 模拟及 28 个页面、旧七巧板通过。[清单](matter-phet.json) |
| 本地课堂 | 117 个演示上下文、106 个问答实例全部通过，含 HTTP、离线文件、参数变化和实际操作。[清单](local-classrooms.json) |
| PhET 原生数理题 | 46 配置、15 题型、768 个原生生成样本通过；332 个基础分数候选、984 个数字缩放变式、2,417 个原生填色组合核验；5 个断网文件入口及 5 个宿主题卡桥接通过。[清单](phet-questions.json) |
| PhET 分子目标 | 2 个收集页面、26 种参考结构、103 种有限目标参数通过；真实拖拽成键收集、清空、刷新目标和断网文件运行通过。[清单](phet-molecule-questions.json) |
| 当前布局与显示兼容 | 默认命令完整通过 28 页面、3 宿主窄屏入口、2 Matter 镜头、7 场景两阶段、旧七巧板及 4 次真实拖拽坐标检查，82 张截图；初始化与离线样式兼容 6 项通过。[布局报告](../../output/playwright/learning-coverage/demo-layout-browser-report.json)、[兼容报告](../../output/playwright/learning-coverage/phet-display-compat-browser-report.json) |
| 旧回归 | 课堂 90 项、几何 29 项通过；既有特性在真实 HTTP 与离线文件中通过。[课堂报告](../classroom-browser-report.json)、[几何报告](../geometry-browser-report.json)、[既有特性日志](../../output/learning-coverage-unique-features-regression.log) |

本次应用与测试编码由 `gpt-6.1-sol / max` 完成。`gpt-6-luna / max` 逐张查看以下原始截图；机读边界、图形像素与鼠标操作结果是独立辅助证据，不能代替目视判断。

| 视觉范围 | 实际查看的唯一路径 | 最终报告 |
| --- | ---: | --- |
| 数与生活题库 | 303，另 2 张七巧板辅助图与本地课堂重合 | [visual-questions.md](visual-questions.md) |
| JSXGraph、几何、航天、平面七巧板 | 298 | [visual-local.md](visual-local.md) |
| Matter.js、PhET 页面与旧七巧板 | 145（初轮 98、本轮 82，重合 35） | [visual-matter-phet.md](visual-matter-phet.md) |
| PhET 原生数理题 | 75（69 张初轮、6 张新路径补拍复核） | [visual-phet-questions.md](visual-phet-questions.md) |
| PhET 分子题卡与原版空槽对照 | 10（8 张更新主图、2 张对照图） | [visual-phet-molecule.md](visual-phet-molecule.md) |

各初轮发现均有后续修复或取景证据并经复看关闭，初轮记录保留。数理题补拍保留原 69 张图及哈希，分子题卡的初轮 8 张图另有归档与版本哈希。逐项功能覆盖与视觉截图覆盖分列：106 个本地问答全部通过功能检查，未声称每个问答都有独立截图；随机题也未视觉穷举全部数值状态。

390 像素宽时，PhET 原生场景整体缩放，部分文字和控件偏小，横屏或平板更适合操作。Matter 布偶的主要身体已纳入视野，外围形状仍可能贴近镜头边缘。当前验收使用 Chromium，未覆盖真实 iOS/Safari 设备。离线构建与打包命令为 `npm run package`。
