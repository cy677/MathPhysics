# MathPhysics 与 meow 并行部署方案

最近更新：2026-10-01。目标服务器：124.70.198.189，Ubuntu 24.04。

## 2026-10-01 晚间更新结果

- 当前线上版本为 `20261001T113119Z-965c72c`，入口仍为 `https://124.70.198.189/mathphysics/`。包含本地提交 `965c72c95dc36ede7e66336c7e3c7287ef88b214` 之后尚未提交的课程、教学面板及航天模拟改动；不能仅按 Git HEAD 判断发布内容。
- 本地和服务器均重建 Launch Atlas 教学核心、展示适配器、全部10项PhET及五个独立课堂HTML；清单内1932个文件一致。服务器493项测试中490项通过、3项历史快照对比按条件跳过、0失败；本地489项通过、4项条件跳过、0失败。
- 公网Chrome完成49个知识点×3层次的147组实际生成与展示，验证新练习判题、提示、解析和刷新恢复；新航天Worker轨迹、实时读数、物理实验有限步进、PhET原生数理题及分子收集目标的教学题卡可用。统一数与生活入口、旧题库地址跳转、1024/390像素布局检查通过。
- 升级前通过独立测试浏览器使用旧线上版本生成练习，再切换发布；升级后题目ID、旧正确作答、几何及原创数学通关、探索记录、偏好和其他应用存储保留。实际用户浏览器数据留在各自设备；发布不清空存储，也不发送 `Clear-Site-Data`。
- `/srv/mathphysics/current` 已指向 `/srv/mathphysics/releases/20261001T113119Z-965c72c`，此前两个发布目录保留。在线SQLite备份、其他用户数据备份、配置基线、构建与测试日志位于权限0700的 `/srv/mathphysics/backups/20261001T113119Z-965c72c/`。
- meow服务PID、启动时间、服务配置、程序文件和首页未变；数据库全部12张表的记录数与内容指纹一致。Nginx其他文件未改，仅平滑加载MathPhysics片段；78个公开资源哈希、15个ES模块类型、4份公开课程文档及30个去重后的活动路径通过检查。
- 发布脚本补上新航天核心的重建步骤及新测试依赖的两份CI配置；这些内部配置在Nginx隐藏路径规则下不会对外提供。模块类型规则扩展到数与生活8个、题库7个 `.mjs` 文件，并精确放行新加坡课程说明。
- 最终发布包 `dist/MathPhysics-server-20261001T113119Z-965c72c.tar.gz`，SHA256为 `9bc9f3ef8232c5cdf780b603b1d9cb56d7c9f01f4a32ffcb7f976a64abe39622`。上传采用基础包加已校验差异，最终按完整清单验收。临时上传已清理，部署助手归档在备份目录；测试浏览器及其监听端口均已关闭。

最新验收见 [晚间更新验证](server-deployment-verification-20261001T113119Z.json)。下方保留此前更新与首次部署记录。

## 2026-10-01 上午更新结果

- 已上线版本 `20261001T005739Z-965c72c`，入口仍为 `https://124.70.198.189/mathphysics/`。源码以本地提交 `965c72c95dc36ede7e66336c7e3c7287ef88b214` 及本次构建、服务器配置修正为准。
- 服务器重建展示适配器、全部10项PhET及五个独立课堂HTML；清单内1873个文件与最终本地发布包一致。服务器197项测试全部通过，本地196项通过、1项按Windows平台跳过。
- 首页显示23个入口，总登记72项活动。公网Chrome验证中文题库生成、判题和刷新恢复，六项新增PhET的15个实验页面模型与新版图像加载，以及数与生活、旧几何通关记录恢复和390像素首页布局；无本站资源错误和未捕获脚本异常。
- `/srv/mathphysics/current` 指向 `/srv/mathphysics/releases/20261001T005739Z-965c72c`；旧版 `20260930T061500Z` 保留。在线SQLite备份、其他用户数据备份、配置基线及验收日志保存在权限0700的 `/srv/mathphysics/backups/20261001T005739Z-965c72c/`。
- meow服务PID、启动时间、服务配置、程序文件和首页响应保持不变；数据库全部12张表的记录数及内容指纹一致。Nginx其他配置文件未变，仅更新MathPhysics独立片段并平滑加载；浏览器原存储键与记录保留。
- 修正七巧板生成HTML与编辑清单的换行写入，避免Windows/Linux重建哈希漂移。Nginx为数与生活4个和题库6个ES模块提供正确类型，并放行题库来源说明的精确路径；其余内部文件继续隐藏。切换校验等待Nginx新工作进程生效。
- 最终发布包 `dist/MathPhysics-server-20261001T005739Z-965c72c.tar.gz`，SHA256为 `62da4fdeebb81717a5857f0fbebe08781cf0bb0ff6dcb2861a64854758daef7d`。上传采用完整基础包加已校验差异，最终以完整清单核对。

上午验收摘要见 [2026-10-01上午更新验证](server-deployment-verification-20261001.json)。下面保留首次部署的背景与记录。

## 现状与目标

- meow：`https://124.70.198.189/`；Nginx 80/8792 跳转到 443，再转发至 `127.0.0.1:8794`。
- meow 程序：`/home/Meow`；数据：`/home/Meow/pet/data/pet.sqlite` 及其 WAL 文件；服务：`meow-pet.service`。
- MathPhysics：使用 `https://124.70.198.189/mathphysics/`；源码和资源放入 `/srv/mathphysics/releases/<releaseId>`，`current` 指向生效版本。独立端口 8793 的公网探针未抵达服务器，因而选用已经可达的 HTTPS 路径，无需修改云安全组。
- 两个项目复用现有 HTTPS 入口和 IP 证书。原证书续期任务的 deploy hook 已执行 `nginx -t` 和 `systemctl reload nginx`，无需变更。

## 变更边界

1. 以本电脑当前工作目录为发布来源，包含尚未提交的修改。核查时 GitHub main 与本地 HEAD 均为 `a66c04e893592c49b7036738ef0297b5cdcf6b10`，不能仅上传 Git 提交而遗漏本地更新。
2. 重建四个 PhET 视觉版本及四个独立课堂 HTML。服务器不运行开发用 Python HTTP 服务，直接使用现有 Nginx 提供静态文件。
3. 新建 `/srv/mathphysics`，在 meow 的 HTTPS server 块内加入一行独立配置片段的 include，仅新增 `/mathphysics` 和 `/mathphysics/` 路由；原根路径代理和全部既有指令不变。不改动 meow 程序、服务、数据库、会话、上传或备份目录，也不重启 meow。部署前确认新增路径原本返回 404。
4. 发布先进入新目录；校验上传哈希、重新构建和测试后，才切换 `current`。保留历史目录，不使用覆盖式同步或删除式部署。
5. 文件响应设置 `Cache-Control: no-cache, must-revalidate`，禁用基于文件修改时间或 ETag 的 304 判定，避免版本切换时沿用旧资源。更新后重新打开或刷新页面会取得新资源；不清空 localStorage，不发送 Clear-Site-Data。
6. MathPhysics 原有 `mathphysics.state.v1` 数据键和迁移规则保持不变。两个项目共享 HTTPS origin，但 MathPhysics 只写自己的存储键，不清除其他项目的 Cookie 或 localStorage。以后继续使用相同协议、IP 与端口，浏览器数据才会继续归属于同一站点。

## 构建和发布

在本地项目目录执行 `npm run build:server -- --release <新的唯一版本号>`、`npm test`。生成 `dist/MathPhysics-server-<版本号>.tar.gz` 与 SHA256 文件；包含最新源文件、生成资源、版本信息和逐文件校验清单，不包含密码、Git 元数据、node_modules 或本地测试环境。

上传后在服务器新建同名 release 目录，只解压至该目录。核对压缩包与 BUILD.json 中的文件哈希。在该目录使用专用Node重建 `build_spaceflight_core.mjs`，然后运行发布脚本列出的六个Python构建入口，并使用 Node.js 22 或以上运行 `node --test tests/*.test.mjs`。系统 Node.js 18 不支持当前构建与测试所需的部分 API，不升级或替换 meow 的运行时。

首次部署前保存 Nginx 配置和 meow 服务状态，并通过 SQLite backup API 在线备份数据库至权限为 0700 的 `/srv/mathphysics/backups/<版本号>`；不直接复制活动中的数据库主文件充当完整备份。备份只保留在服务器，禁止置于网站根目录。

安装 `deploy/mathphysics.nginx.conf` 至 `/etc/nginx/snippets/mathphysics.conf`，只在 `/etc/nginx/sites-available/meow` 的 `listen 443 ssl;` 所在 server 块中添加 `include /etc/nginx/snippets/mathphysics.conf;`。执行 `nginx -t` 成功后平滑加载 Nginx。80/8792 原跳转也会保留请求路径，访问 HTTP 的 `/mathphysics/` 会进入对应 HTTPS 页面。

## 验收与回退

- 公网 HTTPS 证书校验通过，首页、BUILD.json、全部 57 个目录入口与四个 PhET 新入口可访问。
- 实际浏览器检查默认 22 个活动、全部 57 个活动、课堂加载、返回、刷新后配置与浏览记录保留，以及无本地资源 404。
- 对照构建哈希，确认首页、脚本和 PhET 页面来自本次版本，不能仅凭首页返回 200 判定成功。
- meow 的服务 PID、启动时间、systemd 配置哈希和首页响应保持不变；Nginx 的差异严格限定为新增的一行 include。数据库表数量与记录数对照，实际用户并发造成的正常新增记录应另行判断。
- 后续回退只将 `current` 原子切回保留的旧版本，不恢复或覆盖用户数据。首次发布若需撤销，移除本次添加的 include 行，校验并平滑加载 Nginx；保留发布目录与备份供审查。

## 2026-09-30 首次执行结果

- 已上线：`https://124.70.198.189/mathphysics/`。原 meow 继续使用 `https://124.70.198.189/`。
- 生效版本：`20260930T061500Z`；服务器目录：`/srv/mathphysics/releases/20260930T061500Z`；`/srv/mathphysics/current` 已指向此版本。
- 本地完整发布包：`dist/MathPhysics-server-20260930T061500Z.tar.gz`，SHA256：`96a9df8e0009f6e42fa23c6a2ad63ee95af8701f2005979145a9b1f450c27369`。服务器先接收完整基础包，再补传差异文件；最终以 BUILD.json 对全部 1463 个文件验证，且服务器重新生成后仍逐字节一致。
- 备份与服务器验收日志：`/srv/mathphysics/backups/20260930T060000Z/`。内含在线 SQLite 备份、原 Nginx 配置、meow 服务配置、部署前基线、最终构建日志及部署后的对照结果；备份目录权限为 0700，不在网站根目录。
- 本地最终测试：49 通过，1 个 Linux 专用测试跳过；服务器最终测试：50/50 通过。
- HTTP 检查：57 个目录入口和 4 个改编 PhET 入口均返回 200；首页、关键脚本及四个 PhET 成品哈希与构建清单一致。带缓存条件的请求也返回新内容，内部脚本、测试和隐藏文件不可通过网站下载。
- 公网 Chrome 检查：默认 22 个活动、完整 57 个活动；图形课堂、七巧板、Matter 弹弓、航天、几何证明及全部 4 个 PhET 均加载成功并能返回；刻意全部关闭的自定义列表、9 项浏览记录和独立测试存储键均在刷新后保留。390 像素宽度无横向溢出。
- meow 核对：PID 仍为 `3158136`，启动时间、systemd 配置及首页响应不变；数据库全部 12 张表与在线备份的内容指纹一致。Nginx 修改严格为一行 include，未重启 meow。8793 临时探针已停止，端口已释放。
- 构建修正：服务器打包保留上游清单要求的隐藏配置文件；PhET 素材按文件名字符串排序，消除 Windows/Linux 路径排序差异。未修改科学模型、用户存储格式或原上游资源。

本地验收摘要见 [server-deployment-verification.json](server-deployment-verification.json)，公网页面截图与浏览器原始报告在 `output/playwright/`。浏览器未出现未捕获脚本异常或 MathPhysics 路径内的资源错误。上游 PhET 自带的 Cloudflare 统计请求 `/cdn-cgi/rum` 返回 405，不影响课堂运行；保留上游文件及 meow 根路径接口，没有为统计请求新增路由。触屏宽度模拟不等同于真实 iPad Safari 验证。

后续切换已验证的发布目录时，可原子替换链接（将版本号替换为实际存在且已验证的目标，保留所有历史目录）：

```bash
set -e
test -d /srv/mathphysics/releases/<目标版本>
ln -s /srv/mathphysics/releases/<目标版本> /srv/mathphysics/current.next
mv -Tf /srv/mathphysics/current.next /srv/mathphysics/current
```

首次部署撤销：仅删除 `/etc/nginx/sites-available/meow` 中的 `include /etc/nginx/snippets/mathphysics.conf;` 行，执行 `nginx -t && systemctl reload nginx`；无需恢复数据库，也无需停止 meow。
