# 游戏源码收集索引

更新日期：2026-10-03（UTC）。收集目录：`C:\Users\cheng\Desktop\SpatialGames-sources`。当前四项目为 Soma Cube、rush、2048、escape-run；本轮仅下载、调整目录和核验文件，未运行上游脚本或页面、安装依赖、编写集成代码、提交或推送 GitHub，未改动 MathPhysics 或恢复之前暂停的 SQLite 写回。

| 项目及官方来源 | 本地路径 | 分支 | 固定提交 | 源码文件数 | 根许可证与完整性 |
| --- | --- | --- | --- | ---: | --- |
| [rberenguel/soma](https://github.com/rberenguel/soma) | `soma/` | `gh-pages` | `6f4e357a7f4c96821dfd751e0b06b2f340afa862` | 103 / 104 | MIT：`soma/LICENSE`；保留原有可选分析库排除，主游戏范围不变 |
| [fogleman/rush](https://github.com/fogleman/rush/tree/3e3b8396891d1802b30cb3129ae31fdedb319480) | `rush/` | `master` | `3e3b8396891d1802b30cb3129ae31fdedb319480` | 55 / 55 | MIT：`rush/LICENSE.md`；当前提交全部源码文件完整 |
| [gabrielecirulli/2048](https://github.com/gabrielecirulli/2048/tree/478b6ec346e3787f589e4af751378d06ded4cbbc) | `2048/` | `master` | `478b6ec346e3787f589e4af751378d06ded4cbbc` | 34 / 34 | MIT：`2048/LICENSE.txt`；当前提交全部源码文件完整 |
| [abhas9/escape-run](https://github.com/abhas9/escape-run/tree/ab61caa41ae612057821df485bc5facf97d5b5c6) | `escape-run/` | `main` | `ab61caa41ae612057821df485bc5facf97d5b5c6` | 92 / 92 | MIT：`escape-run/LICENSE`；当前提交全部源码文件完整 |

## 下载方式和校验

新增三项采用官方 GitHub 固定提交源码 ZIP，未创建 `.git`、未下载 Git 历史，也未重试之前因账户所有权被拒绝的 Git 操作。未设置 `safe.directory` 或改变目录权限、所有权。原 Soma 的浅层 partial/sparse Git 目录保持原样。

当前源码合计 284 个文件、13,519,722 字节（约 12.89 MiB，不含 Soma 的 Git 元数据）。新增 181 个文件逐一对照 GitHub 完整、未截断的 Git 树核验字节数和 Git blob SHA-1，全部一致；放入桌面目录后再次核对 SHA-256。三个新仓库均无 `.gitmodules`、子模块项或 LFS 指针，无下载缺失。`source-audit.json` 保存来源、分支、完整提交、文件清单及 ZIP SHA-256；`SOURCE-FILES.sha256` 保存当前四项目实际源码文件校验值。

Soma 包括 `.git` 在内的全部 123 个现有文件与调整前的 SHA-256 完全一致。原先有意排除的 `analysis/libs/mermaid.js`（7,802,296 字节）仍未下载，因此可选分析页面仍缺少该库；未扩充或修改 Soma。

## 后续运行需要的内容（仅静态记录）

- **Soma：** 主游戏的本地 Three.js 已在原目录，浏览器运行需要支持 ES modules/import map 的环境与 HTTP 服务；可选分析页面另需上述 Mermaid 文件。原有额外题形来源记录见历史索引。
- **rush：** `web/index.html` 引用外部 CDN 的 jQuery 3.3.1、p5.js 0.6.1；随机题按钮请求作者的远程 `rushserver/random.json`，本轮未调用。若自建 `server/main.py` 后端，需要 Flask 与未包含在仓库中的 `rush.db` 题库；未下载大型题库。Go 绘图代码另引用 `github.com/fogleman/gg` 和 macOS 字体路径，C++ 工具需要相应编译环境；本轮均未安装或执行。
- **2048：** `index.html`、本地 JS、CSS 与 Clear Sans 字体文件均已下载，页面入口无需 npm 依赖。附带的 `Rakefile` 引用另一分支的 `cache.appcache`，该文件不在当前提交且不是入口依赖；未运行该脚本。
- **escape-run：** `package.json` 声明版本 `1.0.0`，无运行时依赖；本地 ES module、图标与预生成音频已下载。页面通常经静态 HTTP 服务访问，Service Worker 需要适用的安全上下文。`tools/gen-audio.mjs` 是可选音频再生成工具，所需 ElevenLabs/ffmpeg 不属于运行现有音频的前提，本轮未运行或配置它。

上述是源码引用检查，不是运行验证或关卡筛选。

## 旧目录移除与历史范围

`TangramGenerator/` 与 `sugarizer-reflection/` 在移除前对照原清单确认无新增、缺失或修改的源码文件，再通过 Windows Shell 回收站操作移入。两个回收站副本分别保留 57、132 个文件（含 `.git`），全部 SHA-256 与移除前一致；无永久删除、无清空回收站。精确原路径、回收站路径和结果见 [COLLECTION-CHANGE.json](COLLECTION-CHANGE.json)。

原索引、摘要和校验记录完整保留于 [history/20261003T055229Z-before-rush-2048-escape-run/](history/20261003T055229Z-before-rush-2048-escape-run/HISTORICAL-SCOPE.md)。根目录 [LEVEL-ADAPTATION-REPORT.md](LEVEL-ADAPTATION-REPORT.md) 和 [V2-READONLY-EVIDENCE.json](V2-READONLY-EVIDENCE.json) 保持原文件内容，属于此前 Tangram/Soma/Reflection 的历史筛选范围；本轮未对三个新项目筛选、运行或展开审计。
