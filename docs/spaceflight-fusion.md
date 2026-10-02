# 航天本地融合 · state-events-v1

本版仅存在独立快照。实际项目尚未合入，也没有上传或发布。完整交接与并行修改记录见本任务 `spaceflight-work/STATUS.md` 和 `concurrent-at-handoff/manifest.json`。

四条任务路线、62个原节点、原8实验、7套图解和探究笔记保留；新增“发射、入轨与一级回收”实验。任务旅程的发射段直接使用计算模型。交会、部署后在轨活动、飞船返回等后续主题保持定性讲解，不能把其片段速度当成任务秒表。短距离对接另有惯性实验。

模型采用球形地球、地心惯性坐标、SI单位、旋转指数大气、RK4。质量、推力、推进剂、比冲、阈值、引导增益和目标走廊都是任意缩小的教学设置，绝不代表猎鹰、长征或神舟实测性能。没有热流、风、地球非球形、转动动力学、精确导航或真实控制律。姿态是有限速率对准代理。

发射前有课堂检查。发射、转向、MECO、分级、上面级点火/关机、部署/船箭分离按高度、速度、燃料、推力、轨道及姿态代理触发，不使用固定阶段秒表。时间仅用于积分和回放。手动关机保持位置、速度和质量；停止主线推力不会停止独立一级。入轨条件检查负轨道能量、近地点和构型准备；参数不合适可失败或触及计算窗口。

MaxQ从上升数据的实际动压峰值观察得出，使用相对空气速度的 `q=½ρv²`，与最大速度、总结构载荷不同。界面仅显示回放时刻已经观察到的峰值和事件；峰值暂定，后续更高峰值更新；真空无假MaxQ。改变任一参数会立即清空旧轨迹和事件，重新计算。

一级分离后有独立位置、速度、质量、余油、姿态代理及推进状态。海上模式不强制加入返场点火；返场模式在分离、对准、有余油时返场，并以预测目标走廊、下降状态与燃料终止。再入点火须下降且进入高度/速度/动压包络；着陆点火以可用推力、质量和垂直速度估计停止距离。接地检查落点、横纵速度、支腿、燃料和姿态/变化率代理，高度到零不能自动成功。接地保留接触速度并冻结该支线的记录，主线继续飞行。

长二F正常顺序为逃逸塔、助推器、一级分离、整流罩、船箭；无一级回收。Crew Dragon没有卫星整流罩，船箭分离后开鼻锥。长三甲保留三级教学构型；后续滑行/再启动主题是定性示意。本模型未分开模拟长二F末段主发动机与游机，也未实现长三甲真实任务二次启动制导。整流罩高度/动压条件明确为教学代理，未计算真实加热率。

上游固定 [Launch Atlas MIT提交](https://github.com/exiztinz/rocket-launch-simulator/tree/b8b570cd2f25b0531724c776631160c48bba06fd)。只保存三个原始计算文件及完整MIT LICENSE，20,806字节，Copyright (c) 2025 Joseph Tascona。SHA-256记录在 `vendor/launch-atlas/SOURCE.json`。本地生成经典脚本工厂；新版仅使用重力、RK4、轨道元素和二分取样，**不使用上游按燃烧时长编排阶段的 buildTrajectory**。新状态模型和回收控制为MathPhysics原创。无上游预设性能、8K纹理、高清模型、Three/Chart/Cesium、字体或全量卫星目录。WHScience许可未明确，未复制；Satvis未引入。

依据与边界可在课堂“资料与说明”查看，包括 [NASA轨道原理](https://science.nasa.gov/learn/basics-of-space-flight/chapter3-4/)、[NASA动压公式](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/dynamic-pressure/)、[中国载人航天正常分离顺序](https://www.cmse.gov.cn/fxrw/tgyhyszbhrw/kpzsa1/201109/t20110928_41166.html)、[SpaceX用户指南](https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf)。仅改写事实，不复制机构图片或页面素材。事件记录含前提、带单位的观测、来源和代理标识。

完整运行资源约202,565字节，含共享主题和存档脚本；gzip估算76,139字节，本地服务器实际未压缩。离线单HTML约203,950字节。预算均小于256,000字节。默认结果约4.33MB JSON表示（不是浏览器堆内存测量），最多缓存4种完整配置；只在配置改变或手动关机时重算。离线Blob Worker、取样和Canvas运行不依赖远端网络。默认0.25秒积分，通常2400秒计算窗口。

28项单元检查通过，16组完整浏览器功能检查通过，无页面异常、无远端运行请求。覆盖所有原节点/实验/图解、新状态事件、清空重算、MaxQ真空反例、三种一级模式、配置约束、原对接、宿主返回和真正file://离线Worker。一次1.11秒回放观察67帧，平均16.57ms，期间0长任务、0轨迹重建；只代表该机器Chromium环境，不代表iPad Safari或真实性能验证。独立视觉验收由父任务安排，尚未通过。

构建与测试：

```powershell
node scripts/build_spaceflight_core.mjs
node scripts/python.mjs scripts/build_spaceflight_standalone.py
node --test tests/spaceflight.test.mjs tests/spaceflight-fusion.test.mjs
node tests/spaceflight-fusion-browser.mjs
```

实际宿主此前已直接开放所有活动，本版保留其设置与存档行为，恢复航天入口展示。合入前必须保留并行修改，尤其新教学功能；不能整目录回写。旧GitHub上传拒绝不属于本任务，本版没有重试。


## integration-v2 定点修复（2026-10-01）

修复独立验收提出的两项P2：回收Canvas的动压与空速现在取一级样本，主线与一级分别呈现DOM读数；一级样本只增加已有观测量airspeedMps输出，RK4、质量、控制、任务门限和事件均未改。已审integration-v1-speed-reference保存于任务工作区acceptance目录。

窄屏飞行Canvas只保留图形与大字标题；关键高度、空速、惯性速度、动压、状态和最新事件在14px以上DOM中显示。实验条提供可见滑动提示与前后按钮，滑条和导航命中区域至少44px。1024/桌面继续保留原完整Canvas。

新增回归核对任意时刻一级读数，逐一比较v1/v2四任务与回收模式轨迹/事件，并检查真实指针拖进度、连续暂停恢复、RTLS/不回收/长二F及参数A/B。运行node --test tests/spaceflight.test.mjs tests/spaceflight-fusion.test.mjs tests/spaceflight-integration.test.mjs；定点浏览器tests/spaceflight-v2-browser.mjs。报告与三尺寸截图在任务工作区checks/integration-v2-final，独立视觉结论仍由luna提供。本轮只在隔离副本修改，未写回实际项目或发布。
