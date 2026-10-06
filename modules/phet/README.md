# PhET 独立模块

本目录管理 MathPhysics 新增 PhET 资源的清单与固定哈希。活动已接入主目录，并与原有四个 PhET 共用主题构建和本地打包流程。

现有主线已包含 Area Builder、Forces and Motion: Basics、Energy Skate Park: Basics、Vector Addition。本分支新增 6 个适合小学数学/科学拓展的 PhET：Fractions Intro、Fraction Matcher、Balancing Act、Circuit Construction Kit: DC、States of Matter: Basics、Build a Molecule。

## 同步

运行：

```bash
python scripts/sync_phet.py
```

脚本只下载 PhET 官方发布的单文件 HTML，并生成 `modules/phet/lock.json`，记录实际文件大小和 SHA-256。不要使用 PhET GitHub 仓库根目录约数 KB 的开发启动 HTML 替代发布版，它依赖完整的 SceneryStack 开发工作区。

本分支已经包含六项官方成品。正常启动、构建和测试无需下载；`npm run build:phet` 会校验 `lock.json`，将活动和哈希登记至主 inventory，再生成 `src/phet/generated/` 展示页。官方原文件保留在 `vendor/phet/`。新增模块共15个实验页面，加上原有13页，共28页。

同步脚本用于显式更新上游资源，会访问官方 `latest` URL 并改写本目录锁文件。资源与主 inventory 的固定哈希不一致时，主题构建会停止，需先审查新版本及显示补丁，不能直接覆盖主 inventory 来跳过检查。`npm run test:phet:browser` 检查离线运行、宿主交互、原版与主题版模型实现；视觉验收见 [融合报告](../../docs/phet-expansion/integration.md)。

## 授权

PhET 源码、发布 HTML、图片/字体等可能存在不同许可边界。保留官方版权和许可信息；合并或再发布前逐项核验，不把整个第三方资源目录统一标记为 MIT。
