# 本地学习服务、备份与恢复

本轮在本机整合学习服务与题库，不执行远端部署，也不创建真实账号。具体字段见 [API 契约](api-contract.json)，正式题型见 [考核覆盖](assessment-coverage.md)，同步约定见 [同步适配](sync-adapters.md)。

## 环境和入口

学习服务使用 Node.js 24.14.0 及其内置 SQLite 3.51.2，HTTP、密码派生和数据库均使用 Node 内置模块。Python 3 继续负责静态服务与构建。Playwright 仅为测试依赖。

`npm start` 和 `START_WINDOWS.bat` 保留原静态演示方式。正式服务入口为 `http://127.0.0.1:8317/mathphysics/`；根路径、历史大写 `/MathPhysics/` 和单文件 `file://` 不进入正式积分模式。

数据库默认位于项目父目录的 `runtime/mathphysics.sqlite3`。桌面项目的默认位置是 `C:\Users\cheng\Desktop\runtime\mathphysics.sqlite3`，不在静态根目录内。可以用 `--db` 指定另一个明确的外部路径。SQLite 主文件、WAL、SHM、服务锁和备份不进入源码或交付包。

## 初始化和启动

先查看环境和 CLI 选项：

```powershell
node --version
node server/cli.mjs help
```

由操作者首次初始化账号，密码在终端隐藏输入并再次确认：

```powershell
npm run server:init -- --username family --label "学习档案"
npm run start:server -- --port 8317
```

打开小写 `/mathphysics/` 入口，再从“账号与档案”登录。账号可以有多个昵称档案，无需真实姓名或生日。密码至少 12 个字符；CLI 拒绝命令行 `--password`，本轮没有预置密码。自动化验证只使用合成账号及临时数据库。

已有账号时 `init` 拒绝再次初始化，不覆盖档案。需要第二个账号可执行 `node server/cli.mjs account-add --username family2`。服务默认仅监听回环地址，关闭后再启动继续保留原数据库内容。

自选外部数据库路径的例子：

```powershell
npm run server:init -- --db ..\runtime\family.sqlite3 --username family
npm run start:server -- --db ..\runtime\family.sqlite3 --port 8317
```

服务会拒绝在静态根目录及其真实符号链接或 junction 下存放数据库和备份。

## 同步、冲突和正式积分

浏览器先读取会话，再登录或切换档案。写入使用同源会话 Cookie、Origin 与 CSRF token。离线或登录过期时保留待同步副本，不能显示为已经保存到服务器。

存档提交携带 `expectedRevision` 和 `mutationId`。修订不一致返回 `409 revision_conflict`，界面同时保留服务器版本与本地待同步版本，让操作者选择采用服务器或上传本地。相同幂等键用于不同内容返回 `409 idempotency_conflict`。档案切换使旧请求与旧存储句柄失效，防止跨档案串写。

正式考核由服务器签发固定题目，提交只包含题目 ID 与原始回答。客户端不能提交 `score`、`correct`、`credits` 或自己的试卷定义。未答题仍计入服务器冻结分母；重复提交返回原结果，已定案试卷的不同回答被拒绝。同目标奖励按兼容规则取历史最佳增量，积分账目可以追溯到实际题目与考核。

生活应用题另保留题目家族和跨池关联，正式发题与奖励控制不能把换数字或相似故事当作无限独立奖励。当前候选尚需批准时正式题库能力为空；练习预览、演示与历史本地记录导入都是零分。

## 只读核验、一致备份与恢复

核验数据库、冻结试卷、账本、奖励桶和修订：

```powershell
npm run server:verify
```

返回 `ok:true` 才表示该次核验通过，失败返回非零退出码。使用 SQLite 一致性备份接口，不直接复制正在写入的主数据库：

```powershell
npm run server:backup -- --out ..\backups\mathphysics-local.sqlite3
```

备份目标必须是新的外部文件。保留工具返回的核验结果与指纹；备份包含账号和学习资料，不放入 Git 或静态目录。

先停服务，再恢复至一个不存在的新路径：

```powershell
npm run server:restore -- --from ..\backups\mathphysics-local.sqlite3 --db ..\runtime\restored.sqlite3
npm run server:verify -- --db ..\runtime\restored.sqlite3
npm run start:server -- --db ..\runtime\restored.sqlite3 --port 8317
```

恢复默认拒绝覆盖既有目标、同源目标和静态目录内路径。优先核验新副本，再决定切换。重建派生汇总或内部重评须停服务，保留事实与账目历史，不通过手工写积分掩盖不一致。

## 构建与本地验证

```powershell
npm test
npm run test:server
npm run test:learning:browser
npm run test:word-problems
npm run test:word-problems:browser
npm run package
npm run test:offline-delivery
npm run build:server
npm run test:server-delivery
```

浏览器测试使用已有 Playwright Chromium 或 `CHROMIUM_EXECUTABLE` 指定的本地浏览器。独立验收覆盖桌面、平板和窄屏触摸模拟；模拟不等于物理 iPad/Safari 测试。实际通过、失败、跳过和未测试项，以本轮证据报告为准，不继承历史候选的通过数。

本轮没有连接真实生产数据库、安装服务、改 Nginx 或运行公网部署。
