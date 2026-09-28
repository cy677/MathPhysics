# 第三方来源与授权

核对日期：2026-09-28。本项目为独立教学整合项目，不代表上游官方产品。保留上游代码及成品，不把公开仓库等同于无限制授权。

## PhET（四个完整中文模拟）

Simulation by PhET Interactive Simulations, University of Colorado Boulder, licensed under CC BY-NC 4.0 (https://phet.colorado.edu).

- Area Builder: https://github.com/phetsims/area-builder
- Forces and Motion: Basics: https://github.com/phetsims/forces-and-motion-basics
- Energy Skate Park: Basics: https://github.com/phetsims/energy-skate-park-basics
- Vector Addition: https://github.com/phetsims/vector-addition

官方当前普通 HTML 模拟许可：https://phet.colorado.edu/en/licensing 。截至核对日为 CC BY-NC 4.0，非商业教学与分享需要署名；成品不可因此被重新标为 MIT。源码的 GPL 许可证不自动替代官方成品分发条款。每个具体文件的原始许可头和依赖声明保留；本整合版对官方成品按当前非商业条件保守处理。

课堂非商业使用与收费、广告支持、商业产品整合须区分。后续收费或商业分发前须重新核对官方条款或取得相应授权。不得将本 README 视为商业授权证明。

完整中文 HTML 位于 vendor/phet/，不修改原文件，不遮挡或删除 logo；使用处显示上述署名。普通原版导航和关卡全部保留；不是 PhET-iO，也不调用需要另行许可的 PhET-iO API。

源码快照位于 vendor/sources/，各自保留 GPL 许可；原始 ZIP、提交 SHA、HTML SHA256 分别保存。源码快照用于后续审查改造，不声称其连同全部公共依赖能复现官方成品。官方成品内嵌的第三方依赖授权也须遵守。

## Tangram

来源：https://github.com/iliagrigorevdev/tangram ，GPL-3.0。完整源码、资源及 LICENSE 均保留于 vendor/tangram/，未改写题目或程序。内置 Three.js 保留其原许可头（MIT）。这是一个内置快照与自由拼装程序，上游“更多题目”接口和切题函数没有完成，不能把它描述成完整多关题库。

## Matter.js 与依赖

来源：https://github.com/liabru/matter-js ，锁定 0.20.0，MIT。完整上游仓库保留于 vendor/matter/，包括全部48个注册示例、源代码、许可证、图片和 SVG 资源。新加入的 demo/mathphysics.html 为独立加载器，不覆盖官方示例文件。

必要依赖：poly-decomp 0.3.0、matter-wrap 0.2.0、pathseg 1.2.1。来自相应 npm 发行包，原始压缩包、package.json 与 LICENSE 文件保留。具体授权以每个包的 LICENSE、版权头及素材声明为准，不能因引擎是 MIT 就断言每张素材也适用 MIT。

## 明确未复制的项目

DennisWeiss/linear-transform-visualizer：未发现明确仓库许可证，暂不复制其代码与资源。本版向量内容由完整 Vector Addition 覆盖，不假装已整合未授权项目。

Phaser、JSXGraph：此前列为可能使用的开发框架，不是选定的课程关卡库。本版仅做统一入口整合，没有引入它们及其所有技术示例。

## 修改边界

新增入口、配置管理、适配器和测试为本项目原创 MIT 代码；上游独立文件继续适用原许可证。iframe 是兼容性隔离，不作为不可信代码的安全沙箱。teacherPreview 是本地展示开关，不是身份鉴别或访问控制系统。
