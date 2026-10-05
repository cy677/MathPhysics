# ASDiv / SVAMP / GSM8K 全量选题结果

本目录保存 MathPhysics 对三个数学文字题数据集的一次性全量筛选结果，不替换现有中文参数化题库。

## 定位与结果

| 数据集 | 原始总数 | 巩固 | 提高 | 复核/隔离 |
| --- | ---: | ---: | ---: | ---: |
| ASDiv | 2,305 | 1,522 | 783 | 0 |
| SVAMP | 1,000 | 999 | 0 | 1 |
| ASDiv + SVAMP 主池 | 3,305 | 2,521 | 783 | 1 |
| GSM8K（独立） | 8,792 | 3,114 | 5,138 | 540 |

ASDiv 用于扩展问题类别；SVAMP 用于基础数量关系的审题和语义变式。SVAMP 与 ASDiv-A 有题源关系，因此不能把二者简单相加当成独立母题数。GSM8K 保持独立，2 步以内列为巩固，3—5 步列为提高，超过 5 步进入复核。

ASDiv 巩固层：Addition、Subtraction、Multiplication、Common-Division、Sum、Difference、TVQ-Final。提高层：Comparison、Ratio、TVQ-Initial、TVQ-Change、Surplus、Floor/Ceil-Division、Sequential-Operation、Geometry、UnitTrans、Set/Number-Operation、Number-Pattern、GCD、LCM、Algebra-1/2。

SVAMP 的 `chal-50` 已隔离：题面无法推出标准算式中的 149，属于条件不足，不作为提高题发布。

## 文件

- `curated/asdiv_selection.jsonl`：2,305 条 ASDiv 全量台账。
- `curated/svamp_selection.jsonl`：1,000 条 SVAMP 全量台账。
- `curated/gsm8k_selection.jsonl`：8,792 条 GSM8K 独立台账。
- `curated/selection_report.json`：汇总。
- `selection/build.py`：可复现筛选脚本。
- `SOURCE_LOCK.json`：上游 commit 与 SHA-256 锁定。

## 许可证

ASDiv 为 CC BY-NC 4.0。SVAMP 仓库顶层为 MIT，但其数据由 ASDiv-A 种子题构造。为避免把上游题面重新声明为 MathPhysics MIT 内容，本分支只提交来源 ID、分类和筛选元数据，不复制 ASDiv/SVAMP 英文题面。GSM8K 官方为 MIT，本次同样只提交筛选元数据。中文发布题需保留来源/许可并完成教学审核。
