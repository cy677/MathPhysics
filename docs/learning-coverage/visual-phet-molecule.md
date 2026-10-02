# PhET Build a Molecule 原生题卡视觉验收

- 检查模型：luna max。
- 本轮实际查看：10个截图路径，全部通过 view_image 逐张检查；其中8张是原主图路径上的新截图版本，另有2张空槽语义对照图。
- 初轮历史：先前已查看8张旧版本；新 manifest 记录的 first-review SHA 与当前8张主图 SHA 均不同。本轮实际查看主图各1次，不重复查看 first-review/ 归档副本，也不把副本计成新路径。
- 来源：docs/learning-coverage/phet-molecule-questions.json、docs/learning-coverage/phet-other-question-audit.json。
- 最终状态：8张主图通过；2张空槽对照确认原生语义；初轮2项视觉发现均关闭；当前未解决视觉发现为0。

## 初轮与补拍版本

初轮记录了两项发现：4张 question 图被滚动栏裁断，未展示完整解题步骤和常见错误；4张数量为0的 viewport 图中 collection 槽是黑色块，语义尚待核实。八张同路径主图现已全部更换版本，manifest 中旧版归档SHA与当前文件SHA逐张不同。

补拍后重新打开完整aside题卡：single显示4条提示、19步完整解题过程和4条常见错误；multiple显示4条提示、15步完整过程和4条常见错误。题意、原子种类与数量、连接关系、当前目标、已收集数均清晰，无截断或文字重叠。题卡bounds检查记录wholePanelInViewport=true、railNotClipping=true。

## 当前目标与viewport

single实际收集O2 1个：本轮5种目标，已收集1，还剩4；屏幕列出H2O、O2、H2、CO2、N2的目标数量，其中O2为1/1。multiple实际收集O2 1个：本轮4种目标共10个，已收集1，还剩9；原生目标值2CO2、2O2、4H2、2NH3清楚，O2为1/2。新增O2缩略图显示彩色原子和3D入口。

desktop的原子托盘、左右切换、收集栏重置/清理、底部模式导航清楚可见，无关键操作遮挡。390px下模拟器和目标侧栏缩放得较小，字体比桌面小，但目标行可辨，操作仍可见，未见重叠。黑色未收集槽的状态另按空槽语义核实，见下节。

## 空槽语义对照

本轮实际查看native-empty-slots-comparison.png和themed-empty-slots-comparison.png。native原版与主题界面都将quantity=0的分子栏显示成黑色空槽。manifest/source对照记录黑色底板、molecule layer为空；当前收集数量为1的O2槽则显示彩色缩略图。初轮“纯黑预览可能未渲染”的观察已关闭，属于原生空槽状态，不是缺陷。

## 逐图状态

| 图 | 路径 | 版本/结果 |
| --- | --- | --- |
| single / desktop / question | output/playwright/learning-coverage/phet-molecule/http-single-desktop-question.png | 新SHA版本；4提示、19步、4常见错误完整；通过。 |
| single / desktop / viewport | output/playwright/learning-coverage/phet-molecule/http-single-desktop-viewport.png | 新SHA版本；1/5、剩余4、O2 1/1和彩色缩略图；通过。 |
| single / 390px / question | output/playwright/learning-coverage/phet-molecule/http-single-390-question.png | 新SHA版本；完整题卡与过程、错误展开；通过。 |
| single / 390px / viewport | output/playwright/learning-coverage/phet-molecule/http-single-390-viewport.png | 新SHA版本；目标行和主要操作可见；通过，字体较小但可辨。 |
| multiple / desktop / question | output/playwright/learning-coverage/phet-molecule/http-multiple-desktop-question.png | 新SHA版本；4提示、15步、4常见错误完整；通过。 |
| multiple / desktop / viewport | output/playwright/learning-coverage/phet-molecule/http-multiple-desktop-viewport.png | 新SHA版本；1/10、剩余9、2CO2/2O2/4H2/2NH3及O2缩略图；通过。 |
| multiple / 390px / question | output/playwright/learning-coverage/phet-molecule/http-multiple-390-question.png | 新SHA版本；完整题卡与过程、错误展开；通过。 |
| multiple / 390px / viewport | output/playwright/learning-coverage/phet-molecule/http-multiple-390-viewport.png | 新SHA版本；目标行和主要操作可见；通过，字体较小但可辨。 |
| native empty slots | output/playwright/learning-coverage/phet-molecule/native-empty-slots-comparison.png | 原生空槽黑底对照；通过，支持 quantity=0 语义。 |
| themed empty slots | output/playwright/learning-coverage/phet-molecule/themed-empty-slots-comparison.png | 主题空槽黑底对照；通过，支持 quantity=0 语义。 |

## 范围限制

报告中的26种参考类型与103个目标参数签名属于有限覆盖元数据。本轮只目视检查两种收集屏的真实目标与这10张图片，不宣称视觉穷举全部分子或参数组合。每张图的路径、状态、finding处理历史与SHA版本信息见docs/learning-coverage/visual-phet-molecule.json。
