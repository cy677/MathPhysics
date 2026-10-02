# Matter、PhET 与旧 Tangram 视觉复审

- 日期：2026-10-01
- 增量复审模型：**gpt-6-luna，max**
- 方法：82张增量截图逐张用 `view_image`、`detail=original` 实际查看；首轮98张记录保留，并按截图路径去重。
- 最新自动化证据：`npm run test:demo-layout:browser` 退出0，`passed=true`、`errors=[]`、`missing=[]`，browser/server均已清理。
- 当前状态：**目标布局增量复审完成，带范围说明**。82/82张新图已查看；首轮98张与本轮82张路径重合35条，新增路径47条，按路径去重后共145条。F1–F5均有本轮视觉复核结论。

## 逐组结论

PhET独立screen的桌面引导位于模拟器画面右侧，手机引导位于科学画幅下方；28个screen各有桌面与手机图，Area Builder网格/级卡、向量工作区、分数图形/卡片、平衡物块等主体和控件均可见。手机PhET内部界面按390像素宽缩放，部分控件标签较细小，但没有被裁掉或与guide相交。三个PhET宿主手机画面为真实390像素viewport，guide另有截图；宿主frame截图呈现PhET chooser/入口，活动screen布局由28张独立PhET手机图覆盖。

旧Tangram桌面版guide位于canvas右侧；手机canvas、guide和方向/旋转操作栏分区，目标板、拼板与控件都可见。截图只证明控件位置可见；键盘移动结果引用自动化报告。

Matter七个演示各有operate与explain手机图。操作阶段参数选择、专用操作按钮、结果提示和操作文字可见；解释阶段显示原理和生活例子。页面纵向展开，未见横向溢出。布偶身体和左臂、自动台阶的主要部分可辨；少量外围多边形仍贴近画布上沿。组合方块组在桌面与手机的新视野图中完整位于画布内。

PhET Build a Molecule四张single-/multiple-molecules图中，公式和已收集数量可读。黑色收集槽与计数0同时出现；父Agent提供的源码核查说明这是未填充分子前的原生空槽，本轮不作为预览故障或遮挡发现。数量大于0后缩略图替换空槽的截图由另一项后续复核覆盖。

## 首轮问题复核

| ID | 首轮状态 | 本轮结论 | 最新证据数 |
|---|---|---|---:|
| F1 | pending_layout_adjustment_and_retake | resolved_by_layout_recheck | 56 |
| F2 | pending_mobile_layout_and_retake | resolved_viewport_and_guide_separation | 6 |
| F3 | pending_layout_adjustment_and_retake | resolved_canvas_and_controls_separated | 2 |
| F4 | pending_visual_recheck_no_model_change_requested | resolved_for_primary_objects | 4 |
| F5 | pending_operation_stage_retake | resolved_operation_and_explain_evidence | 14 |

F1在新版PhET桌面/手机图中不再遮挡科学画面；F2改为390像素宿主viewport并提供独立guide图；F3的Tangram画布、说明与操作栏已分区；F4的主要对象可见且组合图形完整适配；F5由七个演示各一组operate/explain手机图补齐。机器报告中的pointer、键盘和物理状态单独记录，不从截图推断交互成功。

## 本轮截图分组

| 范围 | 截图数 | 说明 |
|---|---:|---|
| PhET独立screen | 56 | 28桌面、28手机 |
| PhET宿主手机证据 | 6 | 3个host画面、3张独立guide |
| Matter视野 | 4 | 2个场景各桌面/手机 |
| Matter手机阶段 | 14 | 7个operate、7个explain |
| 旧Tangram | 2 | 桌面和手机 |

首轮与增量合并后的路径分组：Matter 桌面 48张；Matter 移动 23张；PhET 独立屏 56张；PhET 宿主桌面 10张；PhET 宿主移动 6张；旧 Tangram 2张，合计145条unique paths。

## 自动化证据

`demo-layout-browser-report.json`记录：28/28 PhET屏non-overlap且display matches science；3/3宿主手机viewport宽390并且guide不相交；4/4真实pointer drag（Area Builder、Vector Addition各桌面及手机一次，报告记录新方块/向量）；2/2 Matter视野target fully inside且camera未改变物理轨迹；7/7 operate/explain阶段断言；2/2 Tangram non-overlap与键盘移动检查。这些是机器结果，不是目视证明。

## 路径清单和逐项状态

- “首轮”保留原98张的目视状态；“本轮”标注82张增量图片是否实际查看。
- 历史发现ID仅指首轮状态；已由本轮截图复核的发现见上表。
- 63条只在首轮出现的路径没有重拍，仍保留历史状态，不计入本轮82张。

| # | groupID | id | 视口 | 首轮状态 | 本轮状态 | 历史发现 | 目视备注 | 路径 |
|---:|---|---|---|---|---|---|---|---|
| 1 | matter-desktop | matter-airFriction | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-airFriction-desktop.png` |
| 2 | matter-desktop | matter-friction | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-friction-desktop.png` |
| 3 | matter-desktop | matter-staticFriction | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-staticFriction-desktop.png` |
| 4 | matter-desktop | matter-restitution | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-restitution-desktop.png` |
| 5 | matter-desktop | matter-gravity | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-gravity-desktop.png` |
| 6 | matter-desktop | matter-timescale | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-timescale-desktop.png` |
| 7 | matter-desktop | matter-bridge | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-bridge-desktop.png` |
| 8 | matter-desktop | matter-car | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-car-desktop.png` |
| 9 | matter-desktop | matter-catapult | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-catapult-desktop.png` |
| 10 | matter-desktop | matter-slingshot | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-slingshot-desktop.png` |
| 11 | matter-desktop | matter-newtonsCradle | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-newtonsCradle-desktop.png` |
| 12 | matter-desktop | matter-doublePendulum | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-doublePendulum-desktop.png` |
| 13 | matter-desktop | matter-wreckingBall | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-wreckingBall-desktop.png` |
| 14 | matter-desktop | matter-gyro | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-gyro-desktop.png` |
| 15 | matter-desktop | matter-mixed | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-mixed-desktop.png` |
| 16 | matter-desktop | matter-stack | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-stack-desktop.png` |
| 17 | matter-desktop | matter-circleStack | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-circleStack-desktop.png` |
| 18 | matter-desktop | matter-compound | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-compound-desktop.png` |
| 19 | matter-desktop | matter-compoundStack | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-compoundStack-desktop.png` |
| 20 | matter-desktop | matter-pyramid | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-pyramid-desktop.png` |
| 21 | matter-desktop | matter-avalanche | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-avalanche-desktop.png` |
| 22 | matter-desktop | matter-ballPool | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-ballPool-desktop.png` |
| 23 | matter-desktop | matter-rounded | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-rounded-desktop.png` |
| 24 | matter-desktop | matter-concave | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-concave-desktop.png` |
| 25 | matter-desktop | matter-svg | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-svg-desktop.png` |
| 26 | matter-desktop | matter-terrain | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-terrain-desktop.png` |
| 27 | matter-desktop | matter-cloth | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-cloth-desktop.png` |
| 28 | matter-desktop | matter-softBody | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-softBody-desktop.png` |
| 29 | matter-desktop | matter-ragdoll | desktop | viewed_with_findings | 已目视 | F4 | RAGDOLL-PRIMARY-FITS,PERIPHERAL-SHAPES-TOUCH-EDGE | `output/playwright/learning-coverage/matter-ragdoll-desktop.png` |
| 30 | matter-desktop | matter-chains | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-chains-desktop.png` |
| 31 | matter-desktop | matter-constraints | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-constraints-desktop.png` |
| 32 | matter-desktop | matter-collisionFiltering | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-collisionFiltering-desktop.png` |
| 33 | matter-desktop | matter-compositeManipulation | desktop | viewed_with_findings | 已目视 | F4 | COMPOSITE-GROUP-FITS | `output/playwright/learning-coverage/matter-compositeManipulation-desktop.png` |
| 34 | matter-desktop | matter-events | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-events-desktop.png` |
| 35 | matter-desktop | matter-manipulation | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-manipulation-desktop.png` |
| 36 | matter-desktop | matter-raycasting | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-raycasting-desktop.png` |
| 37 | matter-desktop | matter-remove | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-remove-desktop.png` |
| 38 | matter-desktop | matter-renderResize | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-renderResize-desktop.png` |
| 39 | matter-desktop | matter-sensors | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-sensors-desktop.png` |
| 40 | matter-desktop | matter-sleeping | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-sleeping-desktop.png` |
| 41 | matter-desktop | matter-sprites | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-sprites-desktop.png` |
| 42 | matter-desktop | matter-stats | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-stats-desktop.png` |
| 43 | matter-desktop | matter-stress | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-stress-desktop.png` |
| 44 | matter-desktop | matter-stress2 | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-stress2-desktop.png` |
| 45 | matter-desktop | matter-stress3 | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-stress3-desktop.png` |
| 46 | matter-desktop | matter-stress4 | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-stress4-desktop.png` |
| 47 | matter-desktop | matter-substep | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-substep-desktop.png` |
| 48 | matter-desktop | matter-views | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/matter-views-desktop.png` |
| 49 | matter-mobile | matter-airFriction | mobile | viewed_with_findings | 未复拍（保留首轮） | F5 | — | `output/playwright/learning-coverage/matter-airFriction-mobile.png` |
| 50 | matter-mobile | matter-bridge | mobile | viewed_with_findings | 未复拍（保留首轮） | F5 | — | `output/playwright/learning-coverage/matter-bridge-mobile.png` |
| 51 | matter-mobile | matter-slingshot | mobile | viewed_with_findings | 未复拍（保留首轮） | F5 | — | `output/playwright/learning-coverage/matter-slingshot-mobile.png` |
| 52 | matter-mobile | matter-cloth | mobile | viewed_with_findings | 未复拍（保留首轮） | F5 | — | `output/playwright/learning-coverage/matter-cloth-mobile.png` |
| 53 | matter-mobile | matter-collisionFiltering | mobile | viewed_with_findings | 未复拍（保留首轮） | F5 | — | `output/playwright/learning-coverage/matter-collisionFiltering-mobile.png` |
| 54 | matter-mobile | matter-substep | mobile | viewed_with_findings | 未复拍（保留首轮） | F5 | — | `output/playwright/learning-coverage/matter-substep-mobile.png` |
| 55 | matter-mobile | matter-views | mobile | viewed_with_findings | 未复拍（保留首轮） | F5 | — | `output/playwright/learning-coverage/matter-views-mobile.png` |
| 56 | phet-standalone | phet-forces-and-motion-basics-net-force | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-forces-and-motion-basics-net-force-desktop.png` |
| 57 | phet-standalone | phet-forces-and-motion-basics-motion | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-forces-and-motion-basics-motion-desktop.png` |
| 58 | phet-standalone | phet-forces-and-motion-basics-friction | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-forces-and-motion-basics-friction-desktop.png` |
| 59 | phet-standalone | phet-forces-and-motion-basics-acceleration | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-forces-and-motion-basics-acceleration-desktop.png` |
| 60 | phet-host-desktop | phet-forces-and-motion-basics-host | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/phet-forces-and-motion-basics-host-desktop.png` |
| 61 | phet-host-mobile | phet-forces-and-motion-basics-host | mobile | viewed_with_findings | 已目视 | F2 | HOST-FRAME-SHOWS-CHOOSER | `output/playwright/learning-coverage/phet-forces-and-motion-basics-host-mobile.png` |
| 62 | phet-standalone | phet-energy-skate-park-basics-intro | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-energy-skate-park-basics-intro-desktop.png` |
| 63 | phet-standalone | phet-energy-skate-park-basics-friction | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-energy-skate-park-basics-friction-desktop.png` |
| 64 | phet-standalone | phet-energy-skate-park-basics-playground | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-energy-skate-park-basics-playground-desktop.png` |
| 65 | phet-host-desktop | phet-energy-skate-park-basics-host | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/phet-energy-skate-park-basics-host-desktop.png` |
| 66 | phet-standalone | phet-area-builder-explore | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-area-builder-explore-desktop.png` |
| 67 | phet-standalone | phet-area-builder-game | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-area-builder-game-desktop.png` |
| 68 | phet-host-desktop | phet-area-builder-host | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/phet-area-builder-host-desktop.png` |
| 69 | phet-host-mobile | phet-area-builder-host | mobile | viewed_with_findings | 已目视 | F2 | HOST-FRAME-SHOWS-CHOOSER | `output/playwright/learning-coverage/phet-area-builder-host-mobile.png` |
| 70 | phet-standalone | phet-vector-addition-explore-1d | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-vector-addition-explore-1d-desktop.png` |
| 71 | phet-standalone | phet-vector-addition-explore-2d | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-vector-addition-explore-2d-desktop.png` |
| 72 | phet-standalone | phet-vector-addition-lab | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-vector-addition-lab-desktop.png` |
| 73 | phet-standalone | phet-vector-addition-equations | desktop | viewed | 已目视 | — | — | `output/playwright/learning-coverage/phet-vector-addition-equations-desktop.png` |
| 74 | phet-host-desktop | phet-vector-addition-host | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/phet-vector-addition-host-desktop.png` |
| 75 | phet-standalone | phet-fractions-intro-intro | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-fractions-intro-intro-desktop.png` |
| 76 | phet-standalone | phet-fractions-intro-game | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-fractions-intro-game-desktop.png` |
| 77 | phet-standalone | phet-fractions-intro-lab | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-fractions-intro-lab-desktop.png` |
| 78 | phet-host-desktop | phet-fractions-intro-host | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/phet-fractions-intro-host-desktop.png` |
| 79 | phet-standalone | phet-fraction-matcher-fractions | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-fraction-matcher-fractions-desktop.png` |
| 80 | phet-standalone | phet-fraction-matcher-mixed-numbers | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-fraction-matcher-mixed-numbers-desktop.png` |
| 81 | phet-host-desktop | phet-fraction-matcher-host | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/phet-fraction-matcher-host-desktop.png` |
| 82 | phet-standalone | phet-balancing-act-intro | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-balancing-act-intro-desktop.png` |
| 83 | phet-standalone | phet-balancing-act-balance-lab | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-balancing-act-balance-lab-desktop.png` |
| 84 | phet-standalone | phet-balancing-act-game | desktop | viewed | 已目视 | — | — | `output/playwright/learning-coverage/phet-balancing-act-game-desktop.png` |
| 85 | phet-host-desktop | phet-balancing-act-host | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/phet-balancing-act-host-desktop.png` |
| 86 | phet-standalone | phet-circuit-construction-kit-dc-intro | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-circuit-construction-kit-dc-intro-desktop.png` |
| 87 | phet-standalone | phet-circuit-construction-kit-dc-lab | desktop | viewed_with_findings | 已目视 | F1 | — | `output/playwright/learning-coverage/phet-circuit-construction-kit-dc-lab-desktop.png` |
| 88 | phet-host-desktop | phet-circuit-construction-kit-dc-host | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/phet-circuit-construction-kit-dc-host-desktop.png` |
| 89 | phet-standalone | phet-states-of-matter-basics-states | desktop | viewed | 已目视 | — | — | `output/playwright/learning-coverage/phet-states-of-matter-basics-states-desktop.png` |
| 90 | phet-standalone | phet-states-of-matter-basics-phase-changes | desktop | viewed | 已目视 | — | — | `output/playwright/learning-coverage/phet-states-of-matter-basics-phase-changes-desktop.png` |
| 91 | phet-host-desktop | phet-states-of-matter-basics-host | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/phet-states-of-matter-basics-host-desktop.png` |
| 92 | phet-host-mobile | phet-states-of-matter-basics-host | mobile | viewed_with_findings | 已目视 | F2 | HOST-FRAME-SHOWS-CHOOSER | `output/playwright/learning-coverage/phet-states-of-matter-basics-host-mobile.png` |
| 93 | phet-standalone | phet-build-a-molecule-single-molecule | desktop | viewed_with_findings | 已目视 | F1 | BAM-EMPTY-SLOTS | `output/playwright/learning-coverage/phet-build-a-molecule-single-molecule-desktop.png` |
| 94 | phet-standalone | phet-build-a-molecule-multiple-molecules | desktop | viewed_with_findings | 已目视 | F1 | BAM-EMPTY-SLOTS | `output/playwright/learning-coverage/phet-build-a-molecule-multiple-molecules-desktop.png` |
| 95 | phet-standalone | phet-build-a-molecule-playground | desktop | viewed | 已目视 | — | — | `output/playwright/learning-coverage/phet-build-a-molecule-playground-desktop.png` |
| 96 | phet-host-desktop | phet-build-a-molecule-host | desktop | viewed | 未复拍（保留首轮） | — | — | `output/playwright/learning-coverage/phet-build-a-molecule-host-desktop.png` |
| 97 | legacy-tangram | tangram-legacy | desktop | viewed_with_findings | 已目视 | F3 | TANGRAM-CANVAS-GUIDE-SEPARATED | `output/playwright/learning-coverage/tangram-legacy-desktop.png` |
| 98 | legacy-tangram | tangram-legacy | mobile | viewed_with_findings | 已目视 | F3 | TANGRAM-CANVAS-GUIDE-SEPARATED | `output/playwright/learning-coverage/tangram-legacy-mobile.png` |
| 99 | phet-standalone | phet-forces-and-motion-basics-net-force | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-forces-and-motion-basics-net-force-mobile.png` |
| 100 | phet-standalone | phet-forces-and-motion-basics-motion | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-forces-and-motion-basics-motion-mobile.png` |
| 101 | phet-standalone | phet-forces-and-motion-basics-friction | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-forces-and-motion-basics-friction-mobile.png` |
| 102 | phet-standalone | phet-forces-and-motion-basics-acceleration | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-forces-and-motion-basics-acceleration-mobile.png` |
| 103 | phet-standalone | phet-energy-skate-park-basics-intro | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-energy-skate-park-basics-intro-mobile.png` |
| 104 | phet-standalone | phet-energy-skate-park-basics-friction | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-energy-skate-park-basics-friction-mobile.png` |
| 105 | phet-standalone | phet-energy-skate-park-basics-playground | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-energy-skate-park-basics-playground-mobile.png` |
| 106 | phet-standalone | phet-area-builder-explore | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-area-builder-explore-mobile.png` |
| 107 | phet-standalone | phet-area-builder-game | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-area-builder-game-mobile.png` |
| 108 | phet-standalone | phet-vector-addition-explore-1d | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-vector-addition-explore-1d-mobile.png` |
| 109 | phet-standalone | phet-vector-addition-explore-2d | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-vector-addition-explore-2d-mobile.png` |
| 110 | phet-standalone | phet-vector-addition-lab | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-vector-addition-lab-mobile.png` |
| 111 | phet-standalone | phet-vector-addition-equations | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-vector-addition-equations-mobile.png` |
| 112 | phet-standalone | phet-fractions-intro-intro | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-fractions-intro-intro-mobile.png` |
| 113 | phet-standalone | phet-fractions-intro-game | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-fractions-intro-game-mobile.png` |
| 114 | phet-standalone | phet-fractions-intro-lab | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-fractions-intro-lab-mobile.png` |
| 115 | phet-standalone | phet-fraction-matcher-fractions | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-fraction-matcher-fractions-mobile.png` |
| 116 | phet-standalone | phet-fraction-matcher-mixed-numbers | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-fraction-matcher-mixed-numbers-mobile.png` |
| 117 | phet-standalone | phet-balancing-act-intro | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-balancing-act-intro-mobile.png` |
| 118 | phet-standalone | phet-balancing-act-balance-lab | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-balancing-act-balance-lab-mobile.png` |
| 119 | phet-standalone | phet-balancing-act-game | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-balancing-act-game-mobile.png` |
| 120 | phet-standalone | phet-circuit-construction-kit-dc-intro | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-circuit-construction-kit-dc-intro-mobile.png` |
| 121 | phet-standalone | phet-circuit-construction-kit-dc-lab | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-circuit-construction-kit-dc-lab-mobile.png` |
| 122 | phet-standalone | phet-states-of-matter-basics-states | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-states-of-matter-basics-states-mobile.png` |
| 123 | phet-standalone | phet-states-of-matter-basics-phase-changes | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-states-of-matter-basics-phase-changes-mobile.png` |
| 124 | phet-standalone | phet-build-a-molecule-single-molecule | mobile | — | 已目视 | — | BAM-EMPTY-SLOTS | `output/playwright/learning-coverage/phet-build-a-molecule-single-molecule-mobile.png` |
| 125 | phet-standalone | phet-build-a-molecule-multiple-molecules | mobile | — | 已目视 | — | BAM-EMPTY-SLOTS | `output/playwright/learning-coverage/phet-build-a-molecule-multiple-molecules-mobile.png` |
| 126 | phet-standalone | phet-build-a-molecule-playground | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/phet-build-a-molecule-playground-mobile.png` |
| 127 | phet-host-mobile | phet-forces-and-motion-basics-host | mobile | — | 已目视 | — | HOST-GUIDE-SEPARATE-CAPTURE | `output/playwright/learning-coverage/phet-forces-and-motion-basics-host-guide-mobile.png` |
| 128 | phet-host-mobile | phet-area-builder-host | mobile | — | 已目视 | — | HOST-GUIDE-SEPARATE-CAPTURE | `output/playwright/learning-coverage/phet-area-builder-host-guide-mobile.png` |
| 129 | phet-host-mobile | phet-states-of-matter-basics-host | mobile | — | 已目视 | — | HOST-GUIDE-SEPARATE-CAPTURE | `output/playwright/learning-coverage/phet-states-of-matter-basics-host-guide-mobile.png` |
| 130 | matter-mobile | matter-ragdoll | mobile | — | 已目视 | — | RAGDOLL-PRIMARY-FITS,PERIPHERAL-SHAPES-TOUCH-EDGE | `output/playwright/learning-coverage/matter-ragdoll-mobile.png` |
| 131 | matter-mobile | matter-compositeManipulation | mobile | — | 已目视 | — | COMPOSITE-GROUP-FITS | `output/playwright/learning-coverage/matter-compositeManipulation-mobile.png` |
| 132 | matter-mobile | matter-airFriction | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-airFriction-operate-mobile.png` |
| 133 | matter-mobile | matter-airFriction | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-airFriction-explain-mobile.png` |
| 134 | matter-mobile | matter-bridge | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-bridge-operate-mobile.png` |
| 135 | matter-mobile | matter-bridge | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-bridge-explain-mobile.png` |
| 136 | matter-mobile | matter-slingshot | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-slingshot-operate-mobile.png` |
| 137 | matter-mobile | matter-slingshot | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-slingshot-explain-mobile.png` |
| 138 | matter-mobile | matter-cloth | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-cloth-operate-mobile.png` |
| 139 | matter-mobile | matter-cloth | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-cloth-explain-mobile.png` |
| 140 | matter-mobile | matter-collisionFiltering | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-collisionFiltering-operate-mobile.png` |
| 141 | matter-mobile | matter-collisionFiltering | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-collisionFiltering-explain-mobile.png` |
| 142 | matter-mobile | matter-substep | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-substep-operate-mobile.png` |
| 143 | matter-mobile | matter-substep | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-substep-explain-mobile.png` |
| 144 | matter-mobile | matter-views | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-views-operate-mobile.png` |
| 145 | matter-mobile | matter-views | mobile | — | 已目视 | — | — | `output/playwright/learning-coverage/matter-views-explain-mobile.png` |

## 范围与限制

82/82张本轮指定图片都已逐一打开查看。其余63条初轮路径保留历史记录但没有在本轮重拍。截图本身不证明触屏、鼠标拖放、按钮或键盘操作，交互证据仅按对应browser报告的机器检查记录。本轮只更新这两份视觉报告，没有修改应用、测试或vendor。
