# “数与生活”交互验收

**结果：通过。** 48 道题均在滑块合法最小值、中间值和最大值产生可见的 SVG 图形变化；固定题目数据保持不变。每题只有一个可访问的滑块与同步数值，键盘、加减按钮、鼠标和触屏拖动、播放/暂停、重置、减少动态设置均通过。无效/错误答案和单纯调节滑块不会误存完成状态；答对后即时存档，刷新后恢复。旧 Singapore checkpoint `pm-46` 恢复到推荐的 6 年级；宿主打开课堂、ready、返回并移除 iframe 均通过，其他宿主设置保留。

语义抽查包括：`pm-27` 的 403020 位值列正确显示零位；`pm-35` 六礼包各有 3 个苹果和 4 个橙子，试七包时外余 4 个苹果和 3 个橙子；`pm-42` 的 3:5 比例单位长度相同，红徽章试 30 枚、合计 80 枚时图形仍在画布内。`pm-26` 的 354 卡片实际被选中，最大值提示准确；`pm-47` 显示两组平均数和五个等高的试验柱，没有把平均数说成每个人的实际读书量。页面只保留年级筛选，没有老师/家长、课程依据、逐册认证或来源许可说明。

桌面 1440、平板 768、手机 390 下页面外层均无横向溢出，滑块可见且可达。手机模型画布内部宽 660px，并提示左右滑动查看完整图形。两题的 HTTP 与重建后的真实 `file://` 单页语义检查均通过；单页 ready、交互正常、外部请求为 0。浏览器页面错误为 0。

| 证据 | 文件 |
|---|---|
| 48 题三值图形、交互、进度、宿主及离线结果 | [最终浏览器 JSON](../../output/playwright/primary-math-interaction/report.json) |
| `pm-26`、`pm-47` 文案与 file:// 复核 | [定向浏览器 JSON](../../output/playwright/primary-math-interaction/copy-stage/report.json) |
| 桌面截图 | [1440 × 1000](../../output/playwright/primary-math-interaction/screenshots/primary-1440x1000.png) |
| 平板截图 | [768 × 1024](../../output/playwright/primary-math-interaction/screenshots/primary-768x1024.png) |
| 手机截图 | [390 × 844](../../output/playwright/primary-math-interaction/screenshots/primary-390x844.png) |
| 语义截图 | [位值 403020](../../output/playwright/primary-math-interaction/screenshots/model-pm-27-trial-403020.png)、[六礼包](../../output/playwright/primary-math-interaction/screenshots/model-pm-35-trial-6.png)、[七包与剩余水果](../../output/playwright/primary-math-interaction/screenshots/model-pm-35-trial-7.png)、[pm-26 file 页面](../../output/playwright/primary-math-interaction/copy-stage/screenshots/file-pm-26.png)、[pm-47 file 页面](../../output/playwright/primary-math-interaction/copy-stage/screenshots/file-pm-47.png) |
| 最终 npm 测试 | [日志：130 项，129 通过、0 失败、1 跳过](final-npm-test-after-copy-fix.txt) |

初始基线的 3 个失败来自旧目录计数及物理归组选项的迁移预期；最终全量测试已通过。两次浏览器验收报告均记录 Chromium 已关闭、测试 HTTP server 已停止且自有端口已释放。复跑入口为 [primary-math-interaction-browser.mjs](../../tests/primary-math-interaction-browser.mjs)。
