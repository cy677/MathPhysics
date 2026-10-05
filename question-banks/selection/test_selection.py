"""Regression tests for source integrity, reviewed defects and selection rules."""
import copy
import json
import os
import subprocess
from collections import Counter
from fractions import Fraction
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from build import select_representatives, verify_sources
from gsm8k_review import safe_arithmetic, UnsupportedArithmetic
from deduplicate import annotate

P = HERE.parent / "curated"
POLICY = json.loads((HERE / "policy.json").read_text(encoding="utf-8"))


def rows(name):
    return [json.loads(line) for line in (P / name).read_text(encoding="utf-8").splitlines()]


class LedgerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.banks = {bank: rows(f"{bank}_selection.jsonl") for bank in ("asdiv", "svamp", "gsm8k")}
        cls.records = sum(cls.banks.values(), [])
        cls.by_id = {f"{r['bank']}:{r['source_id']}": r for r in cls.records}
        cls.report = json.loads((P / "selection_report.json").read_text(encoding="utf-8"))

    def test_population_and_identity(self):
        self.assertEqual({bank: len(rs) for bank, rs in self.banks.items()}, POLICY["source_counts"])
        self.assertEqual(len(self.records), len(self.by_id))
        for row in self.records:
            self.assertIn(row["decision"], {"keep", "adapt", "hold", "reject"})
            self.assertIn(row["level"], {"C1", "C2", "I1", "I2", "extension"})
            self.assertEqual(len(row["source_snapshot"]), 40)
            self.assertEqual(len(row["source_question_sha256"]), 64)
            self.assertIsNone(row["recommended_grade"])
            self.assertNotIn("question", row)
            self.assertNotIn("body", row)
            self.assertNotIn("answer", row)

    def test_candidates_are_not_published(self):
        self.assertTrue(all(row["publish_allowed"] is False for row in self.records))
        self.assertTrue(all(row["human_approved"] is False for row in self.records))
        self.assertTrue(all(row["publication_state"] == "candidate" for row in self.records))

    def test_known_source_defects_are_isolated(self):
        cases = {
            "asdiv": ["nluds-0076", "nluds-0171", "nluds-0778", "nluds-1316", "nluds-2038"],
            "svamp": ["chal-35", "chal-37", "chal-50", "chal-55", "chal-56", "chal-161", "chal-680", "chal-897"],
            "gsm8k": ["train-0168", "train-1111", "train-2938", "train-7445"],
        }
        for bank, identifiers in cases.items():
            for identifier in identifiers:
                with self.subTest(bank=bank, source_id=identifier):
                    row = self.by_id[f"{bank}:{identifier}"]
                    self.assertIn(row["decision"], {"hold", "reject"})
                    self.assertFalse(row["recommended"])

    def test_source_operator_is_not_teaching_level(self):
        inverse = self.by_id["asdiv:nluds-0016"]
        self.assertEqual((inverse["category"], inverse["level"]), ("A02", "I1"))
        gsm_inverse = self.by_id["gsm8k:train-0011"]
        self.assertEqual(gsm_inverse["category"], "G03")
        self.assertTrue(gsm_inverse["level"].startswith("I"))

    def test_ordinary_context_words_do_not_create_new_math_topics(self):
        self.assertEqual(
            (self.by_id["asdiv:nluds-1034"]["category"], self.by_id["asdiv:nluds-1034"]["level"]),
            ("A03", "C1"),
        )
        self.assertNotIn(self.by_id["gsm8k:train-2248"]["category"], {"G08", "G10"})
        self.assertEqual(self.by_id["gsm8k:train-0359"]["category"], "G04")
        self.assertEqual(self.by_id["gsm8k:train-0359"]["level"], "C2")

    def test_metric_localization_is_required_consistently(self):
        for identifier in ["train-0201", "train-3434"]:
            row = self.by_id[f"gsm8k:{identifier}"]
            self.assertIn("imperial_units_require_conversion", row["localization_flags"])
            self.assertIn("Q07", row["quality_flags"])
        for row in self.records:
            if row.get("source_imperial_unit_tokens"):
                self.assertIn("Q07", row["quality_flags"])
                self.assertNotEqual(row["decision"], "keep")

    def test_non_numeric_answer_is_not_a_bad_question(self):
        row = self.by_id["asdiv:nluds-0030"]
        self.assertNotEqual(row["decision"], "reject")
        self.assertEqual(row["answer_type"], "object_choice")

    def test_two_operations_are_not_automatically_target_migration(self):
        for identifier in ["chal-142", "chal-179", "chal-588", "chal-611", "chal-626"]:
            with self.subTest(source_id=identifier):
                row = self.by_id[f"svamp:{identifier}"]
                self.assertEqual((row["category"], row["level"]), ("V00", "C2"))
                self.assertIn(row["decision"], {"keep", "adapt"})

    def test_scope_change_is_preserved(self):
        self.assertEqual(self.by_id["svamp:chal-47"]["category"], "V03")
        variants = [self.by_id[f"svamp:{identifier}"] for identifier in ["chal-47", "chal-899", "chal-179"]]
        self.assertEqual(len({row["story_family_id"] for row in variants}), 1)
        self.assertEqual(len({row["semantic_variant_id"] for row in variants}), 3)
        self.assertTrue(all(row["duplicate_type"] == "none" for row in variants))

    def test_unsupported_variation_pairs_not_fabricated(self):
        self.assertFalse(any(r["category"] in {"V04", "V06"} for r in self.banks["svamp"]))
        self.assertTrue(all(r["source_lineage_id"] == "unknown" for r in self.records))
        self.assertTrue(all(r["parent_link_status"] == "unknown" for r in self.banks["svamp"]))

    def test_exact_duplicate_keeps_one_source_record_as_primary(self):
        pair = [self.by_id[f"asdiv:nluds-{number}"] for number in ["0676", "0677"]]
        self.assertEqual(sum(r["selection_role"] == "duplicate" for r in pair), 1)
        self.assertLessEqual(sum(r["recommended"] for r in pair), 1)
        duplicate = next(r for r in pair if r["selection_role"] == "duplicate")
        self.assertIn(duplicate["duplicate_of"], self.by_id)

    def test_recommendation_manifests_match_master_ledger(self):
        manifests = rows("foundation_representatives.jsonl") + rows("gsm8k_representatives.jsonl")
        expected = {key for key, row in self.by_id.items() if row["recommended"]}
        actual = {f"{row['bank']}:{row['source_id']}" for row in manifests}
        self.assertEqual(actual, expected)
        self.assertEqual(len(actual), len(manifests))
        for row in manifests:
            self.assertEqual(row, self.by_id[f"{row['bank']}:{row['source_id']}"])
            self.assertIn(row["decision"], {"keep", "adapt"})
        self.assertTrue(all(r["bank"] != "gsm8k" for r in rows("foundation_representatives.jsonl")))
        self.assertTrue(all(r["bank"] == "gsm8k" for r in rows("gsm8k_representatives.jsonl")))

    def test_representative_limits_and_source_test_reserve(self):
        selected = [r for r in self.records if r["recommended"]]
        cells = {}
        for row in selected:
            cells.setdefault(row["coverage_cell_id"], set()).add(row["story_family_id"])
        self.assertLessEqual(max(map(len, cells.values())), POLICY["representative_limit_per_cell"])
        families = Counter(("gsm8k" if r["bank"] == "gsm8k" else "foundation", r["story_family_id"]) for r in selected)
        self.assertLessEqual(max(families.values()), POLICY["maximum_questions_per_story_family"])
        targets = Counter((
            "gsm8k" if r["bank"] == "gsm8k" else "foundation",
            r["story_family_id"], r["semantic_variant_id"], r["numeric_domain"],
        ) for r in selected)
        self.assertLessEqual(max(targets.values()), POLICY["maximum_same_story_and_learning_target"])
        self.assertFalse(any(r["bank"] == "gsm8k" and r["source_split"] == "test" for r in selected))

    def test_summary_reconciles_to_ledger(self):
        self.assertEqual(self.report["population"], len(self.records))
        for bank, rs in self.banks.items():
            summary = self.report["banks"][bank]
            self.assertEqual(summary["total"], len(rs))
            self.assertEqual(summary["recommended"], sum(r["recommended"] for r in rs))
            self.assertEqual(summary["decision"], dict(Counter(r["decision"] for r in rs)))
            self.assertEqual(summary["level"], dict(Counter(r["level"] for r in rs)))
        self.assertEqual(self.report["banks"]["foundation"]["total"], 3305)

    def test_quality_codes_are_shared(self):
        allowed = {f"Q0{i}" for i in range(1, 10)}
        for row in self.records:
            self.assertTrue(set(row["quality_flags"]) <= allowed)
        self.assertIn("Q03", self.by_id["gsm8k:train-0168"]["quality_flags"])

    def test_all_asdiv_source_attributes_are_retained(self):
        self.assertEqual(sum(bool(row["solution_type_attributes"]) for row in self.banks["asdiv"]), 383)

    def test_group_references_and_cross_split_evidence(self):
        groups = rows("duplicate_groups.jsonl")
        for group in groups:
            self.assertTrue(set(group["members"]) <= self.by_id.keys())
            self.assertFalse(group["lineage_verified"])
        pair = [self.by_id[f"gsm8k:{identifier}"] for identifier in ["train-0021", "test-0633"]]
        self.assertEqual(pair[0]["assessment_group_id"], pair[1]["assessment_group_id"])

    def test_source_checksums_when_sources_available(self):
        source_root = HERE.parents[1] / ".selection-sources"
        if not source_root.exists():
            self.skipTest("Fetch pinned datasets to validate their bytes.")
        lock = json.loads((HERE.parent / "SOURCE_LOCK.json").read_text(encoding="utf-8"))
        receipts = verify_sources(source_root, lock)
        self.assertEqual(len(receipts), 4)
        self.assertTrue(all(r["verified"] for r in receipts))


class AlgorithmSafetyTests(unittest.TestCase):
    def test_quality_evidence_is_stable_across_hash_seeds(self):
        body = (
            "in the crazy silly school series there are 8 different books and 5 different movies. "
            "he read 19 of the movies and watched 16 of the books."
        )
        program = (
            "import json\nfrom svamp_review import _quality_rules\n"
            f"print(json.dumps(_quality_rules({body!r}, 'how many books?', '8', 8), ensure_ascii=False))\n"
        )
        outputs = [subprocess.check_output(
            [sys.executable, "-c", program], cwd=HERE,
            env={**os.environ, "PYTHONHASHSEED": seed}, text=True,
        ) for seed in ["0", "1"]]
        self.assertEqual(outputs[0], outputs[1])
        notes = [finding[2] for finding in json.loads(outputs[0])]
        self.assertTrue(any("8" in note and "books" in note for note in notes))
        self.assertTrue(any("5" in note and "movies" in note for note in notes))

    def test_bounded_arithmetic_and_rejected_code(self):
        self.assertEqual(safe_arithmetic("(3/4 + 1/4) * 12"), Fraction(12))
        self.assertEqual(safe_arithmetic("12.5% * 80"), Fraction(10))
        for expression in ["__import__('os').system('true')", "a + 3", "2 ** 100000", "1 / 0"]:
            with self.subTest(expression=expression):
                with self.assertRaises(UnsupportedArithmetic):
                    safe_arithmetic(expression)

    def test_all_answers_in_a_conflicting_exact_group_are_held(self):
        base = {
            "bank": "asdiv", "source_id": "case-a", "body": "A box has two green blocks.",
            "question": "How many green blocks are in the box?", "answer": "2",
            "category": "A01", "subcategory": "给定总量", "level": "C1",
            "numeric_domain": "integer", "reasoning_tags": [], "quality_flags": [],
            "decision": "keep",
        }
        other = copy.deepcopy(base)
        other.update(source_id="case-b", answer="3")
        records = [base, other]
        self.assertEqual(select_representatives(records, POLICY), [])
        self.assertTrue(all(r["decision"] == "hold" for r in records))

    def test_shared_arithmetic_is_not_duplicate_evidence(self):
        records = [
            {"bank": "asdiv", "source_id": "demo-a", "body": "Three birds land beside four birds.", "question": "How many birds are present?", "answer": "7", "formula": "3+4=7"},
            {"bank": "asdiv", "source_id": "demo-b", "body": "A ribbon is three metres long and is extended by four metres.", "question": "What is its new length?", "answer": "7", "formula": "3+4=7"},
        ]
        result = annotate(records)
        self.assertEqual(len({r["story_family_id"] for r in result["records"]}), 2)
        self.assertTrue(all(r["duplicate_type"] == "none" for r in result["records"]))


if __name__ == "__main__":
    unittest.main()
