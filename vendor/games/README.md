# 开源扫雷与数独

检索与拉取日期：2026-10-02。结合 MathPhysics 的浏览器环境，比较可玩的网页版项目，优先考虑完整游戏、辅助功能、题目资源、本地运行和维护情况。以下是本轮检索中的选择，不代表对 GitHub 全部项目的绝对排名。

| 游戏 | 上游仓库 | 本地目录 | 许可证 | 拉取提交 | 最近提交日期 |
| --- | --- | --- | --- | --- | --- |
| 扫雷 | [DavidNHill/JSMinesweeper](https://github.com/DavidNHill/JSMinesweeper) | `minesweeper/` | MIT | `256cd7d0a1a69dc1925628594064e126ad04cee5` | 2026-09-23 |
| 数独 | [TN1ck/super-sudoku](https://github.com/TN1ck/super-sudoku) | `sudoku/` | MIT | `165dcdba85f01624faf2acfd1524fdd8ac8bef63` | 2026-06-09 |

## 选择依据

**JSMinesweeper** 同时提供游戏、求解器和局面分析器：经典三档难度、自定义棋盘、首步安全或开局展开、尝试生成无需猜测的棋盘、固定种子与同盘重玩、插旗与连开、安全格提示、精确概率分析、自动求解、MBF/ABF 棋盘导入以及棋盘和分析局面导出。默认在浏览器内计算，不需要游戏后端。它的强项是逻辑推理和分析，界面主要面向鼠标操作。

**Super Sudoku** 提供五档难度，实际拉取的题库包含 3,014 条题目记录：Easy、Medium、Hard、Expert 各 600 条，Evil 614 条。支持提示、自动和手动候选数、错误及冲突高亮、撤销/重做、自动存档、暂停/继续、用时记录、完整键盘操作、移动端布局、中文等多语言、深色模式和 PWA 离线支持。还支持创建自定义题目、唯一解校验和题目合集；仓库保留出题与求解算法及原有测试。

主要对照项目如下，功能以其 README、架构说明和本次核对的源码为依据。

| 候选 | 判断 |
| --- | --- |
| [AlexAegis/minesweeper](https://github.com/AlexAegis/minesweeper) | 复古桌面界面、自定义棋盘和高分记录完整；本轮优先选择推理和概率分析功能更丰富的 JSMinesweeper。 |
| [jgpaiva/minesweeper](https://github.com/jgpaiva/minesweeper) | 提供网页版、CLI 和基础求解器；使用 Rust/WASM，辅助分析功能不如所选项目丰富。 |
| [Michaell14/Minesweeper-Co-op](https://github.com/Michaell14/Minesweeper-Co-op) | 支持实时多人合作与对战；需要服务端，本次 API 元数据未识别出标准许可证。 |
| [grantm/sudoku-web-app](https://github.com/grantm/sudoku-web-app) | 手工录题、两种候选数、格子着色与分享功能完善；所选项目另外带有完整题库和出题工具。 |
| [Sudokuru/Frontend](https://github.com/Sudokuru/Frontend) | 九档难度、教学、策略提示和统计很丰富；React Native Web/Expo 技术栈更重，采用 AGPL-3.0。 |
| [anicolao/sudoku](https://github.com/anicolao/sudoku) | 有照片识别、分层提示、打印、历史和离线支持；项目较新，架构说明显示出题主要使用各难度已评审基础棋盘的对称变换。本次选择题目资源和常规游戏功能更成熟的 Super Sudoku。 |

## 本地启动

以下命令从 MathPhysics 根目录执行。此次仅拉取源码和检查完整性，没有安装数独依赖、启动服务或改动首页活动目录。

扫雷使用普通静态服务即可，无需安装仓库自带 Express 依赖：

```powershell
python -m http.server 8011 --bind 127.0.0.1 --directory vendor/games/minesweeper
```

打开 <http://127.0.0.1:8011/>；按 `Ctrl+C` 停止服务。

数独建议使用 Node.js 24。其 `package.json` 标注 Node.js 24.3.1，构建采用 Vite 7：

```powershell
Set-Location vendor/games/sudoku
npm ci
npm start -- --host 127.0.0.1
```

默认打开 <http://127.0.0.1:3000/>；按 `Ctrl+C` 停止服务。`npm run build` 生成 `dist/`，`npm run preview -- --host 127.0.0.1` 可预览构建结果。

## 拉取与校验

两个目录都是独立 Git 仓库，保留 `origin`、上游 README 和 LICENSE，采用 `--depth 1 --single-branch --branch master --no-tags` 拉取当前源码。两个仓库均通过 `git fsck --full`，源码工作区均无改动，没有 Git 子模块。数独全部题库记录已核对为 81 位数字。游戏运行和浏览器交互尚未验证。

如需获取完整历史，可在相应游戏目录执行 `git fetch --unshallow`；更新当前分支可执行 `git pull --ff-only`。
