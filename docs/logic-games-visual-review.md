# 逻辑游戏视觉验证记录

日期：2026-10-02。范围为首页入口、航天图解、扫雷与数独页面的视觉和触屏可用性检查；本次只新增验证报告和 `output/logic-games-visual/` 证据，没有改动实现代码。

## 结论

终版页面在已检查的桌面、平板和窄屏视口中没有发现仍阻断使用的视觉问题。基线阶段发现的航天图解首开空白视野、图中文字过小且横向轨道缺少提示、扫雷首次点击提示遮挡雷数/英文提示，以及扫雷分析盘尺寸与新手配置不一致，均已修复并通过终版截图或浏览器回归复核。

## 方法和版本

本次独立真实浏览器点击使用 Chromium Playwright，分别打开首页、扫雷和数独；对照了实现代理保存的真实浏览器截图及其测试结果。页面截图用于视觉判断，测试报告用于交互行为判断，两类证据在下文分开标注。数独最终静态 bundle 为 `assets/index-DWghnaA2.js` / `assets/index-cGvohFWa.css`；扫雷 adapter SHA256 为 `CB2FCFC78A8E38A2A0C2C2B41782A917C96B425960200F9258CE775EEE1095C9`。

首页在 1440×1000 CSS 视口真实点击“逻辑乐园”筛选，结果为两张独立游戏卡；真实点击两张卡均进入对应模块，未见加载状态滞留。独立截图还检查了 1037×743 和 1440×1000 首页布局。数独最终 fresh-origin 会话实读视口为 390×844、DPR 1；文档宽 375 CSS px，小于视口宽，不构成横向溢出。实现端截图覆盖 390×844、820×1180、1440×1000。扫雷实现端的移动、平板、桌面截图和 34 项浏览器报告均已审阅；报告包含触屏轻点、滚动误触、存档、模式和棋盘尺寸检查。航天基线图为 390px 窄屏和 1194px 页面截图；修复后控制器截图由实现代理的 390px Chromium 触屏模拟产生。

`output/logic-games-visual/` 中通过 CUA 保存的窄屏图像有工具栅格缩放：CSS 视口为 390×844，但部分文件栅格宽度为 375px。报告按浏览器实际读取的 CSS 视口描述尺寸，不把图片栅格宽度当作视口宽度。未使用实体手机或 iPad；触屏行为来自 Chromium 触屏模拟及实现代理的真实浏览器测试。

## 发现与修复确认

| 严重度 | 位置与复现 | 截图证据 | 验证类型 | 结论 |
|---|---|---|---|---|
| P2 | 航天 390px 图解弹层：旧版展开后主体在视野外，初始只看到大片星空。复现：打开航天页并点图解放大。 | 修复前：[spaceflight-390-diagram-open.jpg](../output/logic-games-visual/spaceflight-390-diagram-open.jpg)；修复后：[touch-diagram-open.png](../output/spaceflight-audit-20261002/controller/touch-diagram-open.png) | 修复前为本次真实点击截图；修复后为实现代理 390px Chromium 触屏模拟截图和控制器回归。 | 已修复并通过截图复核。100% 初开时 CZ-10B 主体和火焰进入视野，说明、缩放及关闭控件可见；图片仍可在弹层内滚动查看。 |
| P2 | 航天移动端阶段轨道和回收步骤横向溢出内容没有明显滑动提示；SVG 内文字缩小后难读。复现：390×844 查看阶段轨道、图解及回收步骤。 | 基线：[viewport-390.png](../output/spaceflight-branch-import/20261002T042741Z/browser/viewport-390.png)、[viewport-1194.png](../output/spaceflight-branch-import/20261002T042741Z/browser/viewport-1194.png)；修复后：[touch-lab-controls.png](../output/spaceflight-audit-20261002/controller/touch-lab-controls.png) | 基线与终版为截图审阅；终版触控控制器回归由实现代理执行。 | 已修复。关键信息移到正常字号的 HTML 标题/说明，并增加轨道滑动提示；未见页面级横向溢出。 |
| P2 | 扫雷首次轻点后的坐标提示曾覆盖“剩余雷数”，同时求解提示显示英文。复现：扫雷新手局首次轻点棋盘格。 | 修复前：[minesweeper-390-hover-overlap.jpg](../output/logic-games-visual/minesweeper-390-hover-overlap.jpg)；修复后点击态：[minesweeper-390-final-active.jpg](../output/logic-games-visual/minesweeper-390-final-active.jpg)、[minesweeper-1440-firstclick-final.png](../output/logic-games-visual/minesweeper-1440-firstclick-final.png) | 修复前后截图审阅；终版 `minesweeper-browser.json` 中“首次触屏后雷数清晰并指向中文分析控件”通过。 | 已修复。触屏时隐藏 hover 提示，桌面坐标提示按视口定位；雷数保持可读，首次提示改为中文。 |
| P2 | 扫雷“局面分析”曾以 30×16 空盘打开，但侧栏仍选中新手 9×9/10。复现：9×9/10 新手局进入“局面分析”。 | 修复前：[minesweeper-1440-analysis-mode.png](../output/logic-games-visual/minesweeper-1440-analysis-mode.png)；修复后：[minesweeper-390-analysis-final-62936b57.png](../output/logic-games-visual/minesweeper-390-analysis-final-62936b57.png)、[状态记录](../output/logic-games-visual/minesweeper-390-analysis-final-62936b57.json) | 修复后由实现代理在 390px Chromium 触屏模拟中真实开始新手局并点击“局面分析”，保存状态 JSON；我独立审阅终版全页截图。另有终版 34 项真实浏览器回归通过。 | 已修复并通过终版视觉/交互确认：分析棋盘为 9×9，侧栏字段为 9×9/0 雷；页面清楚标明这是独立编辑盘，原游戏进行状态保留。旧图仅记录修复前问题。 |
| 通过 | 首页逻辑乐园筛选和两张独立游戏卡；分别打开扫雷与数独。 | [home-logic-filter-1440x1000.png](../output/logic-games-visual/home-logic-filter-1440x1000.png)、[home-logic-filter-1037x743.png](../output/logic-games-visual/home-logic-filter-1037x743.png)；[logic-host-browser.json](../output/playwright/logic-games/logic-host-browser.json) | 独立真实浏览器点击；实现端 13 项宿主浏览器检查通过。 | 通过。筛选后恰有两张逻辑游戏卡，两页均完成加载，未发现横向溢出或运行错误。 |
| 通过 | 数独默认盘、填数/笔记控件、帮助说明与 390px 窄屏布局；另审阅 820px 与 1440px 截图。 | [sudoku-390-final-default.png](../output/logic-games-visual/sudoku-390-final-default.png)、[sudoku-390-final-help.png](../output/logic-games-visual/sudoku-390-final-help.png)、[mobile-390.png](../output/sudoku-audit-20261002/mobile-390.png)、[layout-820.png](../output/sudoku-audit-20261002/layout-820.png)、[layout-1440.png](../output/sudoku-audit-20261002/layout-1440.png)；[report.json](../output/sudoku-audit-20261002/report.json) | 本次真实浏览器打开帮助折叠项并审阅 390px 页面；其余布局为独立审阅截图。实现端 22/22 真实浏览器检查通过。 | 通过。棋盘在窄屏内完整显示，填数/笔记切换与帮助入口可见；中大屏数字盘和操作按钮尺寸清楚，页面无横向溢出。 |

## 验收边界

宿主 13 项与数独 22 项浏览器回归均未记录页面错误或远程运行请求；扫雷 34 项回归未记录页面错误，远程请求隔离由包含扫雷加载流程的宿主回归检查。主 Agent 的整套测试汇总为 514 项、510 项通过、0 项失败、4 项因平台或缺少历史快照跳过。以上不替代实体 iOS/Android 浏览器验证。本次测试浏览器标签页已关闭；8000、8001、8014 临时预览服务均已结束并确认端口释放。
