#!/usr/bin/env python3
"""Source-locked classification and representative selection.

All source records remain in the ledger. Recommendations are provisional
editorial candidates, never an approved child-facing question bank.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
ALIASES = {"Substraction": "Subtraction", "Common-Divison": "Common-Division"}
BANK_ORDER = {"asdiv": 0, "svamp": 1, "gsm8k": 2}
LEVEL_ORDER = {"C1": 0, "C2": 1, "I1": 2, "I2": 3, "extension": 4}
DECISIONS = {"keep", "adapt", "hold", "reject"}
RAW_FIELDS = {"body", "question", "answer", "formula", "equation", "_source_record"}
DIAGNOSTIC_CODES = {
    "insufficient_conditions": "Q01", "contradictory_conditions": "Q02",
    "incorrect_solution": "Q03", "solution_typo": "Q03",
    "arithmetic_mismatch": "Q03", "annotation_mismatch": "Q03",
    "solution_arithmetic_review": "Q03",
    "final_answer_mismatch": "Q03", "duplicate-answer-conflict": "Q03",
    "missing_external_information": "Q04", "missing_figure": "Q04",
    "out_of_primary_scope": "Q05", "ambiguous_wording": "Q06",
    "ambiguous_rounding": "Q06", "unit_mismatch": "Q06",
    "ambiguous_fraction_division_notation": "Q06",
    "context_adaptation_required": "Q07", "unsupported_answer_type": "Q09",
}


def digest(value):
    if not isinstance(value, str):
        value = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def item_key(row):
    return f"{row['bank']}:{row['source_id']}"


def verify_sources(source_root, lock):
    receipts = []
    for source in lock["sources"]:
        for entry in source["files"]:
            path = source_root / source["bank"] / entry["path"]
            data = path.read_bytes()
            actual = hashlib.sha256(data).hexdigest()
            if actual != entry["sha256"]:
                raise ValueError(f"Source checksum mismatch: {source['bank']}/{entry['path']}")
            receipts.append({
                "bank": source["bank"], "path": entry["path"],
                "sha256": actual, "bytes": len(data), "verified": True,
            })
    return receipts


def load_sources(source_root, lock):
    source_map = {s["bank"]: s for s in lock["sources"]}
    records = []
    for problem in ET.parse(source_root / "asdiv/dataset/ASDiv.xml").getroot().findall(".//Problem"):
        solution = problem.find("Solution-Type")
        original_type = (solution.text or "").strip()
        records.append({
            "bank": "asdiv", "source_id": problem.attrib["ID"],
            "source_grade": problem.attrib.get("Grade"),
            "source_origin": problem.attrib.get("Source"),
            "source_problem_attributes": dict(problem.attrib),
            "source_type_original": original_type,
            "source_type": ALIASES.get(original_type, original_type),
            "solution_type_attributes": dict(solution.attrib),
            "body": problem.findtext("Body", ""),
            "question": problem.findtext("Question", ""),
            "answer": problem.findtext("Answer", ""),
            "formula": problem.findtext("Formula", ""),
            "source_file": "dataset/ASDiv.xml",
        })
    for source in json.loads((source_root / "svamp/SVAMP.json").read_text(encoding="utf-8")):
        original_type = source.get("Type", "")
        records.append({
            "bank": "svamp", "source_id": source["ID"],
            "source_type_original": original_type,
            "source_type": ALIASES.get(original_type, original_type),
            "body": source.get("Body", ""), "question": source.get("Question", ""),
            "answer": source.get("Answer"), "equation": source.get("Equation", ""),
            "source_file": "SVAMP.json",
        })
    for split in ("train", "test"):
        source_file = f"grade_school_math/data/{split}.jsonl"
        path = source_root / "gsm8k" / source_file
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            source = json.loads(line)
            records.append({
                "bank": "gsm8k", "source_id": f"{split}-{line_number:04d}",
                "source_type": "multi-step-word-problem", "source_split": split,
                "source_line": line_number, "source_file": source_file,
                "question": source["question"], "answer": source["answer"],
                "source_line_sha256": digest(line),
            })
    for row in records:
        row["source_snapshot"] = source_map[row["bank"]]["commit"]
        row["source_question_sha256"] = digest(row.get("body", "") + "\n" + row["question"])
        row["source_record_sha256"] = digest(row)
    return records


def numeric_domain(row):
    text = f"{row.get('body', '')} {row['question']}".lower()
    if "%" in text or re.search(r"\bpercent(?:age)?\b", text):
        return "percent"
    if re.search(r"\d+\s*/\s*\d+|\b(?:half|halves|one.third|two.thirds|three.quarters)\b", text):
        return "fraction"
    if re.search(r"(?<!\w)\d+\.\d*[1-9]\d*\b", text):
        return "decimal"
    return "integer"


def normalize_classification(row, result, taxonomy):
    protected = {k: v for k, v in row.items() if k.startswith("source_") or k == "bank"}
    row.update(result)
    row.update(protected)
    category = row.get("category", "REVIEW")
    if category not in taxonomy[row["bank"]]:
        raise ValueError(f"Unknown category {category}: {item_key(row)}")
    if row.get("level") not in taxonomy["levels"]:
        raise ValueError(f"Unknown level: {item_key(row)}")
    row["category_label"] = taxonomy[row["bank"]][category]
    row["level_label"] = taxonomy["levels"][row["level"]]["label"]
    row["recommended_grade"] = None
    row.setdefault("classification_status", "auto_provisional")
    row.setdefault("classification_basis", "自动规则推定，须对照题意复核。")
    row["knowledge_tags"] = sorted(set(row.get("knowledge_tags", [])))
    row["reasoning_tags"] = sorted(set(row.get("reasoning_tags", [])))
    original_flags = sorted(set(row.get("quality_flags", [])))
    row["diagnostic_flags"] = [flag for flag in original_flags if not re.fullmatch(r"Q0[1-9]", flag)]
    row["quality_flags"] = sorted({
        DIAGNOSTIC_CODES.get(flag, flag) for flag in original_flags
        if flag in DIAGNOSTIC_CODES or re.fullmatch(r"Q0[1-9]", flag)
    })
    severity = dict(row.get("flag_severity", {}))
    notes = list(row.get("quality_notes", []))
    severity_order = {"adaptation": 0, "suspected": 1, "confirmed": 2}
    for evidence in row.get("quality_evidence", []):
        flag = evidence.get("flag", "")
        code = DIAGNOSTIC_CODES.get(flag, flag if re.fullmatch(r"Q0[1-9]", flag) else None)
        if code:
            certainty = evidence.get("certainty", "suspected")
            if severity_order.get(certainty, 0) >= severity_order.get(severity.get(code), -1):
                severity[code] = certainty
            if evidence.get("reason"):
                notes.append(evidence["reason"])
    row["flag_severity"] = severity
    row["quality_notes"] = list(dict.fromkeys(notes))
    row["numeric_domain"] = numeric_domain(row)
    row["source_lineage_id"] = "unknown"
    hint = row.pop("disposition_hint", "keep")
    if hint not in DECISIONS:
        raise ValueError(f"Unknown disposition {hint}: {item_key(row)}")
    # Unit localization is shared by all three banks.  A correct English-unit
    # question still needs a complete metric adaptation under the agreed plan.
    source_text = (row.get("body", "") + " " + row["question"]).lower()
    imperial_units = sorted(set(re.findall(
        r"\b(?:inches|feet|miles|yards|gallons?|quarts?|pints?|ounces?|lbs?|pounds?)\b",
        source_text,
    )))
    imperial_units += sorted(set(re.findall(
        r"\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter)"
        r"(?:\s+|\s*-\s*)(inch|foot|mile|yard)\b", source_text
    )))
    imperial_units += sorted(set(re.findall(
        r"\bper\s+(?:square\s+|cubic\s+)?(inch|foot|mile|yard)\b", source_text
    )))
    row["localization_flags"] = ["imperial_units_require_conversion"] if imperial_units else []
    if imperial_units:
        row["source_imperial_unit_tokens"] = sorted(set(imperial_units))
        row["quality_flags"] = sorted(set(row["quality_flags"]) | {"Q07"})
        row["flag_severity"].setdefault("Q07", "adaptation")
        row["quality_notes"] = list(dict.fromkeys(row["quality_notes"] + [
            "题面使用英制单位；按本期公制题库要求，中文化时需同步换算数值、关系和答案，并重新核算。"
        ]))
        if hint == "keep":
            hint = "adapt"
    if row["level"] == "extension" or category in {"EXT", "REVIEW"}:
        if hint in {"keep", "adapt"}:
            hint = "hold"
    row["decision"] = hint
    row["publication_state"] = "candidate"
    row["publish_allowed"] = False
    row["human_approved"] = False
    row["tier"] = (
        "review" if row["level"] == "extension"
        else "reinforce" if row["level"].startswith("C") else "advanced"
    )
    row.setdefault("review_status", "content_reviewed_by_assistant" if row.get("assistant_reviewed") else "rule_screened")
    if row.get("assistant_reviewed"):
        row["classification_status"] = "assistant_reviewed_exception"
    return row


def learning_cell(row):
    """A coverage stratum, not a claim that its questions are duplicates."""
    return (
        row["bank"], row["category"], row.get("quantity_category", ""),
        row.get("subcategory", ""), row["level"], row["numeric_domain"],
        tuple(row.get("reasoning_tags", [])),
    )


def candidate_rank(row):
    severity = row.get("flag_severity", {})
    concerns = sum(value in {"confirmed", "suspected"} for value in severity.values())
    return (
        {"keep": 0, "adapt": 1, "hold": 2, "reject": 3}[row["decision"]],
        concerns, len(row.get("quality_flags", [])),
        BANK_ORDER[row["bank"]], digest(item_key(row)),
    )


def select_representatives(records, policy):
    by_key = {item_key(row): row for row in records}
    exact_groups = defaultdict(list)
    for row in records:
        text = re.sub(r"\s+", " ", row.get("body", "") + " " + row["question"]).strip().casefold()
        pool = "gsm8k" if row["bank"] == "gsm8k" else "foundation"
        exact_groups[(pool, text)].append(row)
    for group in exact_groups.values():
        if len(group) < 2:
            continue
        if len({str(row["answer"]).strip().casefold() for row in group}) > 1:
            for row in group:
                row["decision"] = "hold"
                row["quality_flags"] = sorted(set(row.get("quality_flags", [])) | {"Q03"})
                row.setdefault("flag_severity", {})["Q03"] = "confirmed"
                row.setdefault("selection_reasons", []).append("exact_text_answer_conflict")
            continue
        primary = min(group, key=candidate_rank)
        for row in group:
            if row is primary:
                continue
            row["decision"] = "reject"
            row["duplicate_of"] = item_key(primary)
            row.setdefault("selection_reasons", []).append("exact_duplicate")
    groups_per_cell = defaultdict(set)
    family_counts = Counter()
    family_targets = Counter()
    selected = []
    ordered = sorted(records, key=lambda r: (
        BANK_ORDER[r["bank"]],
        1 if r["bank"] == "svamp" and r["category"] == "V00" else 0,
        candidate_rank(r),
    ))
    for row in ordered:
        cell = learning_cell(row)
        row["coverage_cell_id"] = "cell-" + digest(cell)[:16]
        row["relation_family_id"] = "relation-" + digest(cell[1:])[:16]
        row["relation_family_method"] = "instructional_taxonomy_stratum"
        row.setdefault("selection_reasons", [])
        row["recommended"] = False
        if "exact_duplicate" in row["selection_reasons"]:
            row["selection_role"] = "duplicate"
            continue
        if row["decision"] in {"hold", "reject"}:
            row["selection_role"] = "held" if row["decision"] == "hold" else "rejected"
            continue
        if row["bank"] == "gsm8k" and row["source_split"] not in policy["gsm8k_representative_splits"]:
            row["selection_role"] = "source_test_reserve"
            row["selection_reasons"].append("source_test_split_reserved")
            continue
        pool = "gsm8k" if row["bank"] == "gsm8k" else "foundation"
        story = row.get("story_family_id") or "single-" + digest(item_key(row))[:16]
        family = (pool, story)
        target = (pool, story, row.get("semantic_variant_id", row["coverage_cell_id"]), row["numeric_domain"])
        row["selection_target_id"] = "target-" + digest(target)[:16]
        if family_targets[target] >= policy["maximum_same_story_and_learning_target"]:
            row["selection_role"] = "reserve"
            row["selection_reasons"].append("same_story_same_learning_target")
        elif family_counts[family] >= policy["maximum_questions_per_story_family"]:
            row["selection_role"] = "reserve"
            row["selection_reasons"].append("story_family_limit")
        elif story not in groups_per_cell[cell] and len(groups_per_cell[cell]) >= policy["representative_limit_per_cell"]:
            row["selection_role"] = "reserve"
            row["selection_reasons"].append("coverage_cell_limit")
        else:
            row["recommended"] = True
            row["selection_role"] = (
                "contrast_candidate" if row["bank"] == "svamp" and row["category"] != "V00"
                else "representative"
            )
            row["selection_reasons"].append("representative_coverage")
            groups_per_cell[cell].add(story)
            family_targets[target] += 1
            family_counts[family] += 1
            selected.append(row)
    assert all(row.get("duplicate_of") in by_key for row in records if row.get("duplicate_of"))
    return selected


def ledger_record(row):
    return {key: value for key, value in row.items() if key not in RAW_FIELDS and not key.startswith("_")}


def summarize(records):
    return {
        "total": len(records),
        "decision": dict(sorted(Counter(r["decision"] for r in records).items())),
        "selection_role": dict(sorted(Counter(r["selection_role"] for r in records).items())),
        "level": dict(sorted(Counter(r["level"] for r in records).items())),
        "category": dict(sorted(Counter(r["category"] for r in records).items())),
        "recommended": sum(r["recommended"] for r in records),
        "recommended_by_level": dict(sorted(Counter(r["level"] for r in records if r["recommended"]).items())),
        "recommended_by_decision": dict(sorted(Counter(r["decision"] for r in records if r["recommended"]).items())),
        "quality_flags": dict(sorted(Counter(flag for r in records for flag in r["quality_flags"]).items())),
        "diagnostic_flags": dict(sorted(Counter(flag for r in records for flag in r.get("diagnostic_flags", [])).items())),
        "review_status": dict(sorted(Counter(r.get("review_status", "rule_screened") for r in records).items())),
        "source_type": dict(sorted(Counter(r["source_type"] for r in records).items())),
        "story_families": len({r["story_family_id"] for r in records}),
        "coverage_cells": len({r["coverage_cell_id"] for r in records}),
        "recommended_story_families": len({r["story_family_id"] for r in records if r["recommended"]}),
        "publishable": sum(r["publish_allowed"] for r in records),
    }


def make_coverage(records, taxonomy):
    coverage = []
    for bank in BANK_ORDER:
        for category, label in taxonomy[bank].items():
            rows = [r for r in records if r["bank"] == bank and r["category"] == category]
            coverage.append({
                "bank": bank, "category": category, "label": label,
                "total": len(rows), "recommended": sum(r["recommended"] for r in rows),
                "keep": sum(r["decision"] == "keep" for r in rows),
                "adapt": sum(r["decision"] == "adapt" for r in rows),
                "hold": sum(r["decision"] == "hold" for r in rows),
                "reject": sum(r["decision"] == "reject" for r in rows),
                "levels": dict(sorted(Counter(r["level"] for r in rows).items())),
                "representative_ids": [item_key(r) for r in rows if r["recommended"]],
                "coverage_status": "candidate_coverage" if any(r["recommended"] for r in rows) else "no_recommended_candidate",
            })
    return coverage


def as_json(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def as_jsonl(rows):
    return "".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n" for r in rows)


def coverage_markdown(coverage, summary):
    lines = [
        "# 全量分类与代表题统计", "",
        "此表由锁定原始数据和版本化规则生成。分类为自动推定，推荐为待中文化与复核的代表候选。", "",
        "同一故事家族和同一覆盖单元内的上限用于控制练习密度，不将相同知识点的题目全部认定为重复。", "",
        "| 数据集 | 类别 | 教学分类 | 全量 | 推荐 | 可进入中文化 | 需改编 | 暂缓 | 拒收或精确重复 |",
        "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for cell in coverage:
        lines.append(
            f"| {cell['bank']} | {cell['category']} | {cell['label']} | {cell['total']} | "
            f"{cell['recommended']} | {cell['keep']} | {cell['adapt']} | {cell['hold']} | {cell['reject']} |"
        )
    lines.extend([
        "", "## 计数口径", "",
        "- 全量：每条来源记录只计一次；全部记录都有去留状态，不删除台账。",
        "- 推荐：在有效候选中按教学覆盖和家族上限选出的代表；含需要情境或单位改编的题。",
        "- 可进入中文化、需改编、暂缓、拒收是全量来源记录的互斥状态；推荐是其中的子集。",
        "- SVAMP 的 V 标签表示训练方向候选；零覆盖表示没有可靠证据，不自动补成七类齐全。",
        "- GSM8K 独立统计；test 中的来源题保留分类，但不进入本轮代表清单。",
        "- publish_allowed 全部为 false；本报告不把规则筛查等同于全部题目的语义审核或发布批准。",
        "", "## 默认层级", "",
        "| 数据集 | C1 基础巩固 | C2 综合巩固 | I1 审题提高 | I2 关系提高 | 暂缓或专项扩展 |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ])
    for bank in BANK_ORDER:
        levels = summary[bank]["level"]
        lines.append(f"| {bank} | " + " | ".join(str(levels.get(level, 0)) for level in LEVEL_ORDER) + " |")
    return "\n".join(lines) + "\n"


def build(source_root):
    from asdiv_review import classify as classify_asdiv
    from svamp_review import classify as classify_svamp
    from gsm8k_review import classify as classify_gsm8k
    from deduplicate import annotate

    lock = json.loads((ROOT / "SOURCE_LOCK.json").read_text(encoding="utf-8"))
    policy = json.loads((HERE / "policy.json").read_text(encoding="utf-8"))
    taxonomy = json.loads((HERE / "taxonomy.json").read_text(encoding="utf-8"))
    receipts = verify_sources(source_root, lock)
    records = load_sources(source_root, lock)
    counts = Counter(row["bank"] for row in records)
    if dict(counts) != policy["source_counts"]:
        raise ValueError(f"Source population changed: {dict(counts)}")
    keys = [item_key(row) for row in records]
    if len(set(keys)) != len(keys):
        raise ValueError("Duplicate source identifiers")
    classifiers = {"asdiv": classify_asdiv, "svamp": classify_svamp, "gsm8k": classify_gsm8k}
    records = [normalize_classification(row, classifiers[row["bank"]](row), taxonomy) for row in records]
    deduplication = annotate(records, prefer_key=candidate_rank)
    records = deduplication["records"]
    selected = select_representatives(records, policy)
    records.sort(key=lambda row: (BANK_ORDER[row["bank"]], row["source_id"]))
    selected.sort(key=lambda row: (
        BANK_ORDER[row["bank"]], row["category"], row.get("subcategory", ""),
        LEVEL_ORDER[row["level"]], row["source_id"],
    ))
    summaries = {bank: summarize([r for r in records if r["bank"] == bank]) for bank in BANK_ORDER}
    summaries["foundation"] = summarize([r for r in records if r["bank"] != "gsm8k"])
    coverage = make_coverage(records, taxonomy)
    report = {
        "schema_version": policy["schema_version"],
        "audit_date": policy["audit_date"],
        "baseline_commit": policy["baseline_commit"],
        "source_verification": receipts,
        "population": len(records), "policy": policy,
        "banks": summaries,
        "deduplication": deduplication["summary"],
        "limits": [
            "全量规则筛查与自动分类已执行；未声称全库经人工或教师逐题审核。",
            "明确复核案例与自动疑点分开记录；不把二者合并为原库错题率。",
            "文本推定故事家族不等于有证据的题源血缘，也不等于全部语义近重复。",
            "覆盖单元是组织练习的分层，不是独立数学母题数。",
            "原始英文、中文改编、逐题讲解和儿童端发布不在本次分类台账内。",
            "原来源test不是项目独立考核集；将来划分练习和考核须按assessment_group_id隔离。",
        ],
    }
    files = {}
    for bank in BANK_ORDER:
        files[f"{bank}_selection.jsonl"] = as_jsonl(ledger_record(r) for r in records if r["bank"] == bank)
    files["foundation_representatives.jsonl"] = as_jsonl(
        ledger_record(r) for r in selected if r["bank"] != "gsm8k"
    )
    files["gsm8k_representatives.jsonl"] = as_jsonl(
        ledger_record(r) for r in selected if r["bank"] == "gsm8k"
    )
    files["duplicate_groups.jsonl"] = as_jsonl(deduplication["groups"])
    files["coverage.json"] = as_json(coverage)
    files["coverage.md"] = coverage_markdown(coverage, summaries)
    files["selection_report.json"] = as_json(report)
    files["quality_findings.jsonl"] = as_jsonl(
        ledger_record(r) for r in records if r["quality_flags"]
    )
    return files, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "curated")
    parser.add_argument("--check", action="store_true", help="Verify generated files without writing.")
    args = parser.parse_args()
    files, report = build(args.source_root)
    if args.check:
        failures = [
            name for name, contents in files.items()
            if not (args.output / name).is_file()
            or (args.output / name).read_text(encoding="utf-8") != contents
        ]
        if failures:
            raise SystemExit("Generated output differs: " + ", ".join(failures))
        print("All generated classification and selection files match the locked sources.")
    else:
        args.output.mkdir(parents=True, exist_ok=True)
        for name, contents in files.items():
            (args.output / name).write_text(contents, encoding="utf-8")
        print(json.dumps({
            "population": report["population"],
            "banks": {bank: {k: v for k, v in value.items() if k in {"total", "decision", "selection_role", "recommended"}}
                      for bank, value in report["banks"].items()},
        }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
