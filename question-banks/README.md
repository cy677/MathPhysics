# ASDiv / SVAMP / GSM8K 选题复核与分类

本目录保存完整的 **12,097 条来源记录**及其分类、质量提示和代表题选择结果。ASDiv 2,305 题与 SVAMP 1,000 题组成基础应用题候选池；GSM8K 8,792 题独立保存和统计。原始来源记录不会因去重或未获推荐而从台账消失。

## 先看这些文件

| 文件 | 用途 |
| --- | --- |
| [REVIEW.md](REVIEW.md) | 本次复核结论、主要问题、重复判断、教学覆盖及使用建议 |
| [curated/coverage.md](curated/coverage.md) | A01–A16、V00–V07、G01–G10 的实际分类与推荐数量 |
| [curated/foundation_representatives.jsonl](curated/foundation_representatives.jsonl) | ASDiv＋SVAMP 的代表候选与审题对照候选 |
| [curated/gsm8k_representatives.jsonl](curated/gsm8k_representatives.jsonl) | GSM8K 的独立代表候选；当前仅从原 train 划分选择 |
| [curated/selection_report.json](curated/selection_report.json) | 可供程序读取的全量统计、来源校验、选题规则和方法边界 |
| [selection/audit.ipynb](selection/audit.ipynb) | 可复算的审计笔记：完整性、分类、家族上限和已核案例 |

三个 `curated/*_selection.jsonl` 文件保留所有源 ID、版本、逐题指纹、分类依据、质量标记与选择理由。`quality_findings.jsonl` 汇集带质量或改编提示的记录，`duplicate_groups.jsonl` 保存推定家族及跨库相似证据。它们都是原台账的索引或视图，不能再次相加为题目总数。

## 怎样理解状态

| 字段 | 含义 |
| --- | --- |
| `decision=keep` | 规则筛查后可进入中文化的候选，仍需题意与讲解审核 |
| `decision=adapt` | 数量关系有利用价值，但单位、情境、表述或源解析需要修订 |
| `decision=hold` | 有疑点、超出本期范围或需要专门处理，暂不推荐 |
| `decision=reject` | 已记录的原题问题或一份完全重复记录，保留审计信息 |
| `recommended=true` | 已按教学覆盖和家族上限进入代表清单；是 keep/adapt 的子集 |
| `selection_role=reserve` | 同类备用题；超过推荐配额不等于错题 |
| `selection_role=source_test_reserve` | 保留 GSM8K 原 test 身份，暂不进入本轮代表清单 |
| `publish_allowed=false` | 尚未完成中文成题与发布审核；不能直接接入儿童练习或考核 |

质量标记统一使用 Q01–Q09，具体定义见 [selection/taxonomy.json](selection/taxonomy.json)。自动疑点、已核验问题、先修范围限制和单位改编需求分别保留证据与严重度，不合并报告为“原库错题率”。

`review_status` 与 `classification_status` 区分自动规则推定和注明的模型逐题例外复核。`human_approved` 均为 false，没有把自动处理写成教师逐题审核。

## 分类与重复控制

ASDiv 用 A01–A16 扩展数量关系类别；SVAMP 用独立的数量关系标签和 V 类训练标签描述未知量位置、比较方向、所问范围等要求；GSM8K 用 G01–G10 组织综合应用题。默认层级为 C1 基础巩固、C2 综合巩固、I1 审题提高、I2 关系提高，`extension` 对应原方案的 H 暂缓或专项扩展。原始年级仅作溯源，不自动变成项目建议年级。

代表选择采用 [selection/policy.json](selection/policy.json) 中的明确上限：每个教学覆盖单元最多选 3 个不同故事家族，每个故事家族合计最多 5 题，同故事、同文本推定目标和数值域最多 1 题。覆盖单元由类别、子类、默认层级、数值域和推理标签共同确定，因此“3 个家族”不等于“每类只有 3 道题”。

完全同题、换数换名模板、相似故事家族和教学覆盖单元分别记录。相同的加减乘除算式不会单独成为删题依据。`source_lineage_id=unknown` 表示没有核实原始血缘；文本相似推定的 `story_family_id` 和 `assessment_group_id` 不冒充官方母题关系。将来建立练习与独立考核时，应按 `assessment_group_id` 隔离相关题目，而不是直接照用来源 train/test。

## 重建与验证

需要 Python 3.10 或更新版本；筛选与校验脚本只依赖标准库。

```bash
python question-banks/selection/fetch_sources.py --source-root .selection-sources
python question-banks/selection/build.py --source-root .selection-sources --output question-banks/curated
python -m unittest discover -s question-banks/selection -p 'test*.py' -v
python question-banks/selection/validate_audit.py --source-root .selection-sources
python question-banks/selection/build.py --source-root .selection-sources --output question-banks/curated --check
```

下载和构建均核验 [SOURCE_LOCK.json](SOURCE_LOCK.json) 内的版本与 SHA-256；来源文件的内容或数量变化会中止构建。`--check` 校对全部生成文件，不写入文件。分支的自动工作流使用相同来源、规则和验证，成功后提交生成台账。

各库的方法和具体案例见 [ASDiv 说明](selection/asdiv_review_notes.md)、[SVAMP 说明](selection/svamp_review_notes.md)、[GSM8K 说明](selection/gsm8k_review_notes.md) 与 [去重说明](selection/dedup_notes.md)。

## 来源与许可沿用

本目录延续原分支的元数据交付方式，原始题文通过锁定来源下载到被忽略的 `.selection-sources` 中。ASDiv 的原来源标注为 CC BY-NC 4.0，SVAMP 顶层仓库为 MIT 且与 ASDiv-A 有题源关系，GSM8K 官方为 MIT；本次分类没有改变这些来源记录。中文改编仍须保留相应来源和许可信息。
