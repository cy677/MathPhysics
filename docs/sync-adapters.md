# 课堂存档与恢复范围

账号同步仅保存未核验练习。正式考核使用独立服务端题目、原始作答草稿及确认结果；客户端练习中的 correct/score 不进入成长积分。

## 运行入口

Node `/mathphysics/` 提供账号API、同步工具条，并默认打开 `/learning/` 考核页。本地与远程使用相同服务入口；没有API时显示服务未连接，不回退到静态演示模式。已签发考核仍可离线暂存答案，恢复连接后确认正式结果。

当前航天磁盘文件保持原样。Node 只在 `/mathphysics/lessons/spaceflight/` 的 HTML 响应中加入同步入口，等账号/档案缓存准备好后再运行一次原控制器；返回 UTF-8、正确 Content-Length 及 `Cache-Control: no-store`。普通静态根与单文件继续原航天入口，不加载此桥接。运行时使用当前 63 阶段、Worker 模型及稳定任务 ID。

## 适配表

| 模块 | 可恢复内容 | 范围限制 |
| --- | --- | --- |
| 探索首页 | 当前入口与本机 UI 偏好 | 不是学习成绩 |
| 数与生活 | 当前课程 context 与入口偏好 | 当前课程不回退到旧版本 |
| 练习题库 | 当前配方、作答记录、完成等级 | 导入需符合现行配方校验；不从共享匿名键回退到账号 |
| 中文应用题 | 学生1391题练习记录；服务端受控考核沿用既有数学能力 | 练习0分；正式仅补同目标历史最佳增量 |
| 几何证明 | 稳定 lesson/variant、参数、当前答案与完成 checkpoint | 无效 ID/参数不恢复 |
| JSXGraph | 当前未完成题的点坐标、选中点及单独完成 checkpoint | 当前题与已完成题分别保留 |
| 平面七巧板 | 关卡、七块变换、选中块及已用提示 | 只恢复有效关卡与有限变换 |
| 七巧板适配器 | 七块平移/旋转与选中块 | 不是正式覆盖判定 |
| Matter 演示 | 场景、公开选项、预测、暂停与访问记录 | 不序列化物理世界中的任意动态物体 |
| PhET | 当前屏幕/主页，以及下表存在于该版本的可写标量属性 | 不恢复完整仿真对象、任意导线拓扑或粒子状态 |
| 航天 | 稳定 mission/step/tab/branch/lab/system、普通控制、手动关机、观察进度、笔记与完成练习 | 重新运行原 Worker 计算观察位置；恢复后暂停，动态物理对象不直接反序列化 |
| 新逻辑/空间小游戏 | 原本机游戏存档 | 原本机积分不转换为正式成长积分 |

PhET 适配器等待实际仿真构建完成，支持当前 `screenProperty` / `selectedScreenProperty` 的屏幕对象及旧 `screenIndexProperty`。只尝试当前模型真实存在、非只读、类型一致且经模型自身范围校验的属性：

| PhET 模块 | 候选属性 |
| --- | --- |
| area-builder | showGridProperty、showDimensionsProperty、levelProperty |
| fractions-intro | numeratorProperty、denominatorProperty、showNumberLineProperty、showMixedNumberProperty |
| fraction-matcher | levelProperty、soundEnabledProperty |
| balancing-act | massLabelVisibilityProperty、forcesVisibleProperty、levelProperty |
| build-a-molecule | showMoleculeNamesProperty |
| forces-and-motion-basics | appliedForceProperty、frictionProperty、力/合力/数值/速度/质量显示开关 |
| energy-skate-park-basics | pausedProperty、frictionProperty、网格及柱状/饼图/速度显示开关 |
| vector-addition | valuesVisibleProperty、gridVisibleProperty、sumVisibleProperty |
| states-of-matter-basics | temperatureInKelvinProperty、pressureGaugeVisibleProperty |
| circuit-construction-kit-dc | showValuesProperty、showLabelsProperty、电压/电流表显示开关 |

嵌套于特殊模型中的属性不会自动递归采集；上表是候选范围，实际可用属性以 `__mpPhetSync.supported` 为准。运行时代码只保存这些白名单标量，不宣称完整仿真恢复。

## 共享客户端接口

页面先 `await MathPhysicsSync.ready` 再读取档案存储。`createStorage()` 返回 epoch 绑定句柄；`getSnapshot(moduleId)` 读取当前档案，`register(moduleId, serialize, window)` 注册可采集 snapshot；`captureAll()` 用于关闭或切档前保存当前状态。独立 iframe 通过 `createClient()` 共用宿主当前归属，旧句柄、旧 provider 和旧 iframe 回调不能写入下一档案。

当前存储映射包括 `mathphysics.state.v1` → host、question-bank/word-problems 各自键、`mathphysics.learning-content.v1` → primary-math-view、`mathphysics.spaceflight.v1` → spaceflight 和 `mathphysics.progress.v1.<module>`。账号记录来自该档案缓存及服务器，旧匿名记录只有显式导入确认后才能恢复。

`issueAttempt(objectiveId, difficulty)` 返回服务端公开 attempt；`saveDraft(attempt, responses)` 保存未交卷原始草稿；`submitAttempt(attemptId, responses)` 冻结原始作答及幂等键，联网成功后返回确认结果，离线时返回待同步草稿。新正式题必须在线签发；已签发题可离线继续，确认前 0 分。`profileRequest` 的归属来自当前会话和档案，不接受页面指定别人的账号。

409 时两份练习保留在恢复副本，选择本地版后按服务器最新 revision 新建修订；选择服务器版也保留本地恢复副本。已在另一设备交卷的考核不能覆盖，正式结果使用服务器原始答案，本机未提交副本另存。401 时清除登录 UI，缓存仍留在原账号/档案命名空间。

## 生成文件与静态交付

PhET HTML 同步加载顺序写入当前 `scripts/build_phet_theme.py`，重建会更新 edit-ledger，不能只手工编辑 generated HTML。单文件构建把共用同步脚本及样式内联，并以 async IIFE 等待准备完成；`__mpReady` 在实际初始化后设置。`file://` 不请求账户 API。静态 ZIP 和服务端发布包必须排除运行 DB、备份、凭据和 node_modules。

开发者可在项目 `docs/api-contract.json` 查看字段和修订号约定，在 `docs/assessment-coverage.md` 查看正式目标；这些开发文档不在服务端静态公开白名单中。实际本地测试和 screenshots 保存在源码外的 evidence，浏览器触屏模拟不等同于实机 Safari 验证。
