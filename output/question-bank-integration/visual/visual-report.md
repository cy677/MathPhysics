# 中文题库集成视觉验收

检查日期：2026-10-01  
检查地址：本地预览 http://127.0.0.1:8765/  
结论：本轮未发现需要修复的视觉或交互问题。

## 亲自查看

- 首页“中文题库”筛选能留下“中文题库工坊”卡片。卡片沿用首页奶油白底、暖黄色插图、圆角边框和森林绿入口按钮，与“数与生活”页面的配色、中文字体和卡片样式一致。
- 独立题库页和首页内嵌题库均显示完整题库表单与题目。内嵌页使用外层活动栏提供返回、说明、重开和全屏操作，没有重复的活动导航。
- 在内嵌题目中实际打开了分步提示与解题过程，填写正确答案后看到“答对了”，答案栏和检查按钮进入已作答状态。点击“返回小岛”回到首页目录。
- 320 像素下设置表单改为紧凑双列，题目内容继续向下滚动；390、768、1024 和 1280 像素视图也没有明显遮挡、按钮挤压或导航冲突。平板与桌面下表单和题目并排，整体间距和主站一致。

## 自动化检查

- 使用本地 Node Playwright/Chromium，在 320、390、768、1024、1280 像素下检查首页、内嵌页外框及内页、独立页。所有页面的 scrollWidth 都等于视口宽度；内嵌和独立页各宽度均载入 20 道题。
- 自动生成 3 道分数加法题，验证提示与解析文本出现、正确答案判定成功，并确认“换一组随机练习”生成了不同题目。
- 页面没有 JavaScript 错误，也没有发起外部网络请求。题库背景色为 rgb(245, 243, 233)，字体栈包含 system-ui、Segoe UI 和 Microsoft YaHei。
- 原有 tests/question-bank-browser.py 因当前 Python 环境无法导入 playwright.sync_api 而未启动；以上浏览器检查通过 Node Playwright 完成。

## 截图

- [首页题库卡片（320）](C:/Users/cheng/Desktop/MathPhysics/output/question-bank-integration/visual/home-card-320.png)
- [内嵌题库（320）](C:/Users/cheng/Desktop/MathPhysics/output/question-bank-integration/visual/home-iframe-320.png)
- [内嵌题库（768）](C:/Users/cheng/Desktop/MathPhysics/output/question-bank-integration/visual/home-iframe-768.png)
- [内嵌题库（1280）](C:/Users/cheng/Desktop/MathPhysics/output/question-bank-integration/visual/home-iframe-1280.png)
- [内嵌提示、解析与答对反馈](C:/Users/cheng/Desktop/MathPhysics/output/question-bank-integration/visual/home-iframe-answer-feedback.png)
- [独立题库页（320）](C:/Users/cheng/Desktop/MathPhysics/output/question-bank-integration/visual/standalone-320.png)
- [独立题库页（1280）](C:/Users/cheng/Desktop/MathPhysics/output/question-bank-integration/visual/standalone-1280.png)
- [现有“数与生活”页面对照](C:/Users/cheng/Desktop/MathPhysics/output/question-bank-integration/visual/primary-math-comparison.png)
- [五种宽度的自动化测量结果](C:/Users/cheng/Desktop/MathPhysics/output/question-bank-integration/visual/responsive-report.json)

## 320 像素滚动到底检查

独立页末题完整位于 844 像素视口内；内嵌页末题完整位于 646 像素 iframe 视口内。固定操作栏未遮住末题答案区或提示按钮。

- [独立页底部（320）](C:/Users/cheng/Desktop/MathPhysics/output/question-bank-integration/visual/standalone-320-bottom.png)
- [内嵌页底部（320）](C:/Users/cheng/Desktop/MathPhysics/output/question-bank-integration/visual/home-iframe-320-bottom.png)
- [滚动到底的边界测量](C:/Users/cheng/Desktop/MathPhysics/output/question-bank-integration/visual/layout-edge-report.json)
