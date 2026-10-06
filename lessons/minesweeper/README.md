# 扫雷 · 逻辑乐园

完整 JSMinesweeper 游戏、概率求解器与局面分析器的科学小岛适配。上游固定于 DavidNHill/JSMinesweeper `256cd7d`，MIT 许可；原始源码与许可在 `vendor/games/minesweeper/`，不在原仓库内修改。

通过 MathPhysics 现有 Python 静态服务打开 `lessons/minesweeper/index.html`。运行时所有脚本、图形和字体均来自本地，不需要 npm、CDN 或游戏后端。

重新生成扫雷内核与校验产物：

```powershell
python scripts/build_logic_games.py --minesweeper
python scripts/build_logic_games.py --check --game minesweeper
node --test tests/minesweeper.test.mjs
node tests/minesweeper-browser.mjs
```

两游戏共同的宿主与包集合检查：

```powershell
node --test tests/logic-games-integration.test.mjs
node tests/logic-games-browser.mjs
python scripts/build_server.py --check-only
python scripts/package.py --check-only
```

`--check-only` 验证实际打包集合与游戏成品哈希，不重建其他课堂、写压缩包或联网。浏览器检查会启动临时本地服务，并在结束时关闭服务和浏览器。扫雷取消/多指/边界抬手采用 PointerEvent 状态机验证；实际轻点使用浏览器触屏接口，大棋盘滚动使用 CDP 真实 touchStart/Move/End，确认发生原生滚动且没有翻格或插旗。

`core/` 为生成文件，包含上游全部游戏、求解、概率、完整搜索与分析脚本。构建仅修改默认棋盘、设置键名、事件接入及模态布局，游戏与推理机制沿用上游。`adapter.js` 管理主题页面、触屏操作、文件选择与完整存档；`pointer.js` 在抬手时执行一次操作，滚动、取消、多指或释放到另一格均不执行。`src/assets/logic/` 的原创 SVG 替代像素棋盘图形。

常驻“翻开/插旗”模式、桌面右键、原键盘操作均保留；数字周围旗数相符时轻点数字可连开。大棋盘保留至少 28px 格子并在自身容器内滑动。高级折叠区保留自定义、首步安全/展开、无需猜测生成、种子、同盘重玩、求解方式、安全提示、概率、自动求解与严格推理。分析模式支持触屏 0–8 数字盘、雷数调整、旗帜是否视为确定的雷、MBF/ABF/.mine/.msor 文件导入与原格式导出。完整固定雷区导入及同盘重玩不承诺另一个首格仍然安全。

完整局面、旗帜、雷区、分析/复盘状态及操作模式保存到 `mathphysics.minesweeper.session.v1`，设置使用 `mathphysics.minesweeper.preferences.v1`。保存失败会明确显示；损坏存档先校验、保留原记录并回退到正常新局。网站记录清理仅删除 MathPhysics 的键。

普通服务器包与离线包只校验已生成的静态成品，不安装游戏依赖或触发联网。包中排除嵌套 `.git`、`node_modules` 与缓存；许可证及可重建源码保留。
