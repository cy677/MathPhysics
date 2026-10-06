# PhET 原生数理题视觉验收

- 审阅模型：gpt-6-luna；effort：max。
- 最终覆盖：69 个原始题库项全部有最终目视状态；首轮69张加定向复审6张，共75个唯一截图路径实际查看。
- 首轮：62张通过、1张通过但注明手机触控控件偏小、6张截图有边缘裁切。六张首轮记录仍保留为 finding 历史，分别由六张新图复审关闭。
- 最终：68项清晰通过，1项保留轻微触控目标说明，0项未解决视觉发现。

## 六项定向复审

| 原始题库 ID | 首轮截图 | 新复审截图 | 最终目视结论 |
| --- | --- | --- | --- || fractions-intro/shape/level-3 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-3.png | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-3-rereview.png | 完整卡可见。题意列出4/4、2/6、2/3及可用材料；步骤分别以1/1、1/3、1/2+1/6实现，算式与目标相符。三条提示、全部常见错误及末行均完整可读。 |
| fractions-intro/shape/level-4 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-4.png | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-4-rereview.png | 完整卡可见。三个1/2目标对应1/2、1/3+1/6、1/3+1/6；题意、三提示、完整步骤和全部常见错误均可读至卡片底边。 |
| fractions-intro/shape/level-7 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-7.png | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-7-rereview.png | 完整卡可见。2/3、2/3、1/2、1/2目标与1/2+1/6、1/4+1/4+1/6、三块1/6、四块1/8的步骤相符；全部字段完整可读。 |
| family/fractions-intro/shape-PIE | output/playwright/learning-coverage/phet-questions/family-fractions-intro-shape-PIE.png | output/playwright/learning-coverage/phet-questions/family-fractions-intro-shape-PIE-rereview.png | 完整卡可见。圆形分数题意为1/3、1/2、2/2，步骤分别用1/3、1/2、1/1表示；三提示、完整解答及全部常见错误均可读。 |
| family/fractions-intro/number | output/playwright/learning-coverage/phet-questions/family-fractions-intro-number.png | output/playwright/learning-coverage/phet-questions/family-fractions-intro-number-rereview.png | 完整卡可见。目标1/3、2/3、1/2与分子/分母卡及等值核对步骤相符；三提示、完整解答、全部常见错误及末行均可读。 |
| fraction-matcher/fractions/level-2 | output/playwright/learning-coverage/phet-questions/fraction-matcher-fractions-level-2.png | output/playwright/learning-coverage/phet-questions/fraction-matcher-fractions-level-2-rereview.png | 完整卡可见。十二张卡的图形/数字分数描述与等值配对步骤清楚，分数乘法核对可读，三条常见错误和卡片底部完整呈现。 |
六张新图均实际查看完整卡片：标题、本题首句、三条递进提示、完整解题步骤、全部常见错误和底边均可见；分数分份与可用材料数量可从题意中读出，算式与目标相符。fraction-matcher 例题的等值分数核对清晰。检查没有依赖 DOM/bbox 或 browser pass 字段代替目视。

## 响应式视口

| ID | 最终状态 | 目视结果 |
| --- | --- | --- || area-mobile-current-question |  | 手机视口中 PhET 原生画布控件整体偏小，触控目标不宽裕；截图中控件可见，题卡与画布没有重叠或遮挡。 |
| matcher-tablet-current-question |  | 画布与题卡分区清楚，无重叠；题卡内容延伸到视口下方，呈现为可滚动内容，当前视口可见部分文字清晰。 |
| balance-desktop-current-question |  | 桌面视口中科学画布与题卡分栏清楚，控件和题卡可读，无遮挡或横向溢出。 |
手机视口的 PhET 原生控件虽可见，但相对偏小，静态截图不能验证实际触控命中体验。平板题卡内容延伸到视口下方，作为可滚动内容显示；桌面画布与题卡分栏清楚。

## 75 个实际查看路径

首轮69条逐图记录继续保留原始状态；新增6条标为定向复审通过。每条路径均对应一次实际原图查看。

| ID | 图像路径 | 最终状态 | 观察 |
| --- | --- | --- | --- || area-builder/game/level-1 | output/playwright/learning-coverage/phet-questions/area-builder-game-level-1.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| area-builder/game/level-2 | output/playwright/learning-coverage/phet-questions/area-builder-game-level-2.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| area-builder/game/level-3 | output/playwright/learning-coverage/phet-questions/area-builder-game-level-3.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| area-builder/game/level-4 | output/playwright/learning-coverage/phet-questions/area-builder-game-level-4.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| area-builder/game/level-5 | output/playwright/learning-coverage/phet-questions/area-builder-game-level-5.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| area-builder/game/level-6 | output/playwright/learning-coverage/phet-questions/area-builder-game-level-6.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/area-builder/areaConstructed | output/playwright/learning-coverage/phet-questions/family-area-builder-areaConstructed.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/area-builder/areaEntered-orthogonal | output/playwright/learning-coverage/phet-questions/family-area-builder-areaEntered-orthogonal.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/area-builder/areaAndPerimeterConstructed | output/playwright/learning-coverage/phet-questions/family-area-builder-areaAndPerimeterConstructed.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/area-builder/areaEntered-hole | output/playwright/learning-coverage/phet-questions/family-area-builder-areaEntered-hole.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/area-builder/areaEntered-diagonal | output/playwright/learning-coverage/phet-questions/family-area-builder-areaEntered-diagonal.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/area-builder/areaAndProportionConstructed | output/playwright/learning-coverage/phet-questions/family-area-builder-areaAndProportionConstructed.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/area-builder/areaPerimeterAndProportionConstructed | output/playwright/learning-coverage/phet-questions/family-area-builder-areaPerimeterAndProportionConstructed.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| area-mobile-current-question | output/playwright/learning-coverage/phet-questions/area-mobile-current-question.png | pass | 手机视口中 PhET 原生画布控件整体偏小，触控目标不宽裕；截图中控件可见，题卡与画布没有重叠或遮挡。 |
| fractions-intro/shape/level-1 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-1.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/shape/level-2 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-2.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/shape/level-3 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-3.png | 首轮 finding；已由新图复审通过 | 题卡截图上边缘截断：未显示“本题学习”标题，题意首行贴边/缺失；下方提示与解答可见。 |
| fractions-intro/shape/level-4 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-4.png | 首轮 finding；已由新图复审通过 | 题卡截图上边缘截断：未显示“本题学习”标题，题意首行贴边/缺失；下方提示与解答可见。 |
| fractions-intro/shape/level-5 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-5.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/shape/level-6 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-6.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/shape/level-7 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-7.png | 首轮 finding；已由新图复审通过 | 题卡截图上边缘截断：未显示“本题学习”标题，题意首行贴边/缺失；下方提示与解答可见。 |
| fractions-intro/shape/level-8 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-8.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/shape/level-9 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-9.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/shape/level-10 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-10.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/number/level-1 | output/playwright/learning-coverage/phet-questions/fractions-intro-number-level-1.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/number/level-2 | output/playwright/learning-coverage/phet-questions/fractions-intro-number-level-2.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/number/level-3 | output/playwright/learning-coverage/phet-questions/fractions-intro-number-level-3.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/number/level-4 | output/playwright/learning-coverage/phet-questions/fractions-intro-number-level-4.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/number/level-5 | output/playwright/learning-coverage/phet-questions/fractions-intro-number-level-5.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/number/level-6 | output/playwright/learning-coverage/phet-questions/fractions-intro-number-level-6.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/number/level-7 | output/playwright/learning-coverage/phet-questions/fractions-intro-number-level-7.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/number/level-8 | output/playwright/learning-coverage/phet-questions/fractions-intro-number-level-8.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/number/level-9 | output/playwright/learning-coverage/phet-questions/fractions-intro-number-level-9.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fractions-intro/number/level-10 | output/playwright/learning-coverage/phet-questions/fractions-intro-number-level-10.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/fractions-intro/shape-BAR | output/playwright/learning-coverage/phet-questions/family-fractions-intro-shape-BAR.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/fractions-intro/shape-PIE | output/playwright/learning-coverage/phet-questions/family-fractions-intro-shape-PIE.png | 首轮 finding；已由新图复审通过 | 截图上边缘从题意中段开始，缺少标题/题意开头；下边缘也未呈现完整常见错误与卡片底部。 |
| family/fractions-intro/number | output/playwright/learning-coverage/phet-questions/family-fractions-intro-number.png | 首轮 finding；已由新图复审通过 | 截图上边缘从题意中段开始，缺少标题/题意开头；下边缘也未呈现完整常见错误与卡片底部。 |
| fraction-matcher/fractions/level-1 | output/playwright/learning-coverage/phet-questions/fraction-matcher-fractions-level-1.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/fractions/level-2 | output/playwright/learning-coverage/phet-questions/fraction-matcher-fractions-level-2.png | 首轮 finding；已由新图复审通过 | 截图在“常见错误”第一条后结束，后两条及卡片底部未显示。 |
| fraction-matcher/fractions/level-3 | output/playwright/learning-coverage/phet-questions/fraction-matcher-fractions-level-3.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/fractions/level-4 | output/playwright/learning-coverage/phet-questions/fraction-matcher-fractions-level-4.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/fractions/level-5 | output/playwright/learning-coverage/phet-questions/fraction-matcher-fractions-level-5.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/fractions/level-6 | output/playwright/learning-coverage/phet-questions/fraction-matcher-fractions-level-6.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/fractions/level-7 | output/playwright/learning-coverage/phet-questions/fraction-matcher-fractions-level-7.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/fractions/level-8 | output/playwright/learning-coverage/phet-questions/fraction-matcher-fractions-level-8.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/mixed-numbers/level-1 | output/playwright/learning-coverage/phet-questions/fraction-matcher-mixed-numbers-level-1.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/mixed-numbers/level-2 | output/playwright/learning-coverage/phet-questions/fraction-matcher-mixed-numbers-level-2.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/mixed-numbers/level-3 | output/playwright/learning-coverage/phet-questions/fraction-matcher-mixed-numbers-level-3.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/mixed-numbers/level-4 | output/playwright/learning-coverage/phet-questions/fraction-matcher-mixed-numbers-level-4.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/mixed-numbers/level-5 | output/playwright/learning-coverage/phet-questions/fraction-matcher-mixed-numbers-level-5.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/mixed-numbers/level-6 | output/playwright/learning-coverage/phet-questions/fraction-matcher-mixed-numbers-level-6.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/mixed-numbers/level-7 | output/playwright/learning-coverage/phet-questions/fraction-matcher-mixed-numbers-level-7.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| fraction-matcher/mixed-numbers/level-8 | output/playwright/learning-coverage/phet-questions/fraction-matcher-mixed-numbers-level-8.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/fraction-matcher/fractions | output/playwright/learning-coverage/phet-questions/family-fraction-matcher-fractions.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/fraction-matcher/mixed-numbers | output/playwright/learning-coverage/phet-questions/family-fraction-matcher-mixed-numbers.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| matcher-tablet-current-question | output/playwright/learning-coverage/phet-questions/matcher-tablet-current-question.png | pass | 画布与题卡分区清楚，无重叠；题卡内容延伸到视口下方，呈现为可滚动内容，当前视口可见部分文字清晰。 |
| balancing-act/game/level-1 | output/playwright/learning-coverage/phet-questions/balancing-act-game-level-1.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| balancing-act/game/level-2 | output/playwright/learning-coverage/phet-questions/balancing-act-game-level-2.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| balancing-act/game/level-3 | output/playwright/learning-coverage/phet-questions/balancing-act-game-level-3.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| balancing-act/game/level-4 | output/playwright/learning-coverage/phet-questions/balancing-act-game-level-4.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/balancing-act/position | output/playwright/learning-coverage/phet-questions/family-balancing-act-position.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/balancing-act/tilt | output/playwright/learning-coverage/phet-questions/family-balancing-act-tilt.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| family/balancing-act/mass | output/playwright/learning-coverage/phet-questions/family-balancing-act-mass.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| balance-desktop-current-question | output/playwright/learning-coverage/phet-questions/balance-desktop-current-question.png | pass | 桌面视口中科学画布与题卡分栏清楚，控件和题卡可读，无遮挡或横向溢出。 |
| file/area-builder/game/level-1 | output/playwright/learning-coverage/phet-questions/file-area-builder-game-level-1.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| file/fractions-intro/shape/level-1 | output/playwright/learning-coverage/phet-questions/file-fractions-intro-shape-level-1.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| file/fraction-matcher/fractions/level-1 | output/playwright/learning-coverage/phet-questions/file-fraction-matcher-fractions-level-1.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| file/fraction-matcher/mixed-numbers/level-1 | output/playwright/learning-coverage/phet-questions/file-fraction-matcher-mixed-numbers-level-1.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| file/balancing-act/game/level-1 | output/playwright/learning-coverage/phet-questions/file-balancing-act-game-level-1.png | pass | 标题/题意、三步提示、解答步骤与常见错误均可读；截图内未见数学符号、数字或卡片边界裁切，也未见横向溢出。 |
| rereview/fractions-intro/shape/level-3 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-3-rereview.png | pass（定向复审） | 完整卡可见。题意列出4/4、2/6、2/3及可用材料；步骤分别以1/1、1/3、1/2+1/6实现，算式与目标相符。三条提示、全部常见错误及末行均完整可读。 |
| rereview/fractions-intro/shape/level-4 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-4-rereview.png | pass（定向复审） | 完整卡可见。三个1/2目标对应1/2、1/3+1/6、1/3+1/6；题意、三提示、完整步骤和全部常见错误均可读至卡片底边。 |
| rereview/fractions-intro/shape/level-7 | output/playwright/learning-coverage/phet-questions/fractions-intro-shape-level-7-rereview.png | pass（定向复审） | 完整卡可见。2/3、2/3、1/2、1/2目标与1/2+1/6、1/4+1/4+1/6、三块1/6、四块1/8的步骤相符；全部字段完整可读。 |
| rereview/fraction-matcher/fractions/level-2 | output/playwright/learning-coverage/phet-questions/fraction-matcher-fractions-level-2-rereview.png | pass（定向复审） | 完整卡可见。十二张卡的图形/数字分数描述与等值配对步骤清楚，分数乘法核对可读，三条常见错误和卡片底部完整呈现。 |
| rereview/family/fractions-intro/shape-PIE | output/playwright/learning-coverage/phet-questions/family-fractions-intro-shape-PIE-rereview.png | pass（定向复审） | 完整卡可见。圆形分数题意为1/3、1/2、2/2，步骤分别用1/3、1/2、1/1表示；三提示、完整解答及全部常见错误均可读。 |
| rereview/family/fractions-intro/number | output/playwright/learning-coverage/phet-questions/family-fractions-intro-number-rereview.png | pass（定向复审） | 完整卡可见。目标1/3、2/3、1/2与分子/分母卡及等值核对步骤相符；三提示、完整解答、全部常见错误及末行均可读。 |
## 限制

题卡 PNG 只显示题卡侧栏；具体 PhET 画布图形仅在3张 viewport 样本中直接可见，不能声称已逐配置目视核对所有动态画布分区或随机颜色状态。截图覆盖配置、题型代表、文件题卡及视口样本，不是768个随机题态的视觉穷举。

逐图历史状态、复审关系、实际查看标记、SHA 和捕获旁证见 visual-phet-questions.json。
