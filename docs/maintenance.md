# 维护与验收

## 三个独立层

1. 上游资源层 vendor：保存原始程序、完整题目生成器、示例、源码与许可证，不按年级删减。
2. 清单适配层 config/inventory.json、src/adapters：声明原版入口、类型、年级建议、来源和证据。不混淆固定关卡、随机出题、自由实验、开发示例。
3. 宿主教学层 src/app.js、state.js 与各课堂：主题入口、筛选、访问记录、分步学习与当前参数讲解。教学与显示适配保留上游科学模型和资源。

## 新增内容与目录

当前首页所有目录活动直接开放，已移除工作台和开放设置。目录与展示使用 config/inventory.json、config/local-activities.json、config/presentation.json；defaults.json 保留历史迁移用途。新增资源应先核查许可、固定版本、保留完整内容、加入导入器与清单，再补充适配器和浏览器测试。不要手动编辑生成的 inventory.json。

主题、年级和搜索筛选只影响展示。构建测试须逐项验证所有 entry 和原版 Matter 索引，并核对全部文件哈希。

## 模块级与题目级边界

PhET保留内部导航，并按当前页面显示对应引导；本项目使用公开分发版本。Matter的48个场景各有独立实验与暂停、步进、重置。题目和演示按稳定ID记录覆盖范围，复用模板与课程引用分列。新增内容需补齐题意、递进提示、解题过程、常见错误，或演示的观察、操作、解释与生活例子，详情见 [全量覆盖清单](learning-coverage/README.md)。

## 数据

宿主浏览记录使用 mathphysics.state.v1，visited 记录成功启动时间；历史 openIds、teacherPreview 不再控制访问。各课堂进度与题库作答使用独立键，“数与生活”练习使用 mathphysics.question-bank.v1。更新版本应做明确迁移；清除记录使用 scripts/clear_records.html 中的明确操作，保留其他项目的数据。

## 上游更新

原始压缩包、下载URL、Git提交SHA、SHA256锁与每个落地文件的哈希都必须保留。现有文件哈希不符时导入器拒绝覆盖。升级需要独立分支，审查上游许可证和新增/删除条目后显式更新锁，不要在日常启动时访问 latest。

源码与成品是两条来源链。PhET使用官方分发HTML，而源码快照未包含完整公共依赖构建环境，不能宣称源码快照必然能复现同一成品。后续修改源码需要另行建立完整依赖锁和构建流程。

## 测试

运行 npm test 检查完整索引、入口、SHA256、数学、题目教学、冻结算法兼容、存储及构建。浏览器专项命令为 test:questions:browser、test:questions:learning:browser、test:demo-learning:browser、test:local-learning:browser；分别验证统一题库、逐题教学、演示控制，以及本地课堂的 HTTP 与 file:// 运行。

test:phet-questions:browser 验证 46 个原生数理关卡配置、实际生成样本与只读题卡；test:phet-molecule-questions:browser 验证两个分子收集页、参考结构和真实拖拽收集。test:demo-layout:browser 覆盖全部 PhET 页面、宿主窄屏、Matter 镜头与操作阶段，检查科学视口和原生鼠标坐标；test:phet-display-compat:browser 验证旧版初始化与离线样式表兼容。显示衍生文件保留可反转编辑账本，原始 vendor 文件不变。

题库旧Python测试入口转发统一Node测试并保留退出码。test:questions:failure 注入真实断言失败并检查非零退出与服务清理；CI记录日志时启用 Bash pipefail。test:classroom 仍执行旧汇总回归，Python Playwright依赖需与所选解释器匹配。具体结果、截图与本次Chromium验证范围见全量覆盖清单。
