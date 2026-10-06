# GSM8K B 独立中文内容核对（2026-10-06）

本轮实际读取并核对当前 `content-work/results/gsm8k-b.jsonl` 全部260条，不沿用冻结旧题库或旧审核结论。252条为 `assistant-confirmed`，3条为 `needs-correction`，5条为 `quarantine`。未审范围为0条；这些判断是助手内容复核，全部 `humanApproved=false`，不构成人工教学批准。

逐条核对中文条件和所求，独立重算，核对当前number/rational答案、所求单位、提示、步骤、易错点；对照英文原题及原数值结果，明确记录中文情境和公制数值重设。连续时间、端点计数、完整包装/整袋、百分数/分数基准、等权与加权平均以及并行最优下界均按实际题意核对。未调用或引用程序表达式验证冒充逐题语义核对。

## 当前须修3条

| ID | 数学答案 | 具体修订 |
| --- | --- | --- |
| gsm8k:train-3389 | 61/5千克＝12.2千克，题干和步骤正确 | `hints`替换为“先把香水、肥皂和果酱的克数相加，再按1千克＝1000克换成千克。”；当前提示仍是盎司转磅。 |
| gsm8k:train-6002 | 39摄氏度，7次读数和273，题干和步骤正确 | `hints`替换为“先把7次摄氏温度读数相加，再除以7。”；当前提示仍要求使用华氏度。 |
| gsm8k:train-3451 | 108分钟，题干和步骤正确 | `commonMistakes`替换为“把每株半分钟误当作每排半分钟，少算了每排7株的用时。”；当前将正确的每株半分钟反说成误读。 |

具体字段替换和原因已写入JSONL `fixes`，仅建议修改本地整合副本；本轮没有修改草稿或项目。当前输入哈希仍判需修，实际修改后需重新绑定哈希并核对。

## 保持隔离5条

| ID | 独立依据 |
| --- | --- |
| gsm8k:train-6304 | 深蓝B为整数且21≤B≤59，绿4，红59−B可为0至38；38只是上界。 |
| gsm8k:train-6539 | 858/6＝143为间隔量，缺桥位置、各段端点立柱与相位规则；不同边界约定可得286或290，不能唯一计柱。 |
| gsm8k:train-5980 | 全校平均需人数权重及学校范围；均匀权重得93，1:2:1权重得93.5。 |
| gsm8k:train-4060 | 每日最大2/3小时不等于实际练满；14与35小时都可满足上限。 |
| gsm8k:train-5472 | 戴安娜练10分钟；哈妮仅有速率7次/分钟，未给时长；练5分钟合75次，练10分钟合110次。 |

## 来源错误与改编的实审证据

源结果有误而当前中文已正确求解：train-3264所求4个标记而非16根糖，train-7402总量10750而非10850，train-2621按7倍新买后的57而非22，train-2339总用水25而非30，train-5437五种用品仅四个间隔，合50而非55分钟。train-6366源解误用40代50，当前两车时长4/3小时，平均3.5四舍五入为4小时；同样末答案不能掩盖源推导错误。

公制改编在题干与adaptation中明确为教学情境数值重设，并非精确英制换算。train-3389重量从克换千克重算12.2；train-6002从体温旧数字改温水摄氏数据重算39；train-6190采用虚构摄氏练习，平均−12，无真实气象/健康推断。train-3922明确等权四树比率平均4枝/米，不能偷换成总枝/总高；train-5958与train-0193按实际地点数或销量加权。train-3516用小盒1份、中盒2份的总6000份与合速≤5/6份/秒证明最短7200秒，并给出达界分工。

## 哈希与覆盖

- 当前草稿原始文件SHA-256：`0598e3dc45b01233ef3bd9e883d7a8657d7e77b902d3e6cd9d6ea425c7f5e353`。
- 当前草稿canonical数组SHA-256：`c6882044cface08432df0b6f23fa58719c3454ce7cc5053625cb09beb9a4275b`。
- 当前草稿canonical JSONL SHA-256：`37b5000e55d4720955606e955c5ba44d5d3e436b572a6a27d1202310b1362618`。
- 分包原来源文件SHA-256：`62c37f2a0f31901e99ab043273c8690bfcaefe8c7ff5abc6cac430443471a634`。
- 完整joined来源文件SHA-256：`22e565e9559130c3ab3de7e4c072132285e49e39e5bb9f0de9db6ade60114b49`。
- 最终逐题审核JSONL SHA-256：`b3000e0b1ea925a135b84305cdd585b9c73da1be9b42a5785554214cbc37a618`。
- 每ID `sourceDraftSha256`/`inputCanonicalSha256`/`inputSha256`采用：SHA-256 of UTF-8 json.dumps(object, ensure_ascii=False, sort_keys=True, separators=(',', ':')); no trailing newline。每条另附原始无换行行SHA、原来源canonical SHA、joined original/representative canonical SHA与源行SHA。
- 独立手写260条，ID唯一260；与输入集合完全一致；缺失0、额外0、重复0。
- 分包原题body/question/answer/sourceLineSha256与joined原题逐ID一致260/260。
- 255个可唯一求解题的独立typed答案均与当前typed答案一致；其中3个教学文字未通过，仍判需修。
- 自动补充仅验证哈希、覆盖、来源映射、独立答案结构相等，不替代语义审核。当前草稿和原来源文件保持唯读；输入快照仅写在证据目录。

交付：`gsm8k-b-review.jsonl`、`gsm8k-b-review-input-manifest.json`、`gsm8k-b-input-snapshot.jsonl`以及本总结。完整手写记录为`gsm8k-b-audit-notes-complete.json`，序列化脚本为`build_gsm8k_b_audit.py`。

## 修订副本追加复审

已只读实审整合项目副本中的train-3389、train-6002、train-3451。三条指定教学文字均已正确修改；分别独立重算12.2千克、39摄氏度、108分钟，提示和易错点与题干、typed答案及步骤一致。每条追加判定`assistant-confirmed`，仍全部`humanApproved=false`。项目副本恰只改变这三处，其他257条与原审输入完全相同；结合原审，当前副本255条确认、0条待修、5条保持隔离。追加复审未重新声称本轮审查其余257条。

- 追加复审文件：`gsm8k-b-patched-review.jsonl`；SHA-256为`01ab0d444828ce685f785e6f6ce572a3a2d9ca167e3ce0aa1ade20b27b89e131`。
- train-3389修订后canonical SHA：`36302726307bbad2f5c4fdcab9f6f6099abea7553ff3d9ca680b5cc850d480a3`。
- train-6002修订后canonical SHA：`7f9dd0999614a854c501113d043e5b7a0d6e125a41634186f313b2b226ee65d1`。
- train-3451修订后canonical SHA：`63afac8d8ad92eb8b9159fb3238f64172d33ac18e5148510287393c2f4b2af2b`。
- 修订副本整体原始SHA：`5f10ade0344e91f705e2d111203987779e8e18e327767f4a4d8e8ca9429fa05d`；canonical数组SHA：`3b81faba090d12b07b788eb6f3e6c0a36b4b76e84d4b1e58ac517f0c2116f0c1`。
- 原始`content-work/results/gsm8k-b.jsonl`整体SHA仍为`0598e3dc45b01233ef3bd9e883d7a8657d7e77b902d3e6cd9d6ea425c7f5e353`；原审核JSONL保持原始判定与SHA不变，追加文件按新实际输入哈希绑定复审。

详情与前后哈希、实际改变字段、257条未变检查，见`gsm8k-b-patched-review-input-manifest.json`。
