# 全前端风格统一基线

日期：2026-09-30。基线对应本次实施开始前的当前工作树，包含此前已有的未提交修改；没有执行 reset、clean 或 commit。仓库根目录不存在项目级 `AGENTS.md`。本次只新增本目录的验收材料，专用单测日志见 [baseline-unit-tests.txt](baseline-unit-tests.txt)。

## 范围与基线结论

以当前 `config/inventory.json` 和 `config/local-activities.json` 为准，产品目录共 63 个入口：53 个上游入口加 10 个本地入口，其中 Matter.js 48 项、PhET 4 个模块共 13 屏，另有原 Tangram、几何证明、航天、JSXGraph 六实验和平面 Tangram。最终浏览器矩阵详见 [validation-plan.md](validation-plan.md)。

完整 Node 单测输出为 57 项：56 项通过、0 项失败、1 项因 Windows 环境跳过。跳过的是只适用于 Linux 的 `python` 命令回退测试。`single-file builder` 断言正常运行并按其构建流程重建了忽略目录内的 `dist/MathPhysics-Spaceflight.html`。该产物由当前 `scripts/build_spaceflight_standalone.py` 和当前课堂源码生成。

已有 `docs/full-test-2026-09-30/summary.json` 记载上一轮 42 项单测与 283 条浏览器记录通过，但它早于现在的 63 项目录，不能替代本次验收。该报告还记录 Windows 上 `npm start` 因 Python 命令入口返回 9009 的兼容问题；`python scripts/serve.py` 可用。它的浏览器覆盖为 Chromium 模拟，没有实体 iPad Safari。

## 环境检查

| 项目 | 结果 |
| --- | --- |
| Windows | 10/11 工作区；项目根目录 `C:\Users\cheng\Desktop\MathPhysics` |
| Node / npm | Node 24.14.0；npm 11.5.2 |
| Playwright | 项目本地 Playwright 1.56.0 可解析 |
| Chromium | 项目缓存 `.test-deps/browsers` 内的 Chromium Headless Shell 141.0.7390.37 可启动并关闭 |
| 默认浏览器缓存 | 不可用：Playwright 默认查找 `%LOCALAPPDATA%\\ms-playwright`，该处缺少本版本可执行文件；将 `PLAYWRIGHT_BROWSERS_PATH` 指向项目缓存后通过启动探针 |
| 真实设备 | 没有实体 iPad/Safari；最终报告应标记为未覆盖 |

单测命令为 `npm test`（调用时附带的试验性 `--test-name-pattern` 没有排除 builder，因此实际跑完了整套测试）。返回码为 0，完整日志保存在本目录。启动 Chromium 的探针未打开任何页面，也未启动 HTTP 服务。
