# PhET 独立模块

本目录管理 MathPhysics 的 PhET 资源，不与 Matter.js、JSXGraph 或原创课堂混合维护。

现有主线已包含 Area Builder、Forces and Motion: Basics、Energy Skate Park: Basics、Vector Addition。本分支新增 6 个适合小学数学/科学拓展的 PhET：Fractions Intro、Fraction Matcher、Balancing Act、Circuit Construction Kit: DC、States of Matter: Basics、Build a Molecule。

## 同步

运行：

```bash
python scripts/sync_phet.py
```

脚本只下载 PhET 官方发布的单文件 HTML，并生成 `modules/phet/lock.json`，记录实际文件大小和 SHA-256。不要使用 PhET GitHub 仓库根目录约数 KB 的开发启动 HTML 替代发布版，它依赖完整的 SceneryStack 开发工作区。

新增资源下载完成并通过完整性检查后，才应加入主活动 inventory。这样可以避免目录里出现“有入口但离线打不开”的假接入。

## 授权

PhET 源码、发布 HTML、图片/字体等可能存在不同许可边界。保留官方版权和许可信息；合并或再发布前逐项核验，不把整个第三方资源目录统一标记为 MIT。
