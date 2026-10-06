# 下载与目录调整状态

已完成，目录：`C:\Users\cheng\Desktop\SpatialGames-sources`（2026-10-03 UTC）。

| 当前项目 | 路径 | 分支 / 提交简写 | 源码文件数 | 状态 |
| --- | --- | --- | ---: | --- |
| Soma Cube | `soma/` | `gh-pages` / `6f4e357a7f4c` | 103 | 原目录完整保留；含 Git 的 123 文件哈希全部未变 |
| rush | `rush/` | `master` / `3e3b8396891d` | 55 | 固定提交全部源码文件核验通过 |
| 2048 | `2048/` | `master` / `478b6ec346e3` | 34 | 固定提交全部源码文件核验通过 |
| escape-run | `escape-run/` | `main` / `ab61caa41ae6` | 92 | 固定提交全部源码文件核验通过 |

TangramGenerator 与 sugarizer-reflection 已移入普通 Windows 回收站，回收站内文件完整性已核验；没有永久删除或清空回收站。当前源码共 284 文件，新增三项无子模块/LFS 下载缺失。新增使用固定提交 ZIP，不含 Git 历史。

仍存在的运行前提：Soma 原先排除的可选 Mermaid 分析库未补取；rush 的外部 CDN、随机题 API 与不在仓库中的本地 `rush.db` 题库没有下载。源码下载和本轮目录调整无剩余阻塞。

原报告未改写，保留为历史范围；原索引与校验记录保存在 `history/20261003T055229Z-before-rush-2048-escape-run/`。详情见 [SOURCE-INDEX.md](SOURCE-INDEX.md)、[COLLECTION-CHANGE.json](COLLECTION-CHANGE.json)。本轮未运行上游、安装依赖、做集成或筛选、推送 GitHub，未改动 MathPhysics 或恢复 SQLite 写回。
