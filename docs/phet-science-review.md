# 三项实验的科学核查

核查日期：2026-10-03。范围：箭头导航、冷热变变变、分子搭建工坊的本地 PhET 模型、现有教学说明和新版界面。

结论：三项可用于各自的基础概念教学，但不能笼统称为真实世界的精确复刻。箭头运算符合数学规则；冷热模型有明确的物理简化；分子模型适合原子计数与连接识别，不能据此推断真实反应过程和精确分子几何。本次修正了误导性标注，补充了这些边界，没有重写上游科学模型。

## 核查结果与处理

| 模块 | 核查结论 | 已修正或补充 |
| --- | --- | --- |
| 箭头导航 | 分量相加、系数乘法、加减与闭合等式、非负模长和零向量无方向均符合数学定义 | 区分位移大小与路程，先约定单位；解释合箭头可平移，需自行对齐起点；说明结果箭头随所选等式变化；修正极坐标基向量控件将负径向参数误写成负长度的问题 |
| 冷热变变变 | 固体振动、液体移动、气体分散及压力来自碰壁动量传递，可作定性观察；没有模拟相变潜热 | 解释默认14 K约为−259°C，不是14°C；固体也在运动；热与温度不同；相变还取决于压力；状态按钮是预设；压盖或加入粒子也可能改变温度；不能从此模型测真实熔沸点、潜热和精密压力 |
| 分子搭建工坊 | 参考分子的原子种类、数量和连接数据与本地上游数据一致；原版收集按元素与连接拓扑识别，并不完整检查键级、立体构型 | 区分下标与分子个数；按配比判断原子是否够用；拼接不是化学反应；颜色和二维位置是示意；3D不能用来测真实键长、键角；未收录不等于不存在；并非所有物质都由独立分子组成 |

### 箭头中的负数

在等式页的极坐标基向量控件中，实际操作可得到旧标注 `|d| = −10`。这里内部参数允许负数，并按 `x = r cos θ`、`y = r sin θ` 生成分量，实际向量模长仍为非负值。因此改成 `r_d`、`r_e`，并补充读屏说明：负参数表示沿设置角度的反方向，实际长度为参数绝对值；参数为零时方向未定义。保留原参数范围、计算和交互。

向量分量与极坐标定义参见 [OpenStax：平面向量](https://openstax.org/books/calculus-volume-3/pages/2-1-vectors-in-the-plane)及[极坐标](https://openstax.org/books/calculus-volume-2/pages/7-3-polar-coordinates)。本地同时核查了运行包与可读源码中的 `SumVector`、`RootVector`、`EquationsVector`、`EquationsResultantVector` 和 `PolarBaseVector`；没有只凭同名源码推断运行版本。

### 冷热模型的适用边界

PhET 教师指南明确说明模型不支持潜热，粒子较少时可有非现实行为，冰结构以二维方式简化，显示0 K应理解为舍入。原版用粒子速度计算温度、碰壁动量传递估计压力；这不构成对真实物性数据的精密校准。本次没有进行实验测量对标，也没有宣称模型精确复现相变曲线。[PhET《States of Matter: Basics》教师指南，第2页，Amy Rouinfar，2016年12月，镜像存档](https://pacificschoolserver.org/phet/PhET%20Teaching%20Resources/states-of-matter-basics-html-guide_en.pdf)

真实纯物质在一定压力下发生熔化或沸腾，可以继续吸热而温度近似不变；教学说明明确将这一现实规律与模型限制分开。[OpenStax：相变](https://openstax.org/books/chemistry-2e/pages/10-3-phase-transitions)

### 分子结构的已知例外

核对了题目说明覆盖的26种参考分子的元素顺序、键端点及参考键级，与本地上游数据一致。这是数据一致性验证，不等于26种分子的所有真实化学性质都已验证。

发现臭氧参考结构使用一单一双表示，原生3D坐标的两段O—O距离也不相等（按数据计算约1.432与1.232个模型坐标单位）。真实臭氧的两段O—O键等效；NIST实验数据给出相同的1.278 Å键长和116.8°键角。因此保留原生结构教学模型，但在臭氧题目说明中明确提示共振和3D简化，不能把图像当作真实固定单双键或不同键长的证据。[NIST CCCBDB：臭氧实验几何数据](https://cccbdb.nist.gov/exp2x.asp?casno=10028156&charge=0)

一氧化二氮和二氧化硫题目也补充参考整数键级不是完整电子结构的说明；N₂O的N—N与N—O不能因“共振”就被称为等效。分子式、连接结构与现实反应条件的基础解释参考 [OpenStax：化学式](https://openstax.org/books/chemistry-2e/pages/2-4-chemical-formulas)、[离子与分子化合物](https://openstax.org/books/chemistry-2e/pages/2-6-ionic-and-molecular-compounds)和[碰撞理论](https://openstax.org/books/chemistry-2e/pages/12-5-collision-theory)。

## 界面入口

三个模块的“玩法说明”新增“认识这个模型”：简短边界默认显示，“科学说明 · 展开阅读”提供详细解释。切换实验页仍保留对应模块说明。分子的共振例外放在遇到相应目标时的“解题过程与常见错误”中。

相关实现：`src/activity-learning.js`、`src/learning.css`、`src/phet/workbench.js`、`src/phet/molecule-question-learning.js`、`scripts/phet_workbench_theme.py`，以及重新构建的三个目标页面。

## 验证与证据

- 全量测试：573项，569通过、4项条件跳过、0失败。记录：`output/science-review/unit-tests.txt`。
- 浏览器回归：13/13活动通过，10个PhET活动的28个屏幕、42次模型方法比较、45组案例通过；其中箭头16组案例覆盖加法、减法、闭合式、负系数、零系数、负径向参数和零向量。记录：`output/science-review/runtime-report.json`。冷热、分子的此项运行检查主要验证初始化与模型方法一致，不替代现实物性验证。
- 最后文字校对后重新构建，PhET构建与还原检查4/4通过；生成页可逐字节还原到固定上游文件。JavaScript语法与差异空白检查通过。
- 桌面1280×720核对三模块说明、展开/折叠、实验页切换与第三步显示；手机390×844核对说明展开和滚动至末尾，页面无横向溢出。桌面、手机和回归页无浏览器error/warn。
- 截图：`output/science-review/vector-signed-radius-before.png`、`vector-signed-radius-after.png`、`vector-science-desktop.png`、`states-science-desktop.png`、`molecule-science-desktop.png`、`molecule-science-mobile.png`、`molecule-science-mobile-scrolled.png`。

保留的限制：冷热过程仍为定性模型；分子几何仍为参考示意，包括上述臭氧例外；没有进行真实手机硬件测试或远程发布。
