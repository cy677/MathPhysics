#!/usr/bin/env python3
"""Independently reconcile the selection ledger without importing build.py.

This checks recorded populations, provenance, classification schemas, selection
caps and accounting.  It does not claim to validate every story's meaning.
Only the optional --source-root check reads source questions; none are emitted.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET


BANKS = ("asdiv", "svamp", "gsm8k")
QUESTION_BANKS = Path(__file__).resolve().parents[1]
RAW_FIELDS = {"body", "question", "answer", "formula", "equation", "_source_record"}


def json_file(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def jsonl_file(path):
    return [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]


def item_key(row):
    return f"{row['bank']}:{row['source_id']}"


def pool(row):
    return "gsm8k" if row["bank"] == "gsm8k" else "foundation"


def input_snapshot(curated_dir=None):
    curated_dir = Path(curated_dir or QUESTION_BANKS / "curated")
    files = {f"{bank}_selection.jsonl": jsonl_file(curated_dir / f"{bank}_selection.jsonl") for bank in BANKS}
    files.update({name: jsonl_file(curated_dir / name) for name in (
        "foundation_representatives.jsonl", "gsm8k_representatives.jsonl", "duplicate_groups.jsonl",
    )})
    return {
        "directory": curated_dir,
        "rows": [row for bank in BANKS for row in files[f"{bank}_selection.jsonl"]],
        "files": files,
        "report": json_file(curated_dir / "selection_report.json"),
        "coverage": json_file(curated_dir / "coverage.json"),
        "taxonomy": json_file(QUESTION_BANKS / "selection/taxonomy.json"),
        "policy": json_file(QUESTION_BANKS / "selection/policy.json"),
        "lock": json_file(QUESTION_BANKS / "SOURCE_LOCK.json"),
    }


def reconcile(snapshot):
    """Return a bounded list of pass/fail checks recomputed from ledger rows."""
    rows, report, policy = snapshot["rows"], snapshot["report"], snapshot["policy"]
    taxonomy, files = snapshot["taxonomy"], snapshot["files"]
    by_key = {item_key(row): row for row in rows}
    recommended = [row for row in rows if row.get("recommended") is True]
    checks = []

    def check(label, observed, expected):
        checks.append({"check": label, "observed": observed, "expected": expected, "passed": observed == expected})

    check("来源记录数", dict(Counter(row["bank"] for row in rows)), policy["source_counts"])
    check("重复来源 ID 数", len(rows) - len(by_key), 0)
    check("全量报告总数", report["population"], len(rows))
    check("报告中的政策快照", report["policy"], policy)
    check("原始题文或答案字段泄漏数", sum(bool(RAW_FIELDS & set(row)) for row in rows), 0)

    invalid_classification = [item_key(row) for row in rows if (
        row.get("category") not in taxonomy[row["bank"]]
        or row.get("level") not in taxonomy["levels"]
        or row.get("category_label") != taxonomy[row["bank"]].get(row.get("category"))
        or row.get("level_label") != taxonomy["levels"].get(row.get("level"), {}).get("label")
        or row.get("recommended_grade") is not None
    )]
    check("分类标签或未授权年级映射异常数", len(invalid_classification), 0)
    check("未定义 Q 码数", sum(flag not in taxonomy["quality_codes"] for row in rows for flag in row["quality_flags"]), 0)
    check("已获发布许可数", sum(row.get("publish_allowed") is not False for row in rows), 0)
    check("已获人工批准数", sum(row.get("human_approved") is not False for row in rows), 0)
    check("推荐中暂缓、拒收或扩展题数", sum(
        row["decision"] not in {"keep", "adapt"} or row["level"] == "extension"
        or row["category"] in {"EXT", "REVIEW"} for row in recommended
    ), 0)
    check("推荐布尔值与推荐角色冲突数", sum(
        row["recommended"] != (row["selection_role"] in {"representative", "contrast_candidate"}) for row in rows
    ), 0)

    for bank_group, filename in (("foundation", "foundation_representatives.jsonl"), ("gsm8k", "gsm8k_representatives.jsonl")):
        target = {item_key(row): row for row in recommended if pool(row) == bank_group}
        copied = {item_key(row): row for row in files[filename]}
        check(f"{bank_group} 代表清单重复 ID 数", len(files[filename]) - len(copied), 0)
        check(f"{bank_group} 代表清单差异数", len(set(target) ^ set(copied)) + sum(
            target[key] != copied[key] for key in target.keys() & copied.keys()
        ), 0)

    source_splits = Counter(row.get("source_split") for row in rows if row["bank"] == "gsm8k")
    check("GSM8K 原始划分保留", dict(source_splits), {"train": 7473, "test": 1319})
    check("代表清单中的 GSM8K test 题数", sum(
        row["bank"] == "gsm8k" and row.get("source_split") not in policy["gsm8k_representative_splits"]
        for row in recommended
    ), 0)

    cell_families = defaultdict(set)
    for row in recommended:
        cell_families[row["coverage_cell_id"]].add(row["story_family_id"])
    families = Counter((pool(row), row["story_family_id"]) for row in recommended)
    targets = Counter((pool(row), row["story_family_id"], row.get("semantic_variant_id", row["coverage_cell_id"]), row["numeric_domain"]) for row in recommended)
    duplicates = Counter((pool(row), row["duplicate_group"]) for row in recommended if row.get("duplicate_group"))
    check("超过覆盖单元家族上限的单元数", sum(len(value) > policy["representative_limit_per_cell"] for value in cell_families.values()), 0)
    check("超过故事家族上限的家族数", sum(value > policy["maximum_questions_per_story_family"] for value in families.values()), 0)
    check("同故事同学习目标超限数", sum(value > policy["maximum_same_story_and_learning_target"] for value in targets.values()), 0)
    check("代表清单中重复模板超限数", sum(value > 1 for value in duplicates.values()), 0)
    check("失效或自指的重复目标数", sum(
        bool(row.get("duplicate_of")) and (row["duplicate_of"] not in by_key or row["duplicate_of"] == item_key(row))
        for row in rows
    ), 0)

    summary_mismatches = []
    for bank in (*BANKS, "foundation"):
        subset = [row for row in rows if row["bank"] == bank or (bank == "foundation" and pool(row) == bank)]
        summary = report["banks"][bank]
        expected = {
            "total": len(subset),
            "recommended": sum(row["recommended"] for row in subset),
            "publishable": sum(row["publish_allowed"] for row in subset),
            "story_families": len({row["story_family_id"] for row in subset}),
            "coverage_cells": len({row["coverage_cell_id"] for row in subset}),
            "recommended_story_families": len({row["story_family_id"] for row in subset if row["recommended"]}),
        }
        expected.update({key: dict(Counter(row[key] for row in subset)) for key in (
            "decision", "selection_role", "level", "category", "source_type",
        )})
        expected["quality_flags"] = dict(Counter(flag for row in subset for flag in row["quality_flags"]))
        expected["recommended_by_level"] = dict(Counter(row["level"] for row in subset if row["recommended"]))
        expected["recommended_by_decision"] = dict(Counter(row["decision"] for row in subset if row["recommended"]))
        summary_mismatches += [f"{bank}.{key}" for key, value in expected.items() if summary.get(key) != value]
    check("分库汇总不一致字段数", len(summary_mismatches), 0)

    coverage_mismatches = []
    for cell in snapshot["coverage"]:
        subset = [row for row in rows if (row["bank"], row["category"]) == (cell["bank"], cell["category"])]
        expected = {"total": len(subset), "recommended": sum(row["recommended"] for row in subset)}
        expected.update({key: sum(row["decision"] == key for row in subset) for key in ("keep", "adapt", "hold", "reject")})
        coverage_mismatches += [f"{cell['bank']}.{cell['category']}.{key}" for key, value in expected.items() if cell.get(key) != value]
    check("分类覆盖统计不一致字段数", len(coverage_mismatches), 0)
    check("分类覆盖合计", sum(cell["total"] for cell in snapshot["coverage"]), len(rows))

    locked_files = {(source["bank"], entry["path"]): entry["sha256"] for source in snapshot["lock"]["sources"] for entry in source["files"]}
    recorded_files = {(entry["bank"], entry["path"]): entry["sha256"] for entry in report["source_verification"] if entry["verified"] is True}
    check("源文件校验回执与锁定记录", recorded_files, locked_files)
    source_commits = {source["bank"]: source["commit"] for source in snapshot["lock"]["sources"]}
    check("来源 commit 不一致记录数", sum(row["source_snapshot"] != source_commits[row["bank"]] for row in rows), 0)

    family_records = defaultdict(set)
    for row in rows:
        family_records[row["assessment_group_id"]].add(item_key(row))
    groups = files["duplicate_groups.jsonl"]
    check("家族记录与逐题台账成员差异数", sum(
        set(group["members"]) != family_records.get(group["id"], set()) for group in groups
    ), 0)
    check("非单题家族记录覆盖", {group["id"] for group in groups}, {key for key, members in family_records.items() if len(members) > 1})
    return checks


def source_checks(snapshot, source_root):
    """Compare original IDs and question hashes without outputting any text."""
    source_root = Path(source_root)
    rows = snapshot["rows"]
    expected = {}
    for element in ET.parse(source_root / "asdiv/dataset/ASDiv.xml").getroot().findall(".//Problem"):
        expected[f"asdiv:{element.attrib['ID']}"] = (element.findtext("Body", ""), element.findtext("Question", ""))
    for row in json_file(source_root / "svamp/SVAMP.json"):
        expected[f"svamp:{row['ID']}"] = (row["Body"], row["Question"])
    for split in ("train", "test"):
        for number, row in enumerate(jsonl_file(source_root / f"gsm8k/grade_school_math/data/{split}.jsonl"), 1):
            expected[f"gsm8k:{split}-{number:04d}"] = ("", row["question"])
    by_key = {item_key(row): row for row in rows}
    mismatches = sum(hashlib.sha256((body + "\n" + question).encode("utf-8")).hexdigest() != by_key[key]["source_question_sha256"]
                     for key, (body, question) in expected.items() if key in by_key)
    checks = [
        {"check": "原始来源 ID 与台账差异数", "observed": len(expected.keys() ^ by_key.keys()), "expected": 0},
        {"check": "逐题来源指纹不一致数", "observed": mismatches, "expected": 0},
    ]
    for source in snapshot["lock"]["sources"]:
        for entry in source["files"]:
            path = source_root / source["bank"] / entry["path"]
            checks.append({"check": f"源字节指纹 {source['bank']}/{entry['path']}",
                           "observed": hashlib.sha256(path.read_bytes()).hexdigest(), "expected": entry["sha256"]})
    for check in checks:
        check["passed"] = check["observed"] == check["expected"]
    return checks


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--curated-dir", type=Path, default=QUESTION_BANKS / "curated")
    parser.add_argument("--source-root", type=Path)
    args = parser.parse_args()
    snapshot = input_snapshot(args.curated_dir)
    checks = reconcile(snapshot)
    if args.source_root:
        checks += source_checks(snapshot, args.source_root)
    failures = [check for check in checks if not check["passed"]]
    for check in checks:
        print(f"{'PASS' if check['passed'] else 'FAIL'} {check['check']}")
    print(f"{len(checks) - len(failures)}/{len(checks)} checks passed; semantic correctness is not established by these checks.")
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
