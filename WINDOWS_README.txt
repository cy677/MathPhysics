科学小岛 MathPhysics — Windows 源码与免安装运行包

适用环境：Windows 10 / Windows 11，64 位（x64）。
包内已附 Node.js 24.14.0 和全部现有课堂资源。
日常使用无需安装 Node.js、Python、npm 或数据库，也无需联网下载依赖。

开始使用
1. 在 ZIP 上点击右键，选择“全部解压缩”，解压到可写的文件夹。
2. 打开解压后的 MathPhysics-Windows-x64-* 文件夹。
3. 双击最外层的 START_WINDOWS.bat。
4. 浏览器自动打开 http://127.0.0.1:8317/mathphysics/，无需注册或登录。
   如果浏览器没有自动打开，手动访问这个地址。
5. 使用时保持命令窗口打开；结束时在窗口按 Ctrl+C，确认停止即可。

目录说明
START_WINDOWS.bat    一键启动入口
app/                 当前项目源码、课堂、服务端、构建工具和许可证
node/node.exe        配套的 Windows x64 Node.js 运行时
node/LICENSE         Node.js 及其依赖的许可声明
BUILD.json           包内文件 SHA-256 清单与运行时来源
runtime/             首次启动后自动创建，保存考核数据库

学习记录
考核记录保存在 runtime/mathphysics.sqlite3；练习存档保存在当前浏览器。
请继续使用同一浏览器与访问地址。移动程序时，先停止服务，再移动整个文件夹，
一并保留 runtime/。本包不包含原电脑上的账号、数据库或学习记录。

更换端口
如果 8317 已被使用，在本文件夹的命令提示符中运行：
  START_WINDOWS.bat --port 8318
浏览器会自动打开相应地址。不同端口的浏览器练习存档独立保存。

开发与重新打包
源码位于 app/，已生成的课堂可直接运行。修改普通 HTML、CSS、JS 后刷新即可。
运行构建脚本需另备 Python 3；安装测试依赖需另备 npm。
在 app/ 目录中重新制作 Windows 包：
  python scripts/package_windows.py --node ..\node\node.exe
也可以在已安装 Node.js 24.14.0 和 Python 3 的开发环境运行 npm run package:windows。
打包保留现有生成资源，校验固定资源与游戏构建输入，不自动重建所有课堂。

完整使用说明见 app/README.md，备份与恢复见 app/docs/server-learning-operation.md。
第三方来源和许可证见 app/THIRD_PARTY_NOTICES.md 及对应 vendor/ 目录。
