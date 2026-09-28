# 全量整合清单

本文件由导入脚本生成。上游版本及全部文件SHA256见 config/upstream-lock.json 与 config/inventory.json。

保留全部已选内容，并不等于执行所有内容：只在进入活动时创建一个运行实例。

## 范围

{"phetSimulations": 4, "phetScreens": 13, "areaBuilderDifficultyLevels": 6, "tangramBuiltInSnapshots": 1, "matterExamples": 48, "launchableActivities": 53}

## 重要边界

- Area Builder 保留全部6个难度等级和完整随机题目生成器；随机题库不是固定有限题目清单。
- PhET 其余项目是多页面实验，不虚构成关卡。全部原始导航保留。
- Tangram 的仓库只有1个内置快照；更多图形服务及上一题/下一题函数在上游未完成，不声称已获得不存在的服务器题库。
- Matter.js 保留完整仓库、全部注册示例和资源；其中性能压力测试默认关闭，但未删除。
- 无许可证的 linear-transform-visualizer 未复制；向量主题由完整 PhET Vector Addition 承担。
- Phaser、JSXGraph 是备选基础库，不是课程关卡库，本版未引入。
- 官方PhET HTML按当前CC BY-NC 4.0政策保守处理；源码快照单独保留其GPL许可证，源码快照不声称是官方成品的完整可复现构建依赖。

## 已整合活动

- area-builder / 围栏花园 / vendor/phet/area-builder.html?locale=zh_CN&webgl=false&allowLinks=false
- forces-and-motion-basics / 搬运挑战 / vendor/phet/forces-and-motion-basics.html?locale=zh_CN&webgl=false&allowLinks=false
- energy-skate-park-basics / 轨道游乐场 / vendor/phet/energy-skate-park-basics.html?locale=zh_CN&webgl=false&allowLinks=false
- vector-addition / 箭头导航 / vendor/phet/vector-addition.html?locale=zh_CN&webgl=false&allowLinks=false
- tangram / 七巧板工坊 / vendor/tangram/index.html
- matter-airFriction / 空气阻力 / vendor/matter/demo/mathphysics.html?example=airFriction
- matter-avalanche / 滚落的积木 / vendor/matter/demo/mathphysics.html?example=avalanche
- matter-ballPool / 小球池 / vendor/matter/demo/mathphysics.html?example=ballPool
- matter-bridge / 吊桥实验 / vendor/matter/demo/mathphysics.html?example=bridge
- matter-car / 小车过桥 / vendor/matter/demo/mathphysics.html?example=car
- matter-catapult / 跷跷板投石机 / vendor/matter/demo/mathphysics.html?example=catapult
- matter-chains / 链条 / vendor/matter/demo/mathphysics.html?example=chains
- matter-circleStack / 圆球堆叠 / vendor/matter/demo/mathphysics.html?example=circleStack
- matter-cloth / 柔软布料 / vendor/matter/demo/mathphysics.html?example=cloth
- matter-collisionFiltering / 碰撞分类 / vendor/matter/demo/mathphysics.html?example=collisionFiltering
- matter-compositeManipulation / 组合物体变换 / vendor/matter/demo/mathphysics.html?example=compositeManipulation
- matter-compound / 复合形状 / vendor/matter/demo/mathphysics.html?example=compound
- matter-compoundStack / 复合积木堆叠 / vendor/matter/demo/mathphysics.html?example=compoundStack
- matter-concave / 凹形积木 / vendor/matter/demo/mathphysics.html?example=concave
- matter-constraints / 弹簧与约束 / vendor/matter/demo/mathphysics.html?example=constraints
- matter-doublePendulum / 双摆 / vendor/matter/demo/mathphysics.html?example=doublePendulum
- matter-events / 碰撞事件 / vendor/matter/demo/mathphysics.html?example=events
- matter-friction / 摩擦力 / vendor/matter/demo/mathphysics.html?example=friction
- matter-gravity / 改变重力 / vendor/matter/demo/mathphysics.html?example=gravity
- matter-gyro / 陀螺 / vendor/matter/demo/mathphysics.html?example=gyro
- matter-manipulation / 物体操作 / vendor/matter/demo/mathphysics.html?example=manipulation
- matter-mixed / 形状游乐场 / vendor/matter/demo/mathphysics.html?example=mixed
- matter-newtonsCradle / 牛顿摆 / vendor/matter/demo/mathphysics.html?example=newtonsCradle
- matter-ragdoll / 布偶 / vendor/matter/demo/mathphysics.html?example=ragdoll
- matter-pyramid / 积木金字塔 / vendor/matter/demo/mathphysics.html?example=pyramid
- matter-raycasting / 射线探测 / vendor/matter/demo/mathphysics.html?example=raycasting
- matter-restitution / 弹性与反弹 / vendor/matter/demo/mathphysics.html?example=restitution
- matter-rounded / 圆角积木 / vendor/matter/demo/mathphysics.html?example=rounded
- matter-remove / 添加与移除 / vendor/matter/demo/mathphysics.html?example=remove
- matter-renderResize / 自适应画布 / vendor/matter/demo/mathphysics.html?example=renderResize
- matter-sensors / 传感器 / vendor/matter/demo/mathphysics.html?example=sensors
- matter-sleeping / 静止与唤醒 / vendor/matter/demo/mathphysics.html?example=sleeping
- matter-slingshot / 弹弓实验 / vendor/matter/demo/mathphysics.html?example=slingshot
- matter-softBody / 软体结构 / vendor/matter/demo/mathphysics.html?example=softBody
- matter-sprites / 贴图物体 / vendor/matter/demo/mathphysics.html?example=sprites
- matter-stack / 积木塔 / vendor/matter/demo/mathphysics.html?example=stack
- matter-staticFriction / 静摩擦 / vendor/matter/demo/mathphysics.html?example=staticFriction
- matter-stats / 运行统计 / vendor/matter/demo/mathphysics.html?example=stats
- matter-stress / 压力测试一 / vendor/matter/demo/mathphysics.html?example=stress
- matter-stress2 / 压力测试二 / vendor/matter/demo/mathphysics.html?example=stress2
- matter-stress3 / 压力测试三 / vendor/matter/demo/mathphysics.html?example=stress3
- matter-stress4 / 压力测试四 / vendor/matter/demo/mathphysics.html?example=stress4
- matter-substep / 时间子步 / vendor/matter/demo/mathphysics.html?example=substep
- matter-svg / SVG形状 / vendor/matter/demo/mathphysics.html?example=svg
- matter-terrain / 凹形地形 / vendor/matter/demo/mathphysics.html?example=terrain
- matter-timescale / 时间快慢 / vendor/matter/demo/mathphysics.html?example=timescale
- matter-views / 移动视野 / vendor/matter/demo/mathphysics.html?example=views
- matter-wreckingBall / 拆除球 / vendor/matter/demo/mathphysics.html?example=wreckingBall
