# 航天模块功能与触屏审查

日期：2026-10-02。在导入 `origin/feature/spaceflight-svg-cz10b-20261002` 的现有工作区上增量修复；没有替换导入的教学内容、模型和 102 张 SVG 图稿。

## 已复现并修复

1. **存档恢复会计算错误任务。** 没有 URL hash 的冷启动先计算默认 `us-crew`，再读取答题存档中的任务；恢复中国卫星、中国载人和美国卫星路线后，计算轨迹实际仍使用美国载人配置。已改为先恢复任务与阶段，再请求模型。三个非默认任务的真实浏览器冷启动均通过。
2. **长十乙回收说明在重渲染后丢失。** 七阶段分镜缓存会跳过说明和 `aria-label` 同步；选择第四阶段后切换讲解深度或返回旅程，会显示通用支线说明。缓存现在仅省略按钮重建，每次绘制仍同步当前阶段文字与无障碍标签。
3. **手机放大图解初开只见左侧星空。** 视觉复检发现 100% 大图被定位到左上角，主体在屏幕右侧。保持原尺寸倍率，在弹层布局后的第一帧把横向和纵向视区居中；控制器新增初始滚动量等于溢出宽度一半的断言，7 项回归均通过，并重建独立文件。

笔记下载曾被静态审查列为候选，但实际下载具有正确 Markdown 换行，未修改其代码。修复前失败证据保存在 `output/spaceflight-audit-20261002/before-controller/report.json`。

## 触屏与模式

- 增加“放大图解”弹层：以原始 1040×610 尺寸显示当前 SVG，可水平/垂直滚动，提供 50%–300% 增减缩放、原尺寸和关闭按钮；键盘 Escape 可关闭。克隆图稿的渐变与裁剪 ID 单独命名，避免与主图冲突。
- 当前阶段标题和说明在图外以 HTML 显示；模型视图显示当前状态说明，回收分镜使用当前步骤说明。
- 手机旅程列表和七阶段回收列表显示左右滑动提示。实验参数增加加减按钮，两类演示进度增加前进/后退按钮；原滑条和键盘操作保留。
- 主要按钮至少 44×44 CSS px；未禁止网页缩放或滚动。准备检查仅在“计算轨迹”的准备阶段显示，“步骤图解”可直接播放。
- 独立课堂 `dist/MathPhysics-Spaceflight.html` 已重新生成，新增控件和图标内联，不增加外部运行依赖。

## 验证证据

| 验证 | 结果 | 证据 |
| --- | --- | --- |
| 四组 Node 数据/模型/集成/SVG 测试 | 43 通过，3 跳过 | 跳过项需要原审计历史快照，当前环境不存在 |
| 新控制器真实 HTTP 浏览器回归 | 7 项通过 | `output/spaceflight-audit-20261002/controller/report.json` |
| SVG 全覆盖与界面回归 | 288 次绘制、102 SVG、无页面异常或外部 HTTP 请求 | `output/spaceflight-audit-20261002/svg-browser/report.json` |
| 原图稿保留检查 | 102 文件全部一致，按 LF 规范化计算 SHA | `output/spaceflight-audit-20261002/svg-preservation.json` |
| 融合功能浏览器 | 16 项通过，含模型关机、回收失败、参数、惯性、宿主和真实 file:// | `output/spaceflight-audit-20261002/fusion-browser/report.json` |
| 学习内容浏览器 | 10 项通过，HTTP/file 共 168 次引导、32 次答题 | `output/spaceflight-audit-20261002/teaching-browser/teaching-report.json` |
| 旧独立文件内存载入浏览器 | 96 项通过 | `output/spaceflight-audit-20261002/standalone-browser/report.json` |
| 已适配 SVG 的 v2 浏览器 | 12 项通过，36 截图，测试前后航天来源未变 | `output/spaceflight-audit-20261002/v2-browser/report.json` |

修正了旧测试的 62 阶段计数、Canvas 文本截获和默认计算模式假设。浏览器脚本可通过 `CHROMIUM_EXECUTABLE` 使用指定本地 Chromium；SVG 批量生成新增 `SPACEFLIGHT_SVG_ASSETS`/`SPACEFLIGHT_SVG_OUTPUT`，本次输出至审查目录而未覆盖原图稿。

390px 触摸模拟验证了分镜点按、大图滚动、缩放/重置/关闭、按钮尺寸、检查模式和滑条替代操作。截图为 `controller/touch-diagram-open.png` 和 `controller/touch-lab-controls.png`。实体 iPad/Safari 未测试；独立视觉复检由视觉审查 Agent 完成。

所有本次脚本自建服务器和浏览器均在退出时关闭。目录阶段元数据的 63 阶段修正由宿主接入工作负责。
