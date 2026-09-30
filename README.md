# MathPhysics · 科学小岛

通过拖动、拼图和小实验，认识数量关系、几何、力与运动、太空飞行。面向小学一年级至六年级，按主题和推荐年级选择活动。

## 开始使用

下载包含资源的完整包并解压，在项目目录运行：

```bash
python scripts/serve.py --open
```

Windows 安装 Python 3 后也可运行 `START_WINDOWS.bat`。宿主使用本地静态服务，不要直接双击根目录 index.html。它不需要账号、CDN、数据库或 npm 运行依赖。局域网平板使用 `python scripts/serve.py --host 0.0.0.0 --port 8000`，通过电脑的局域网 IP:8000 访问；只在可信网络使用此开发服务器。

独立课堂可以构建为无需静态服务的单文件 HTML：

```bash
python scripts/build_geometry_standalone.py
python scripts/build_spaceflight_standalone.py
python scripts/build_playground_standalone.py
python scripts/build_primary_math_standalone.py
```

输出在 dist/：`MathPhysics-Geometry-Proofs.html`、`MathPhysics-Spaceflight.html`、`MathPhysics-Playground.html`、`MathPhysics-Tangram.html`、`MathPhysics-Primary-Math.html`。使用支持脚本的浏览器打开；文件预览器不等同于浏览器。

## 活动

| 主题 | 内容 |
|---|---|
| 几何工坊 | 面积拼图、24个几何证明主题（48种问法）、平面七巧板、分年级图形变换挑战、48题“数与生活” |
| 动力车间 | 弹弓、吊桥、小车、牛顿摆、摩擦、碰撞、空间飞行课堂 |
| 箭头港口 | 向量相加、旋转、缩放、线性变换网格 |

当前合计 **64个活动入口**。其中4个 PhET、48个 Matter.js 原始示例、1个原 Tangram、5个课堂/适配入口，以及6个分年级 JSXGraph 实验入口。Matter.js 条目不是48个教学关卡；几何证明课堂内有24个主题和48种问法、JSXGraph课堂内有6个实验与36个挑战目标、平面七巧板有方形热身和原内置创意轮廓。

首次打开推荐 **22项活动，其中18项非PhET**，包括14个 Matter.js 示例和4个课堂/适配入口。首页取消“只看可玩的活动”即可看到全部目录。“老师 / 家长”可以逐项选择、开放推荐活动、全部开放或导入导出配置。6个分年级入口与“图形会变魔术”共用同一套实验，默认关闭，可分别勾选开放；不会因开放了原课堂而自动开放。

几何内容按推荐首次系统学习年级重新划分：七巧板为一年级，对称为二年级，长方形面积证明为三年级，旋转与分配律面积模型为四年级，三角形/平行四边形/梯形面积及长方体为五年级，圆、圆柱圆锥、比例缩放及向量/线性变换拓展为六年级。几何证明的每个主题增加一种不同问法；JSXGraph每种模式由2个挑战扩展为6个。\n\n三角形实验可在“自由拖动”和“等底等高”之间切换：等底等高模式固定底边，顶点沿平行线移动，滑块单独改变高度。对称与向量挑战显示金色目标标记，换题时位置同步更新。

原上游内容没有删减：Area Builder 的6个难度和随机出题逻辑保留；其他 PhET 原导航保留；原三维 Tangram 也保留。平面七巧板另提供无需 WebGL 的入口。

## 数与生活：48道原创数学题

新增覆盖推荐1—6年级的48题，每个推荐年级8题，包含数与运算、分数、小数、时间、单位、统计和条形图建模。支持人教、苏教、新加坡参考年级筛选；每题提供可调整模型、输入检查、提示、解析与反思问题。课堂不保存或上传学生答案。

此入口默认关闭，不覆盖原有开放配置。请在“老师 / 家长”勾选“数与生活”，或通过静态服务直接访问 `lessons/primary-math/index.html`。旧有22项推荐不变。小屏幕可在画板内横向滑动查看完整模型。

年级映射为编写者的选题建议，不是2026新版教材逐册认证。官方新版全文抓取及版本差异的限制、来源、去重范围见 [课程依据与去重记录](docs/primary-math-curriculum.md)。本批避开已有面积、体积、对称、向量等固定题目，不声称穷举上游随机出题的全部状态。

新增模块测试：`node --test tests/primary-math.test.mjs`、`python tests/primary-math-browser.py`。受限环境可用后者的 `--inline` 模式；内嵌测试不代替真实HTTP、file://或iPad验证。

## 已有用户更新

沿用 `mathphysics.state.v1` 本地存储。未调整过旧首批开放列表的用户，会升级到22项推荐活动，并保留浏览记录。自定义列表（包括刻意全部关闭）不覆盖；可点击“开放推荐活动”补充新内容。年级是推荐筛选，不是权限系统。浏览记录不等于通关成绩。

儿童界面只保留操作和学习引导；实现边界、来源及维护说明放在文档和资料面板。必要的数学前提与版权署名不隐藏。

## 目录与维护

```text
index.html                       首页
src/                             宿主、状态、加载器
config/inventory.json             原上游清单和文件哈希
config/local-activities.json      新课堂与适配入口
config/presentation.json          首页排序、儿童文案和操作提示
config/defaults.json              推荐开放列表和迁移版本
config/libraries-lock.json        JSXGraph校验清单
lessons/geometric-proofs/         24题几何证明
lessons/primary-math/             48题数与生活
lessons/spaceflight/              太空飞行课堂
lessons/jsxgraph-playground/      6个基于JSXGraph编写的实验
lessons/tangram-flat/             原Tangram内核的SVG适配（GPL）
vendor/                          上游资源与各自许可证
tests/                           数学、内容完整性和浏览器检查
scripts/                         服务、导入与打包
docs/                            来源、修改说明、验证结果
```

完整活动文件在本地，不靠点击后跳转外部网站。仅创建当前活动的运行实例，退出后移除 iframe。首次导入或升级上游依赖需要网络，已经准备好的资源包运行不依赖外网。不得删除锁文件后仍声称版本固定。

```bash
npm install --ignore-scripts
npm test
python -m pip install playwright==1.56.0
python -m playwright install chromium
python tests/classroom-browser.py
python tests/unique-features-browser.py
node tests/geometry-browser.mjs
python scripts/package.py
```

`docs/classroom-browser-report.json` 记录真实 HTTP、file://、所有入口及关键交互的检查结果；`classroom-inline-report.json` 仅记录独立 HTML 的内存载入检查。以实际报告的 passed 字段为准，不能用截图或本说明代替验收。触屏模拟不等于真实 iPad Safari 测试。

## 授权

宿主、几何/航天原创课堂、JSXGraph课堂原创部分采用 MIT。JSXGraph 使用其 MIT 许可。平面七巧板与原 Tangram 为 GPL-3.0。Matter.js 代码 MIT，素材及其他依赖按原声明。PhET源码主要GPL，而随包官方 HTML 成品按 CC BY-NC 4.0 处理；全量包不能统一改成MIT。详见 [第三方来源与授权](THIRD_PARTY_NOTICES.md)。

[几何题集说明](docs/geometry-proofs.md) · [几何分年级与扩题依据](docs/geometry-grade-expansion.md) · [航天课堂说明](docs/spaceflight.md) · [v0.4修改说明](docs/v0.4-changes.md)
