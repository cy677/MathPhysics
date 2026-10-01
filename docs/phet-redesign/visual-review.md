# PhET 内部 UI 视觉验收

**日期：** 2026-09-30　**结果：** 关键场景通过；交付阻断项 0。另有一项非阻断的自由堆叠观感建议。

验收通过 CUA IAB 查看最新构建。平板布局使用 `tests/phet-tablet.html` 中实际 1024×768 的 iframe，外层按 0.82 缩放显示；这验证的是 1024×768 布局，不代表实体平板或触屏验收。对比页标注并显示相同 1280×720 的运行截图。

| 场景 | 实际覆盖 | 结果 |
|---|---|---|
| 拔河 | 拖入蓝队小号到 Left knot 1、红队小号到 Right knot 4，再开始比赛；DOM 确认两者已附着。 | 最新短身小号仍明显小于大/中号；稳定画面与开始后双脚贴近地面，手与绳结对齐，身体完整，无透明漏色。 [运行截图](screenshots/luna-tablet-tug-active.png) |
| 推箱子 | 运动屏设为 50 N，观察推手与箱体接触；重置后把 Girl 放到箱顶，再把 Man 放到 Girl 上方。 | 推手前倾、手触箱体，脚落地；女孩坐姿与箱顶接触自然。组合堆叠的观感见下方问题。 [堆叠截图](screenshots/luna-tablet-push-stack.png) |
| 滑板 | 入门、摩擦力、跟踪运动场三屏；核对六个滑板人物选项，切换 Skater 1 与 Skater 6。 | 六个人物缩略图齐全；抽查的两位完整显示、双脚在水平滑板上。质量、摩擦、轨道及时间控制在画面内，无裁切。 [入门](screenshots/luna-tablet-skate-entry.png)、[摩擦力](screenshots/luna-tablet-skate-friction.png)、[自建场地](screenshots/luna-tablet-skate-custom.png) |
| 面积 | 游戏 Level 6。 | 目标、面积/周长、工具和分数均可读，无裁切；PhET 标识可见。 [Level 6 截图](screenshots/luna-tablet-area-level6.png) |
| 向量 | 第 4 屏“等式”。 | 方程类型、系数、向量显示、分量样式、基向量和场景控件在 1024×768 内可读，无裁切；PhET 标识可见。 [等式屏截图](screenshots/luna-tablet-vector-equation.png) |

**P3 · 非阻断视觉建议：** 在推箱子运动屏将 Man 堆到已坐在箱顶的 Girl 上方，可形成成人悬坐在女孩举起的手上方的夸张画面。人物没有明显穿模或缺肢，默认场景也不会出现；这是自由堆叠组合才触发的观感问题，不阻止交付。复现步骤即推箱子运动屏中依次将 Girl 拖到箱顶、Man 拖到 Girl 上方。证据见[堆叠截图](screenshots/luna-tablet-push-stack.png)。

`comparison.html` 的推箱子、拔河、滑板三组改造后图均显示完整已加载的模拟画面，不是载入占位帧；拔河图处于已加载、尚未开始的初始状态。 [推箱子对比](screenshots/luna-comparison-push.png)、[拔河对比](screenshots/luna-comparison-tug.png)、[滑板对比](screenshots/luna-comparison-skate.png)。宿主页脚保留 PhET / University of Colorado Boulder 署名与 CC BY-NC 4.0，直接模拟页保留 PhET 标识。

**覆盖边界：** 本记录是关键场景视觉验收，不是 13 页逐页验收。拔河与推箱子检查了指定交互；滑板三屏均检查；面积只看 Level 6，未逐一查看六级；向量只看第 4 屏；未检查力与运动的摩擦力、加速度屏。不得据此声称 13 页都经过视觉检查。逻辑回归与静态检查由主线程另行完成。
