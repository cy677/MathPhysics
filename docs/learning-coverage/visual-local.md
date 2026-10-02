# 本地课堂截图视觉验收

- 检查模型：luna max。
- 日期：2026-10-01。
- 来源：docs/learning-coverage/local-classrooms.json；逐一用 view_image 目视查看所有引用的唯一截图。
- 截图结果：298 个唯一路径已查看，298 个均通过。基础名录 293 个唯一路径，专项 rereview 新增 5 个唯一路径；初轮发现的 2 张 Tangram 截图范围异常已通过补拍复审关闭。
- 覆盖分组：JSX 23 张、几何 72 张、航天 178 张、七巧板 6 张、desktop viewport 4 张、mobile viewport/teaching 及 rereview 15 张。
- 主要检查：中文文字和标注可读、图形完整、无遮挡/裁切/横向溢出；场景控制、暂停/播放、重置、时间轴/速度控制在截图内可见；教学说明和题意、分步提示、过程与常见错误展开的布局可读；示例内容由直观图形进入原理说明。

## Tangram 截图范围异常已解决

初轮的 tangram-square-question.png 与 tangram-creative-question.png 在长图上方混入大块空白及单独的重置按钮栏，题卡内容从中段后出现，因此当时标为截图证据待修。Sol 将 viewport 扩展至完整 aside 题卡高度后重拍；本轮我只复看这两张更新图，确认两张均完整显示题意标题、难度选择、查看按钮、完成状态、提示、分步内容、完整解题过程和常见错误，文字清晰，卡片无裁切，也不再混入初轮的空白区和无关按钮栏。两张截图最终均通过。补拍记录为 output/playwright/learning-coverage/local/tangram-framing-rereview.json，其中 wholePanelInViewport、asideNotClipping 均为 true。

## 已关闭的标签问题

向量标签在移动端/初始态曾叠压；复看更新后的 mobile-jsx-vectors-viewport.png、mobile-jsx-vectors-target-viewport.png、jsx-vectors-390-initial-scene.png、mobile-jsx-vectors-target-scene.png 与 jsx-vectors-1512-initial-scene.png 后，箭头及终点文字分开且可读。US/CN crew deorbit 的“制动推力”曾与箭线拥挤；复看 space-stage-us-crew-deorbit-scene.png 和 space-stage-cn-crew-deorbit-scene.png 后，标注位于箭线上方，清楚可辨。两项均关闭。 manifest 的 vector-and-deorbit-labels rereview 记录为 status=passed、visualStatus=pending；本报告已补上 luna max 对更新截图的目视复审，最终视觉状态为通过。

## Desktop 与 mobile

4 张 desktop viewport（JSX、geometry、spaceflight、tangram）均通过；主图、标题和主要操作没有明显遮挡或横向裁切。15 张唯一 mobile 截图（6 个响应式样例，加 rereview 新捕获状态）除已关闭的向量标签问题外均通过；主要控件在窄屏内可见，说明文字换行后仍可读，没有发现横向溢出。球体几何的图形标注在窄屏上偏小，但图形仍可辨。

## 分组截图明细

每条记录列出所属 ID、对应相对路径与该路径结果。重复引用按 ID 展示；去重统计和每个路径的状态见 visual-local.json。

### 演示

| ID | 截图路径与结果 |
| --- | --- |
| jsx/triangle | output/playwright/learning-coverage/local/jsx-triangle-scene.png（通过）<br>output/playwright/learning-coverage/local/jsx-triangle-teaching.png（通过）<br>output/playwright/learning-coverage/local/jsx-triangle-question.png（通过） |
| jsx/mirror | output/playwright/learning-coverage/local/jsx-mirror-scene.png（通过）<br>output/playwright/learning-coverage/local/jsx-mirror-teaching.png（通过）<br>output/playwright/learning-coverage/local/jsx-mirror-question.png（通过） |
| jsx/rotate | output/playwright/learning-coverage/local/jsx-rotate-scene.png（通过）<br>output/playwright/learning-coverage/local/jsx-rotate-teaching.png（通过）<br>output/playwright/learning-coverage/local/jsx-rotate-question.png（通过） |
| jsx/scale | output/playwright/learning-coverage/local/jsx-scale-scene.png（通过）<br>output/playwright/learning-coverage/local/jsx-scale-teaching.png（通过）<br>output/playwright/learning-coverage/local/jsx-scale-question.png（通过） |
| jsx/vectors | output/playwright/learning-coverage/local/jsx-vectors-scene.png（通过）<br>output/playwright/learning-coverage/local/jsx-vectors-teaching.png（通过）<br>output/playwright/learning-coverage/local/jsx-vectors-question.png（通过） |
| jsx/linear | output/playwright/learning-coverage/local/jsx-linear-scene.png（通过）<br>output/playwright/learning-coverage/local/jsx-linear-teaching.png（通过）<br>output/playwright/learning-coverage/local/jsx-linear-question.png（通过） |
| jsx/triangle/free | output/playwright/learning-coverage/local/jsx-triangle-scene.png（通过）<br>output/playwright/learning-coverage/local/jsx-triangle-teaching.png（通过）<br>output/playwright/learning-coverage/local/jsx-triangle-question.png（通过） |
| jsx/triangle/equal-height | output/playwright/learning-coverage/local/jsx-triangle-equal-height-scene.png（通过）<br>output/playwright/learning-coverage/local/jsx-triangle-equal-height-teaching.png（通过）<br>output/playwright/learning-coverage/local/jsx-triangle-equal-height-question.png（通过） |
| geometry/rectangle | output/playwright/learning-coverage/local/geometry-rectangle-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-rectangle-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-rectangle-question.png（通过） |
| geometry/parallelogram | output/playwright/learning-coverage/local/geometry-parallelogram-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-parallelogram-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-parallelogram-question.png（通过） |
| geometry/triangle | output/playwright/learning-coverage/local/geometry-triangle-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-triangle-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-triangle-question.png（通过） |
| geometry/trapezoid | output/playwright/learning-coverage/local/geometry-trapezoid-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-trapezoid-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-trapezoid-question.png（通过） |
| geometry/rhombus | output/playwright/learning-coverage/local/geometry-rhombus-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-rhombus-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-rhombus-question.png（通过） |
| geometry/circle | output/playwright/learning-coverage/local/geometry-circle-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-circle-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-circle-question.png（通过） |
| geometry/sector | output/playwright/learning-coverage/local/geometry-sector-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-sector-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-sector-question.png（通过） |
| geometry/annulus | output/playwright/learning-coverage/local/geometry-annulus-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-annulus-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-annulus-question.png（通过） |
| geometry/triangle-ratio | output/playwright/learning-coverage/local/geometry-triangle-ratio-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-triangle-ratio-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-triangle-ratio-question.png（通过） |
| geometry/similarity | output/playwright/learning-coverage/local/geometry-similarity-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-similarity-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-similarity-question.png（通过） |
| geometry/square-sum | output/playwright/learning-coverage/local/geometry-square-sum-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-square-sum-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-square-sum-question.png（通过） |
| geometry/square-minus | output/playwright/learning-coverage/local/geometry-square-minus-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-square-minus-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-square-minus-question.png（通过） |
| geometry/difference-squares | output/playwright/learning-coverage/local/geometry-difference-squares-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-difference-squares-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-difference-squares-question.png（通过） |
| geometry/distributive | output/playwright/learning-coverage/local/geometry-distributive-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-distributive-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-distributive-question.png（通过） |
| geometry/pythagoras | output/playwright/learning-coverage/local/geometry-pythagoras-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-pythagoras-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-pythagoras-question.png（通过） |
| geometry/cuboid | output/playwright/learning-coverage/local/geometry-cuboid-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-cuboid-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-cuboid-question.png（通过） |
| geometry/cuboid-net | output/playwright/learning-coverage/local/geometry-cuboid-net-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-cuboid-net-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-cuboid-net-question.png（通过） |
| geometry/prism | output/playwright/learning-coverage/local/geometry-prism-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-prism-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-prism-question.png（通过） |
| geometry/cylinder | output/playwright/learning-coverage/local/geometry-cylinder-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-cylinder-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-cylinder-question.png（通过） |
| geometry/cylinder-net | output/playwright/learning-coverage/local/geometry-cylinder-net-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-cylinder-net-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-cylinder-net-question.png（通过） |
| geometry/pyramid | output/playwright/learning-coverage/local/geometry-pyramid-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-pyramid-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-pyramid-question.png（通过） |
| geometry/cone | output/playwright/learning-coverage/local/geometry-cone-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-cone-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-cone-question.png（通过） |
| geometry/sphere | output/playwright/learning-coverage/local/geometry-sphere-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-sphere-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-sphere-question.png（通过） |
| geometry/volume-scale | output/playwright/learning-coverage/local/geometry-volume-scale-scene.png（通过）<br>output/playwright/learning-coverage/local/geometry-volume-scale-teaching.png（通过）<br>output/playwright/learning-coverage/local/geometry-volume-scale-question.png（通过） |
| space/route/us-crew | output/playwright/learning-coverage/local/space-route-us-crew-teaching.png（通过） |
| space/stage/us-crew/prepare | output/playwright/learning-coverage/local/space-stage-us-crew-prepare-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-prepare-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-prepare-question.png（通过） |
| space/stage/us-crew/launch | output/playwright/learning-coverage/local/space-stage-us-crew-launch-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-launch-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-launch-question.png（通过） |
| space/stage/us-crew/turn | output/playwright/learning-coverage/local/space-stage-us-crew-turn-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-turn-teaching.png（通过） |
| space/stage/us-crew/maxq | output/playwright/learning-coverage/local/space-stage-us-crew-maxq-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-maxq-teaching.png（通过） |
| space/stage/us-crew/fstage | output/playwright/learning-coverage/local/space-stage-us-crew-fstage-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-fstage-teaching.png（通过） |
| space/stage/us-crew/upper | output/playwright/learning-coverage/local/space-stage-us-crew-upper-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-upper-teaching.png（通过） |
| space/stage/us-crew/craftSep | output/playwright/learning-coverage/local/space-stage-us-crew-craftSep-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-craftSep-teaching.png（通过） |
| space/stage/us-crew/activation | output/playwright/learning-coverage/local/space-stage-us-crew-activation-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-activation-teaching.png（通过） |
| space/stage/us-crew/phase | output/playwright/learning-coverage/local/space-stage-us-crew-phase-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-phase-teaching.png（通过） |
| space/stage/us-crew/approach | output/playwright/learning-coverage/local/space-stage-us-crew-approach-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-approach-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-approach-question.png（通过） |
| space/stage/us-crew/dock | output/playwright/learning-coverage/local/space-stage-us-crew-dock-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-dock-teaching.png（通过） |
| space/stage/us-crew/stay | output/playwright/learning-coverage/local/space-stage-us-crew-stay-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-stay-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-stay-question.png（通过） |
| space/stage/us-crew/undock | output/playwright/learning-coverage/local/space-stage-us-crew-undock-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-undock-teaching.png（通过） |
| space/stage/us-crew/deorbit | output/playwright/learning-coverage/local/space-stage-us-crew-deorbit-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-deorbit-teaching.png（通过） |
| space/stage/us-crew/trunk | output/playwright/learning-coverage/local/space-stage-us-crew-trunk-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-trunk-teaching.png（通过） |
| space/stage/us-crew/entry | output/playwright/learning-coverage/local/space-stage-us-crew-entry-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-entry-teaching.png（通过） |
| space/stage/us-crew/chute | output/playwright/learning-coverage/local/space-stage-us-crew-chute-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-chute-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-chute-question.png（通过） |
| space/stage/us-crew/splash | output/playwright/learning-coverage/local/space-stage-us-crew-splash-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-splash-teaching.png（通过） |
| space/stage/us-crew/finish | output/playwright/learning-coverage/local/space-stage-us-crew-finish-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-finish-teaching.png（通过） |
| space/stage/us-crew/recovery | output/playwright/learning-coverage/local/space-stage-us-crew-recovery-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-crew-recovery-teaching.png（通过） |
| space/route/us-sat | output/playwright/learning-coverage/local/space-route-us-sat-teaching.png（通过） |
| space/stage/us-sat/prepare | output/playwright/learning-coverage/local/space-stage-us-sat-prepare-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-prepare-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-prepare-question.png（通过） |
| space/stage/us-sat/launch | output/playwright/learning-coverage/local/space-stage-us-sat-launch-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-launch-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-launch-question.png（通过） |
| space/stage/us-sat/turn | output/playwright/learning-coverage/local/space-stage-us-sat-turn-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-turn-teaching.png（通过） |
| space/stage/us-sat/maxq | output/playwright/learning-coverage/local/space-stage-us-sat-maxq-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-maxq-teaching.png（通过） |
| space/stage/us-sat/fstage | output/playwright/learning-coverage/local/space-stage-us-sat-fstage-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-fstage-teaching.png（通过） |
| space/stage/us-sat/upper | output/playwright/learning-coverage/local/space-stage-us-sat-upper-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-upper-teaching.png（通过） |
| space/stage/us-sat/fairing | output/playwright/learning-coverage/local/space-stage-us-sat-fairing-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-fairing-teaching.png（通过） |
| space/stage/us-sat/deploy | output/playwright/learning-coverage/local/space-stage-us-sat-deploy-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-deploy-teaching.png（通过） |
| space/stage/us-sat/commission | output/playwright/learning-coverage/local/space-stage-us-sat-commission-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-commission-teaching.png（通过） |
| space/stage/us-sat/service | output/playwright/learning-coverage/local/space-stage-us-sat-service-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-service-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-service-question.png（通过） |
| space/stage/us-sat/recovery | output/playwright/learning-coverage/local/space-stage-us-sat-recovery-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-us-sat-recovery-teaching.png（通过） |
| space/route/cn-crew | output/playwright/learning-coverage/local/space-route-cn-crew-teaching.png（通过） |
| space/stage/cn-crew/prepare | output/playwright/learning-coverage/local/space-stage-cn-crew-prepare-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-prepare-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-prepare-question.png（通过） |
| space/stage/cn-crew/launch | output/playwright/learning-coverage/local/space-stage-cn-crew-launch-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-launch-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-launch-question.png（通过） |
| space/stage/cn-crew/turn | output/playwright/learning-coverage/local/space-stage-cn-crew-turn-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-turn-teaching.png（通过） |
| space/stage/cn-crew/tower | output/playwright/learning-coverage/local/space-stage-cn-crew-tower-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-tower-teaching.png（通过） |
| space/stage/cn-crew/boosters | output/playwright/learning-coverage/local/space-stage-cn-crew-boosters-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-boosters-teaching.png（通过） |
| space/stage/cn-crew/cstage | output/playwright/learning-coverage/local/space-stage-cn-crew-cstage-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-cstage-teaching.png（通过） |
| space/stage/cn-crew/fairing | output/playwright/learning-coverage/local/space-stage-cn-crew-fairing-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-fairing-teaching.png（通过） |
| space/stage/cn-crew/upper | output/playwright/learning-coverage/local/space-stage-cn-crew-upper-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-upper-teaching.png（通过） |
| space/stage/cn-crew/craftSep | output/playwright/learning-coverage/local/space-stage-cn-crew-craftSep-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-craftSep-teaching.png（通过） |
| space/stage/cn-crew/activation | output/playwright/learning-coverage/local/space-stage-cn-crew-activation-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-activation-teaching.png（通过） |
| space/stage/cn-crew/phase | output/playwright/learning-coverage/local/space-stage-cn-crew-phase-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-phase-teaching.png（通过） |
| space/stage/cn-crew/approach | output/playwright/learning-coverage/local/space-stage-cn-crew-approach-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-approach-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-approach-question.png（通过） |
| space/stage/cn-crew/dock | output/playwright/learning-coverage/local/space-stage-cn-crew-dock-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-dock-teaching.png（通过） |
| space/stage/cn-crew/stay | output/playwright/learning-coverage/local/space-stage-cn-crew-stay-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-stay-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-stay-question.png（通过） |
| space/stage/cn-crew/undock | output/playwright/learning-coverage/local/space-stage-cn-crew-undock-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-undock-teaching.png（通过） |
| space/stage/cn-crew/orbitalSep | output/playwright/learning-coverage/local/space-stage-cn-crew-orbitalSep-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-orbitalSep-teaching.png（通过） |
| space/stage/cn-crew/deorbit | output/playwright/learning-coverage/local/space-stage-cn-crew-deorbit-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-deorbit-teaching.png（通过） |
| space/stage/cn-crew/serviceSep | output/playwright/learning-coverage/local/space-stage-cn-crew-serviceSep-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-serviceSep-teaching.png（通过） |
| space/stage/cn-crew/entry | output/playwright/learning-coverage/local/space-stage-cn-crew-entry-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-entry-teaching.png（通过） |
| space/stage/cn-crew/chute | output/playwright/learning-coverage/local/space-stage-cn-crew-chute-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-chute-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-chute-question.png（通过） |
| space/stage/cn-crew/land | output/playwright/learning-coverage/local/space-stage-cn-crew-land-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-land-teaching.png（通过） |
| space/stage/cn-crew/finish | output/playwright/learning-coverage/local/space-stage-cn-crew-finish-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-crew-finish-teaching.png（通过） |
| space/route/cn-sat | output/playwright/learning-coverage/local/space-route-cn-sat-teaching.png（通过） |
| space/stage/cn-sat/prepare | output/playwright/learning-coverage/local/space-stage-cn-sat-prepare-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-prepare-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-prepare-question.png（通过） |
| space/stage/cn-sat/launch | output/playwright/learning-coverage/local/space-stage-cn-sat-launch-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-launch-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-launch-question.png（通过） |
| space/stage/cn-sat/turn | output/playwright/learning-coverage/local/space-stage-cn-sat-turn-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-turn-teaching.png（通过） |
| space/stage/cn-sat/cstage | output/playwright/learning-coverage/local/space-stage-cn-sat-cstage-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-cstage-teaching.png（通过） |
| space/stage/cn-sat/fairing | output/playwright/learning-coverage/local/space-stage-cn-sat-fairing-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-fairing-teaching.png（通过） |
| space/stage/cn-sat/third | output/playwright/learning-coverage/local/space-stage-cn-sat-third-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-third-teaching.png（通过） |
| space/stage/cn-sat/coast | output/playwright/learning-coverage/local/space-stage-cn-sat-coast-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-coast-teaching.png（通过） |
| space/stage/cn-sat/transfer | output/playwright/learning-coverage/local/space-stage-cn-sat-transfer-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-transfer-teaching.png（通过） |
| space/stage/cn-sat/deploy | output/playwright/learning-coverage/local/space-stage-cn-sat-deploy-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-deploy-teaching.png（通过） |
| space/stage/cn-sat/commission | output/playwright/learning-coverage/local/space-stage-cn-sat-commission-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-commission-teaching.png（通过） |
| space/stage/cn-sat/service | output/playwright/learning-coverage/local/space-stage-cn-sat-service-scene.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-service-teaching.png（通过）<br>output/playwright/learning-coverage/local/space-stage-cn-sat-service-question.png（通过） |
| space/lab/thrust | output/playwright/learning-coverage/local/space-lab-thrust-scene.png（通过）<br>output/playwright/learning-coverage/local/space-lab-thrust-teaching.png（通过） |
| space/lab/staging | output/playwright/learning-coverage/local/space-lab-staging-scene.png（通过）<br>output/playwright/learning-coverage/local/space-lab-staging-teaching.png（通过） |
| space/lab/orbit | output/playwright/learning-coverage/local/space-lab-orbit-scene.png（通过）<br>output/playwright/learning-coverage/local/space-lab-orbit-teaching.png（通过） |
| space/lab/dock | output/playwright/learning-coverage/local/space-lab-dock-scene.png（通过）<br>output/playwright/learning-coverage/local/space-lab-dock-teaching.png（通过） |
| space/lab/power | output/playwright/learning-coverage/local/space-lab-power-scene.png（通过）<br>output/playwright/learning-coverage/local/space-lab-power-teaching.png（通过） |
| space/lab/freefall | output/playwright/learning-coverage/local/space-lab-freefall-scene.png（通过）<br>output/playwright/learning-coverage/local/space-lab-freefall-teaching.png（通过） |
| space/lab/entry | output/playwright/learning-coverage/local/space-lab-entry-scene.png（通过）<br>output/playwright/learning-coverage/local/space-lab-entry-teaching.png（通过） |
| space/lab/chute | output/playwright/learning-coverage/local/space-lab-chute-scene.png（通过）<br>output/playwright/learning-coverage/local/space-lab-chute-teaching.png（通过） |
| space/system/f9 | output/playwright/learning-coverage/local/space-system-f9-scene.png（通过）<br>output/playwright/learning-coverage/local/space-system-f9-teaching.png（通过） |
| space/system/dragon | output/playwright/learning-coverage/local/space-system-dragon-scene.png（通过）<br>output/playwright/learning-coverage/local/space-system-dragon-teaching.png（通过） |
| space/system/iss | output/playwright/learning-coverage/local/space-system-iss-scene.png（通过）<br>output/playwright/learning-coverage/local/space-system-iss-teaching.png（通过） |
| space/system/cz2f | output/playwright/learning-coverage/local/space-system-cz2f-scene.png（通过）<br>output/playwright/learning-coverage/local/space-system-cz2f-teaching.png（通过） |
| space/system/shenzhou | output/playwright/learning-coverage/local/space-system-shenzhou-scene.png（通过）<br>output/playwright/learning-coverage/local/space-system-shenzhou-teaching.png（通过） |
| space/system/tiangong | output/playwright/learning-coverage/local/space-system-tiangong-scene.png（通过）<br>output/playwright/learning-coverage/local/space-system-tiangong-teaching.png（通过） |
| space/system/cz3a | output/playwright/learning-coverage/local/space-system-cz3a-scene.png（通过）<br>output/playwright/learning-coverage/local/space-system-cz3a-teaching.png（通过） |
| tangram/square | output/playwright/learning-coverage/local/tangram-square-scene.png（通过）<br>output/playwright/learning-coverage/local/tangram-square-teaching.png（通过）<br>output/playwright/learning-coverage/local/tangram-square-question.png（通过，补拍复审） |
| tangram/creative | output/playwright/learning-coverage/local/tangram-creative-scene.png（通过）<br>output/playwright/learning-coverage/local/tangram-creative-teaching.png（通过）<br>output/playwright/learning-coverage/local/tangram-creative-question.png（通过，补拍复审） |

### Desktop viewport

| 模块 ID | 路径与结果 |
| --- | --- |
| jsx | output/playwright/learning-coverage/local/desktop-jsx-viewport.png（通过） |
| geometry | output/playwright/learning-coverage/local/desktop-geometry-viewport.png（通过） |
| spaceflight | output/playwright/learning-coverage/local/desktop-spaceflight-viewport.png（通过） |
| tangram | output/playwright/learning-coverage/local/desktop-tangram-viewport.png（通过） |

### Mobile viewport / teaching

| 响应式 ID | 路径与结果 |
| --- | --- |
| jsx-triangle | output/playwright/learning-coverage/local/mobile-jsx-triangle-viewport.png（通过）<br>output/playwright/learning-coverage/local/mobile-jsx-triangle-teaching.png（通过） |
| jsx-vectors | output/playwright/learning-coverage/local/mobile-jsx-vectors-viewport.png（通过）<br>output/playwright/learning-coverage/local/mobile-jsx-vectors-teaching.png（通过） |
| geometry-sphere | output/playwright/learning-coverage/local/mobile-geometry-sphere-viewport.png（通过）<br>output/playwright/learning-coverage/local/mobile-geometry-sphere-teaching.png（通过） |
| space-dock | output/playwright/learning-coverage/local/mobile-space-dock-viewport.png（通过）<br>output/playwright/learning-coverage/local/mobile-space-dock-teaching.png（通过） |
| space-journey | output/playwright/learning-coverage/local/mobile-space-journey-viewport.png（通过）<br>output/playwright/learning-coverage/local/mobile-space-journey-teaching.png（通过） |
| tangram-creative | output/playwright/learning-coverage/local/mobile-tangram-creative-viewport.png（通过）<br>output/playwright/learning-coverage/local/mobile-tangram-creative-teaching.png（通过） |

### 专项 rereview

#### vector-and-deorbit-labels

- output/playwright/learning-coverage/local/jsx-vectors-1512-initial-scene.png（通过）
- output/playwright/learning-coverage/local/jsx-vectors-scene.png（通过）
- output/playwright/learning-coverage/local/jsx-vectors-question.png（通过）
- output/playwright/learning-coverage/local/mobile-jsx-vectors-viewport.png（通过）
- output/playwright/learning-coverage/local/jsx-vectors-390-initial-scene.png（通过）
- output/playwright/learning-coverage/local/mobile-jsx-vectors-target-scene.png（通过）
- output/playwright/learning-coverage/local/mobile-jsx-vectors-question.png（通过）
- output/playwright/learning-coverage/local/mobile-jsx-vectors-teaching.png（通过）
- output/playwright/learning-coverage/local/mobile-jsx-vectors-target-viewport.png（通过）
- output/playwright/learning-coverage/local/space-stage-us-crew-deorbit-scene.png（通过）
- output/playwright/learning-coverage/local/space-stage-cn-crew-deorbit-scene.png（通过）

#### tangram-question-framing-rereview

- 初轮：tangram-square-question.png 与 tangram-creative-question.png 因 aside 长卡截图范围异常而待修。
- 补拍复审：两张同路径截图均重新查看并通过；完整题卡、提示、分步过程和常见错误可见。
- 捕获定位检查：wholePanelInViewport=true，asideNotClipping=true；来源 output/playwright/learning-coverage/local/tangram-framing-rereview.json。

## 106 道题的视觉范围与限制

manifest 记录 117 个 demo 与 106 道题的 HTTP/file 功能检查全部通过。106 道题没有逐题独立截图；此处只对 demo 截图中呈现的题目/答题反馈 UI 家族做目视检查，不把 manifest 功能通过等同于逐题视觉通过。可见题意、提示、过程、错误展开文字清晰，布局可读；两张 Tangram question 图的截图范围异常已补拍并复审通过。题目逐项功能结果仍以 manifest 为准。

## Machine-readable detail

每个实际查看的唯一截图路径、所属 ID、最终 status、findings 与补拍历史均记录于 docs/learning-coverage/visual-local.json。


