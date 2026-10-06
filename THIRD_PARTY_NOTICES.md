# 第三方来源与授权

核对日期：2026-09-28。本项目为独立教学整合项目，不代表上游官方产品。保留上游代码及成品，不把公开仓库等同于无限制授权。

## PhET（10个完整模拟，均支持中文）

Simulation by PhET Interactive Simulations, University of Colorado Boulder, licensed under CC BY-NC 4.0 (https://phet.colorado.edu).

- Area Builder: https://github.com/phetsims/area-builder
- Forces and Motion: Basics: https://github.com/phetsims/forces-and-motion-basics
- Energy Skate Park: Basics: https://github.com/phetsims/energy-skate-park-basics
- Vector Addition: https://github.com/phetsims/vector-addition
- Fractions Intro: https://github.com/phetsims/fractions-intro
- Fraction Matcher: https://github.com/phetsims/fraction-matcher
- Balancing Act: https://github.com/phetsims/balancing-act
- Circuit Construction Kit: DC: https://github.com/phetsims/circuit-construction-kit-dc
- States of Matter: Basics: https://github.com/phetsims/states-of-matter-basics
- Build a Molecule: https://github.com/phetsims/build-a-molecule

后六项于2026-10-01从 `feature/phet-expanded-20261001` 接入，保存的是官方多语言发布成品，入口固定使用 `locale=zh_CN`。文件大小、官方发布 URL 和 SHA-256 见 `modules/phet/lock.json`，并登记在 `config/inventory.json` 与 `config/upstream-lock.json`；这六项没有附带新的源码仓库快照。其派生页只修改显示配色、控件外观、字体及本地主题引用，并移除官方发布页附带的外部 Cloudflare 统计脚本；原成品与内嵌版权头完整保留，所有派生修改均有可逆记录。

官方当前普通 HTML 模拟许可：https://phet.colorado.edu/en/licensing 。截至核对日为 CC BY-NC 4.0，非商业教学与分享需要署名；成品不可因此被重新标为 MIT。源码的 GPL 许可证不自动替代官方成品分发条款。每个具体文件的原始许可头和依赖声明保留；本整合版对官方成品按当前非商业条件保守处理。

课堂非商业使用与收费、广告支持、商业产品整合须区分。后续收费或商业分发前须重新核对官方条款或取得相应授权。不得将本 README 视为商业授权证明。

完整中文 HTML 位于 vendor/phet/，不修改原文件，不遮挡或删除 logo；使用处显示上述署名。普通原版导航和关卡全部保留；不是 PhET-iO，也不调用需要另行许可的 PhET-iO API。

2026-09-30 的科学小岛视觉改编位于 `src/phet/generated/`，由 `scripts/build_phet_theme.py` 从上述本地成品生成。改动包括人物插画、场景素材、配色、控件外观、角色显示锚点与少量中文标签；原科学计算与题目生成逻辑保留。新增人物和远景通过 OpenAI 图像生成工具制作，原始图集及切分后的素材保存在 `src/phet/assets/`。该视觉改编不是 PhET 官方版本，不暗示官方认可，仍保留原成品的版权与许可声明；不将改编后的完整成品重新授权为 MIT。

源码快照位于 vendor/sources/，各自保留 GPL 许可；原始 ZIP、提交 SHA、HTML SHA256 分别保存。源码快照用于后续审查改造，不声称其连同全部公共依赖能复现官方成品。官方成品内嵌的第三方依赖授权也须遵守。

## Tangram

来源：https://github.com/iliagrigorevdev/tangram ，GPL-3.0。完整源码、资源及 LICENSE 均保留于 vendor/tangram/，未改写题目或程序。内置 Three.js 保留其原许可头（MIT）。这是一个内置快照与自由拼装程序，上游“更多题目”接口和切题函数没有完成，不能把它描述成完整多关题库。

## Matter.js 与依赖

来源：https://github.com/liabru/matter-js ，锁定 0.20.0，MIT。完整上游仓库保留于 vendor/matter/，包括全部48个注册示例、源代码、许可证、图片和 SVG 资源。新加入的 demo/mathphysics.html 为独立加载器，不覆盖官方示例文件。

必要依赖：poly-decomp 0.3.0、matter-wrap 0.2.0、pathseg 1.2.1。来自相应 npm 发行包，原始压缩包、package.json 与 LICENSE 文件保留。具体授权以每个包的 LICENSE、版权头及素材声明为准，不能因引擎是 MIT 就断言每张素材也适用 MIT。

## 明确未复制的项目

DennisWeiss/linear-transform-visualizer：未发现明确仓库许可证，暂不复制其代码与资源。本版向量内容由完整 Vector Addition 覆盖，不假装已整合未授权项目。

Phaser：备选游戏框架，本版未引入。JSXGraph 已在 v0.4 引入，见下方说明。

## 修改边界

2026-10-05 的题型审查材料来自 MathsMentales（`seb-cogez/mathsmentales`，固定提交 `ff60a4304aa5a439c5e567cad28c79e01a9ae74a`）和 MathALÉA 的 GitHub 历史仓库（`mathalea/mathaleaV3`，固定提交 `9f4d62dba4971d5bbc2b4927b5e699ff05b84778`）。原始定义与许可证保存在 `vendor/question-sources/`：MathsMentales 为 Apache-2.0，MathALÉA 为 AGPL-3.0；原始文件保持各自许可。41份小学题型定义、SHA-256、去重结果和加载入口见该目录 `manifest.json`。新增9种中文题型生成器独立编写，课堂不执行上游生成程序。MathALÉA 当前维护仓库位于 Forge，此次审查使用固定的 GitHub 快照。

新增入口、配置管理、MIT 标注的课堂与测试采用 MIT；基于 GPL Tangram 的平面适配器采用 GPL-3.0。上游独立文件继续适用原许可证。iframe 是兼容性隔离，不作为不可信代码的安全沙箱。teacherPreview 是本地展示开关，不是身份鉴别或访问控制系统。

## v0.2 Original geometry proofs

`lessons/geometric-proofs/` and its single-file build contain original MathPhysics code, SVG constructions and Chinese explanations under the root MIT license. Mathematical references are links, not copied course assets. No Mathigon textbooks source/content (whose package.json is UNLICENSED), or PhET Area Model Algebra code, is included in this module. Existing PhET, Tangram and Matter.js licenses are unchanged. Vector Addition GPL-3.0 source was already included in v0.1.


## v0.3 Original spaceflight classroom

`lessons/spaceflight/`, its standalone build, and the new classroom tests contain original MathPhysics code, schematic Canvas drawings, and Chinese teaching text under the root MIT license. Public agency and manufacturer references are linked, not copied wholesale. No external photographs, logos, font files or third-party rocket simulation code are embedded in this new module. Descriptive vehicle and organization names do not imply endorsement. Existing vendored resources keep their own licenses; the full distribution is not relicensed uniformly as MIT.


## v0.4 JSXGraph 图形实验与平面七巧板

JSXGraph 1.12.2 来自 https://github.com/jsxgraph/jsxgraph 的 npm 发行包，选择 MIT 许可使用。发行包文件位于 `vendor/jsxgraph/`，完整 MIT 版权和许可见 `vendor/jsxgraph/LICENSE.MIT`。导入校验与每个文件哈希见 `config/libraries-lock.json`。包中的字体文件不分发。

`lessons/jsxgraph-playground/` 是本项目基于 JSXGraph 独立编写的六个中文课堂活动，不是从上游复制的六个现成关卡；本模块原创部分 MIT。单文件版内嵌原库版权头和 MIT 许可。

`lessons/tangram-flat/` 是原 Tangram 几何内核和内置快照的 SVG 适配，整体按 GPL-3.0 分发，完整许可见该目录 LICENSE。原始 `vendor/tangram/` 未改动。方形热身使用原七块的标准分割，创意轮廓使用原内置快照；这不是新增两个上游题库。单文件七巧板版内嵌原内核及 GPL 许可。

界面文字整理不删除法定版权标识。PhET 活动画面及其品牌标识保持可见，播放页保留所需署名。Matter 的 48 个原始示例代码保留，修改的 `demo/mathphysics.html` 是先前由本项目生成的加载器，并非上游示例。

「物理验收」将全部48个 Matter.js 演示按五类组织在同一个入口中。分类导航位于 `src/matter-catalog.js` 和 `src/adapters/matter.html`，不修改上游示例、科学参数或资源。


## Launch Atlas calculation core (local spaceflight fusion, 2026-10-01)

Source: https://github.com/exiztinz/rocket-launch-simulator, pinned commit b8b570cd2f25b0531724c776631160c48bba06fd. MIT, Copyright (c) 2025 Joseph Tascona. Complete license: vendor/launch-atlas/LICENSE; preserved raw sources and SHA-256: vendor/launch-atlas/SOURCE.json. The complete license is also in flight-core.js and the standalone classroom. Local changes convert modules to a classic-script factory, set RK4 dt=0.25s and scale-independent engine visibility. MathPhysics uses arbitrary teaching parameters, never upstream vehicle figures for Shenzhou or Long March. No upstream textures, presets, 3D assets, fonts or runtime dependencies are included. See docs/spaceflight-fusion.md.

## 逻辑乐园

2026-10-03 新增四项 MIT 游戏适配。原始文件与许可证按原样保存于 `vendor/games/spatial/`；`import-manifest.json` 记录 284 个源码文件的 SHA-256，历史收集文档存于 `collection-records/`。固定版本如下：

| 项目 | 固定提交 | 版权与许可证 |
|---|---|---|
| rberenguel/soma | `6f4e357a7f4c96821dfd751e0b06b2f340afa862` | © 2025 Ruben Berenguel；`soma/LICENSE` |
| fogleman/rush | `3e3b8396891d1802b30cb3129ae31fdedb319480` | © 2018 Michael Fogleman；`rush/LICENSE.md` |
| gabrielecirulli/2048 | `478b6ec346e3787f589e4af751378d06ded4cbbc` | © 2014 Gabriele Cirulli；`2048/LICENSE.txt` |
| abhas9/escape-run | `ab61caa41ae612057821df485bc5facf97d5b5c6` | © 2026 abhas9；`escape-run/LICENSE` |

`lessons/spatial-games/` 新增中文选关、分层积分、持久化与本地运行适配。Soma 恢复原 Three.js 场景及交互模块，来源记录保存在 `soma-native/upstream/source-manifest.json`，原 MIT 声明保留。原版 46 个附加题形、经典方块和五个教学目标均可计分；逐题来源映射见 `soma-native/puzzle-audit.json`。rush 保留全部 40 个原版固定盘、网页固定障碍盘和三个教学／衍生盘，生成数据记录源文件位置及最短解。2048 沿用单次合并与随机生成规则。数学飞车复用原八类题目生成器和随机工具，使用每局随机题序、自动驾驶、拾取及答案门流程，题图改为路面外的紧凑 SVG。原上游辅助工具归档保留，其外部服务不成为课堂运行依赖。原创入口 SVG 和新增界面采用项目根 MIT 许可，原库及附带素材继续保留各自许可。

逻辑乐园的扫雷基于 [DavidNHill/JSMinesweeper](https://github.com/DavidNHill/JSMinesweeper)，固定版本 `256cd7d`；数独基于 [TN1ck/super-sudoku](https://github.com/TN1ck/super-sudoku)，固定版本 `165dcdb`。两项目采用 MIT，原始源码、README 与 LICENSE 保留在 `vendor/games/`。`lessons/minesweeper/` 的完整求解器及游戏内核从固定上游生成，`lessons/sudoku/` 保留完整 React 游戏与 3,014 条题库并构建为本地静态成品。科学小岛增加中文入口、原创 SVG、主题、触屏操作和隔离的本地存档；适配代码采用根目录 MIT。相关第三方运行库及打包代码保留各自许可。

## 生活应用题：ASDiv、SVAMP、GSM8K（2026-10-05 本地整合）

代表清单固定于 MathPhysics 提交 `2d5b5ec5251d632e6cb5d731eb31cfc7fce7eccd`。受控管理员服务包的 `server/word-problems-private/provenance/` 保存全部1,398条来源映射、源文件SHA-256、原分类及助手中文审核状态。学生离线包及Primary单HTML包含全部1,391道无隔离题，按原分类提供零分练习；仅7道既有问题题隔离。取消固定练习/考核分区，来源和题族仅溯源，不作功能门槛。人工教学批准字段如实保持false，真实助手复核记录保留；正式服务端题沿用原知识目标和积分上限，不增加额度。

| 来源 | 固定版本 | 许可与归属 |
|---|---|---|
| ASDiv，chaochun/nlu-asdiv-dataset | `883f90a9a65bf00304ba8f37423910fe743abc47` | CC BY-NC 4.0；中央研究院资讯科学研究所 Natural Language Understanding laboratory；Shen-yun Miao、Chao-Chun Liang、Keh-Yih Su（2020） |
| SVAMP，arkilpatel/SVAMP | `78e727689e1c1bebfc4be39c446898e8e10b0518` | 源仓库 MIT，© 2021 Arkil Patel；与ASDiv的具体原题血缘未知处保留非商业边界与许可澄清状态 |
| GSM8K，openai/grade-school-math | `3101c7d5072418e28b9008a6636bde82a006892c` | MIT，© 2021 OpenAI |

完整 MIT 声明与 ASDiv 署名资料随学生包保留在 `lessons/word-problems/licenses/`；完整源仓库 README 与来源审读链保留在受控管理员包的 `server/word-problems-private/provenance/licenses/`。ASDiv 的 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) 许可声明保留在其 README。中文题面、单位与情境改编和讲解逐题记录 `adaptation`，原始 `Source` 与来源ID保持可追溯。项目根MIT只覆盖原创加载、判题适配及界面代码，不覆盖ASDiv题文或未澄清的SVAMP原题血缘。更多内容见管理员本地 [整合说明](docs/word-problems-integration.md)。
