# 空间游戏源码收集索引

收集日期：2026-10-03（UTC）。目录：`C:\Users\cheng\Desktop\SpatialGames-sources`。本轮只下载和静态检查；未运行上游页面、脚本或服务，未安装依赖，未提交或推送 GitHub，未修改 MathPhysics 或冻结候选，未恢复 SQLite 写回。

| 项目与来源 | 本地路径（相对本索引） | 分支 | 固定 commit | 已检出文件 | 完整性 |
| --- | --- | --- | --- | ---: | --- |
| [Wiebke/TangramGenerator](https://github.com/Wiebke/TangramGenerator) | `TangramGenerator/` | `master` | `3f9262d4eac426eb5813006039f4cd5583d904f1` | 39 / 39 | 当前提交文件全部下载 |
| [rberenguel/soma](https://github.com/rberenguel/soma) | `soma/` | `gh-pages` | `6f4e357a7f4c96821dfd751e0b06b2f340afa862` | 103 / 104 | 主游戏文件完整；有意不下载可选分析库 `analysis/libs/mermaid.js`（7,802,296 字节） |
| [llaske/sugarizer：Reflection](https://github.com/llaske/sugarizer/tree/60ccdbcb004de1a706749c7314edfa0d160288b4/activities/Reflection.activity) | `sugarizer-reflection/activities/Reflection.activity/` | `master` | `60ccdbcb004de1a706749c7314edfa0d160288b4` | 活动 104 / 104；根文件 4 | 活动目录完整；只另取根 `LICENSE`、`NOTICE`、`README.md`、`.gitattributes`，其余 17,940 个平台文件未检出 |

三个仓库均保留 `.git`、原始来源 URL 和分支记录，采用 `--depth 1 --single-branch --no-tags --filter=blob:none`。这是固定提交源码快照，不包含完整历史或所有分支；Soma 和 Sugarizer 使用 sparse checkout，未选对象后续需要联网补取。

已检出源码共 250 个文件，磁盘字节共 11,115,427（约 10.60 MiB），Git 元数据约 4,874,172 字节；网络实际传输量未计量。250 个文件均与 Git 树中 blob 校验一致。Sugarizer 的 107 个文本文件按 Git 属性检出为 CRLF，归一化 LF 后 blob 哈希一致，未改写源码。`SOURCE-FILES.sha256` 记录实际磁盘文件的 SHA-256；`source-audit.json` 保存逐文件字节、上游 blob ID、来源、提交和排除范围。

完整三仓库树中均没有 `.gitmodules` 或 `160000` 子模块项；选中范围无 LFS 属性规则、无 LFS 指针文件，因此没有因未初始化子模块或未拉取 LFS 而缺失的活动文件。Sugarizer 其他活动的属性文件未下载、不属于本次范围。没有下载模型、视频包等其他活动的大资源。

## 许可证与运行前的依赖记录

- **TangramGenerator：MIT。** 保留根 `LICENSE`、`README.md`。入口 `Code/index.html` 使用本地 JS 和 Web Worker；另引用 Google Fonts、Font Awesome 的外部 HTTP 样式。原 `Code/serverCommunication.js:25` 将选题和游戏统计 POST 到 `http://tangen-wiebke.rhcloud.com:80`；本轮未访问这个地址，后续接入前应删除或替换上传调用。附带的 `Code/Server/`、`Code/Evaluation/` 是 Node/MongoDB 统计相关代码，主游戏适配无需运行它们，本轮没有安装其依赖。
- **Soma：MIT。** 保留根 `LICENSE`、`README.md` 和第三方文件头。`libs/three.module.js` 已下载，文件头为 MIT / Three.js r161；主游戏不需要本轮安装 npm 依赖。浏览器运行需要支持 ES modules/import map 的环境与 HTTP 服务，Service Worker 也需相应上下文。可选分析页面依赖被排除的 Mermaid 库，因此这些分析页面不完整。`extra-puzzles/puzzles.md` 和 `index.html` 明确引用 Thorleif Bundgård 的外部题形；尚未确认这些题形可按本仓库 MIT 再分发，后续筛选应单独处理。字体、图标及其他分析库应在实际集成时逐项核对许可证，不据根 MIT 自动推定所有外部素材授权。
- **Reflection：Apache-2.0。** 保留根与活动各自的 `LICENSE`、`NOTICE`，以及随活动自带的 `lib/sugar-web/LICENSE`。RequireJS、Sugar Web、CreateJS、TweenJS、i18next、Axios、教程和四份语言文件已经随活动下载，无需现在安装依赖。`index.html:19` 仍引用未下载的 Sugarizer 根 `../../cordova.js`；`lib/sugar-web/bus/sugarizer.js:51` 关闭活动时返回未下载的 `../../index.html`。环境、用户颜色、Journal 存档依赖 Sugarizer 的启动参数、`window.top.sugar` / `sugar_settings` 和宿主生命周期；活动自带 Sugar Web 并不等于已下载整个宿主。外部 Google Fonts 未下载。后续可补适配层或有选择地补共享文件，本轮未下载整个平台，未承诺当前快照可独立运行。

克隆、检出在获准的用户上下文成功完成，三个工作树当时均干净。沙箱账户后续 Git 只读状态命令触发 `dubious ownership`（目录归用户 cheng），已停止该命令；未设置 `safe.directory`、未改变所有权或放宽权限。完整性改用普通只读文件哈希检查，所需文件读取均成功。

关卡筛选与积分适配报告已完成，见同目录 [LEVEL-ADAPTATION-REPORT.md](LEVEL-ADAPTATION-REPORT.md)；实际 v2 契约输入的只读核验记录见 [V2-READONLY-EVIDENCE.json](V2-READONLY-EVIDENCE.json)。其中新增关卡和适配能力仍是待实现设计，本轮没有改动业务代码。
