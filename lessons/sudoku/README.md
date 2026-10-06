# 科学小岛 · 数独

这里运行 MIT 项目 Super Sudoku 的完整 React 游戏，原始来源为 `vendor/games/sudoku`（revision `165dcdb`）。上游目录保持原样；`adapter/patches.mjs` 与 `adapter/overrides/` 只在临时构建副本中适配。版权 © 2023 Tom Nick，随页面保留 `LICENSE.upstream.txt`。

内置 3014 题：简单、中等、困难、专家各 600 题，魔鬼 614 题。保留题集、自建题唯一解检查、自动候选、冲突与错误高亮、笔记复制粘贴、撤销重做、计时暂停、7 种语言和深色主题。页面新增明确的填写/笔记按钮与触屏数字盘，原题数字锁定；设置整行可触摸，棋盘没有文本输入框。新访客默认中文，已选语言会保留。

普通站点构建和打包只校验已经提交的静态文件，不联网，也不现场安装依赖。

## 显式复建

在仓库根目录使用 Node.js 20.19+ 或 22.12+。首次复建需显式安装上游锁定依赖到系统临时目录中的专用缓存；这一步需要网络：

```powershell
node scripts/build_sudoku.mjs --install-deps --deps-only
node scripts/build_sudoku.mjs
python scripts/build_logic_games.py --check --game sudoku
```

之后缓存仍在时，运行第二条即可离线复建。构建会创建临时副本、应用适配、生成静态文件、核对上游 SHA 未改变，然后删除临时副本。上次 `build.json` 列出的旧产物会被替换，`adapter/` 与本说明保留。输入包含全部本地上游源码、锁文件、适配源码、构建脚本、共享主题和实际复制的图标；输出包含脚本、CSS、图片、唯一解 worker、PWA manifest 与 service worker。`build.json` 不对自身建立哈希。

## 页面与宿主接口

通过本地 HTTP 打开 `/lessons/sudoku/`，保留 Hash Router 的 `#/select-game`。字体、题库和运行资源均为本地文件。PWA 的 `start_url`、`id` 和 `scope` 为 `./`，service worker 只控制当前数独目录。`autoUpdate`、`skipWaiting` 和 `clientsClaim` 启用；已打开的旧测试页可能仍执行更新前的脚本，等待新 worker 激活后重新打开即可。开发验收可用新的浏览器上下文和端口，不需要删除用户存档。

准备完成时设置 `window.__mpReady = true`，同源 iframe 通知 `{type:'mp-ready', id:'sudoku'}`；返回活动发送 `{type:'mp-close', id:'sudoku'}`。接收 `{type:'mp-reset'}` 时必须同时满足 `event.source === parent` 和 `event.origin === location.origin`，随后恢复当前给定题面、清除输入/笔记/本题操作历史、重置计时并继续游戏，保留其他题记录与偏好。`render_game_to_text()` 返回只读 JSON 状态供自动验收使用。

所有持久化键使用 `mathphysics.sudoku.*`：当前题、每题进度与最多 40 步近期历史（处于更早撤销位置时保留该位置）、题集、偏好、语言和主题；路由器临时滚动缓存也使用同一前缀的 sessionStorage。离页会立即保存最后一次操作。存档不可用时页面明确提示，并在当前页继续运行；损坏的题目或偏好记录不会阻止打开题库。

## 验证

```powershell
node --test tests/sudoku.test.mjs
$env:PYTHONPATH = (Resolve-Path '.test-deps/python').Path
$env:CHROMIUM_EXECUTABLE = (Resolve-Path '.test-deps/browsers/chromium_headless_shell-1194/chrome-win/headless_shell.exe').Path
$env:PYTHONIOENCODING = 'utf-8'
python tests/sudoku-browser.py
```

浏览器测试使用新上下文与随机临时端口，覆盖 390、820、1440 像素布局、填数/笔记、撤销分支、提示、键盘、立即刷新恢复、题库最后一题、自建唯一解、损坏/禁用存档、宿主重置与 PWA 离线。报告和截图在 `output/sudoku-audit-20261002/`，测试结束会关闭浏览器并确认临时监听端口释放。

本轮适配修复了 Windows CRLF 题库导致的启动异常、撤销后新增操作未丢弃旧分支、从自动候选增加笔记时丢失候选、离页最后操作未立即保存、自建重复题恢复到原合集，以及路由器在 sessionStorage 被禁用时的启动异常。完整上游模块仍保留，没有裁剪成简化小游戏。
