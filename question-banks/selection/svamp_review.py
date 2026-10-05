"""Reproducible SVAMP teaching classification and conservative quality screening.

Classification describes a *candidate teaching use* of one record.  In particular,
V01--V07 do not prove that the author performed that edit to a known ASDiv parent.
No original parent IDs are invented.  Confirmed case findings are kept separately
from general rules in svamp_overrides.json; these are assistant case reviews, not
claims of human review or a guarantee that every unflagged record is correct.
"""

from __future__ import annotations

import ast
from collections import Counter
from functools import lru_cache
import hashlib
import json
import math
from pathlib import Path
import re


VARIATION_NAMES = {
    "V00": "直接关系基线（未证实变式操作）",
    "V01": "未知量位置辨析候选",
    "V02": "比较对象与方向辨析候选",
    "V03": "所问范围辨析候选",
    "V04": "叙述顺序变式（需要配对证据）",
    "V05": "无关信息辨析候选",
    "V06": "有效条件增减变式（需要配对证据）",
    "V07": "两步关系目标辨析候选",
}
QUANTITY_NAMES = {
    "A01": "总量与部分",
    "A02": "初始量、变化量与最终量",
    "A03": "加法比较",
    "A04": "等量分组",
    "A05": "倍数关系",
    "A06": "两步混合关系",
    "A07": "单价、数量、总价与找零",
    "A10": "分数部分与整体",
    "A14": "长方形或正方形的周长与面积",
    "REVIEW": "需补充分类",
}
_NUMBER_RE = re.compile(r"(?<![\w.])\d+(?:\.\d+)?(?!\w|\.\d)")
_ITEM_RE = re.compile(
    r"\b(\d+(?:\.\d+)?)\s+(bottle caps|wrappers|roses|orchids|cakes|pastries|"
    r"sweet cookies|salty cookies|cookies|baseball cards|ace cards|books|pens|apps|"
    r"files|crayons|erasers|tomatoes|potatoes|blocks|crunches|push-ups|peaches)\b"
)
_COMPARE_RE = re.compile(
    r"\b(?:how (?:many|much) (?:more|fewer|less)|how much (?:longer|farther|deeper|"
    r"taller|shorter)|difference|than (?:those|he|she|his|her|they))\b"
)
_INVERSE_RE = re.compile(
    r"\b(?:initially|at (?:first|the start|the beginning)|to begin with|before|"
    r"had he eaten at the start|did .* (?:lose|delete|remove|spend|give|add|cut|find)|"
    r"got off|have to buy|need to (?:buy|add)|still (?:have to|need to))\b"
)
_SCOPE_RE = re.compile(
    r"\b(?:morning|afternoon|evening|yesterday|today|last night|monday|tuesday|"
    r"wednesday|first chapter|second chapter|each chapter|each basket|each block|"
    r"at the park|arkansas game|texas tech game|saltwater|freshwater)\b"
)


def _numbers(text):
    return [float(m.group()) for m in _NUMBER_RE.finditer(text)]


def _template(text):
    text = str(text or "").lower().replace("’", "'")
    text = _NUMBER_RE.sub(" <n> ", text)
    return " ".join(re.findall(r"<n>|[a-z]+(?:'[a-z]+)?", text))


def _hash(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:20]


def _equation_tree(equation):
    """Parse only arithmetic; never evaluate source text as Python code."""
    tree = ast.parse(str(equation).strip(), mode="eval").body

    def visit(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return float(node.value), 0, [float(node.value)], []
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
            value, count, literals, negatives = visit(node.operand)
            return (-value if isinstance(node.op, ast.USub) else value), count, literals, negatives
        if not isinstance(node, ast.BinOp) or not isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)):
            raise ValueError("unsupported arithmetic expression")
        a, ca, la, na = visit(node.left)
        b, cb, lb, nb = visit(node.right)
        if isinstance(node.op, ast.Add):
            value = a + b
        elif isinstance(node.op, ast.Sub):
            value = a - b
        elif isinstance(node.op, ast.Mult):
            value = a * b
        else:
            value = a / b
        negatives = na + nb
        if value < 0:
            negatives.append(value)
        return value, ca + cb + 1, la + lb, negatives

    return tree, visit(tree)


def _operand_pattern(tree, text_numbers):
    """Keep operand roles in text order; equal literals remain explicitly ambiguous."""
    def visit(node):
        if isinstance(node, ast.Constant):
            indices = [f"n{i}" for i, value in enumerate(text_numbers) if value == float(node.value)]
            return indices[0] if len(indices) == 1 else "{" + "|".join(indices) + "}" if indices else "unbound"
        if isinstance(node, ast.UnaryOp):
            return "(" + ("-" if isinstance(node.op, ast.USub) else "+") + visit(node.operand) + ")"
        symbol = {ast.Add: "+", ast.Sub: "-", ast.Mult: "*", ast.Div: "/"}[type(node.op)]
        return "(" + visit(node.left) + symbol + visit(node.right) + ")"

    return visit(tree)


@lru_cache(maxsize=1)
def _overrides():
    path = Path(__file__).with_name("svamp_overrides.json")
    if not path.exists():
        return {}
    value = json.loads(path.read_text(encoding="utf-8"))
    return value.get("cases", value)


def _inventory(text):
    return {name: float(number) for number, name in _ITEM_RE.findall(text)}


def _quality_rules(body, question, equation, answer):
    """Return (flag, confirmation, note, disposition) findings.

    Pattern-based semantic checks are deliberately hold/suspected.  Exact source
    cases can promote these findings to reject/confirmed through the override file.
    Numeric answer/equation disagreement can be confirmed directly by calculation.
    """
    findings = []

    def suspected(note, flag="Q02"):
        findings.append((flag, "suspected", note, "hold"))

    def adaptation(note):
        findings.append(("Q07", "adaptation", note, "adapt"))

    try:
        _, (value, _, literals, negatives) = _equation_tree(equation)
        if not math.isclose(value, float(answer), rel_tol=1e-9, abs_tol=1e-9):
            findings.append(("Q03", "confirmed", f"原算式算得 {value:g}，原答案标为 {float(answer):g}。", "reject"))
        # An algebraically rearranged expression can have a negative intermediate
        # while the story has valid stocks throughout (e.g. chal-588).  Only the
        # final negative quantity is a generic signal; story contradictions need
        # a relation-specific check or an individually reviewed source case.
        if value < 0:
            suspected("原算式的最终结果为负；需核对所求数量是否允许负值。")
        absent = sorted(set(literals) - set(_numbers(body + " " + question)))
        words = {"one": 1, "two": 2, "twice": 2, "double": 2, "three": 3, "triple": 3, "half": 2}
        absent = [x for x in absent if x not in {v for word, v in words.items() if re.search(r"\b" + word + r"\b", body + " " + question)}]
        if absent:
            suspected("原算式使用题干和问题未明确给出的数值：" + ", ".join(f"{x:g}" for x in absent) + "；需要核对推导依据。", "Q01")
    except (SyntaxError, ValueError, TypeError, ZeroDivisionError, OverflowError):
        findings.append(("Q09", "suspected", "无法用受限四则运算解析器复核原算式或原答案。", "hold"))

    def compare_states(before, after, increasing, label):
        a, b = _inventory(before), _inventory(after)
        for item in sorted(a.keys() & b.keys()):
            if (increasing and b[item] < a[item]) or (not increasing and b[item] > a[item]):
                suspected(f"{label}：{item} 从 {a[item]:g} 变为 {b[item]:g}，与叙述的增减方向冲突。")

    if "danny" in body and "he found " in body and "now he has " in body and not re.search(r"threw|lost|gave|removed", body):
        found, final = body.split("he found ", 1)[1].split("now he has ", 1)
        compare_states(found, final, True, "捡到量大于当前总量，隐含初始量为负")
    if re.search(r"after (?:deleting|selling)", body):
        parts = re.split(r"after (?:deleting|selling)", body, maxsplit=1)
        if len(parts) == 2 and not re.search(r"bought|added|new", parts[1]):
            compare_states(parts[0], parts[1], False, "删除或出售后的数量异常")
    if "nell" in body and "she had " in body and "now has " in body and "gave" in body:
        before, after = body.split("now has ", 1)
        # "415 baseball cards and Ace cards" is one combined total, not 415
        # baseball cards.  That is the missing-condition case chal-50.
        if not re.search(r"\d+ (?:baseball cards|ace cards) and (?:baseball cards|ace cards)", after):
            compare_states(before, after, False, "赠出后的数量异常")
    if "roses and orchids" in body and "cut some more" in body and "there are now" in body:
        before, after = body.split("jessica", 1)[0], body.split("there are now", 1)[1]
        compare_states(before, after, True, "往花瓶添花后的数量异常")
    if "baker made" in body and "sold" in body and not re.search(r"bought|then he made|some cakes", body):
        made, sold = body.split("sold", 1)
        compare_states(made, sold, False, "售出数量大于制作数量")

    if "paco had" in body and not re.search(r"bought|some cookies", body):
        clauses = body.split(".", 1)
        if len(clauses) == 2:
            stocks = _inventory(clauses[0])
            consumed = Counter()
            if re.search(r"ate|gave", clauses[1]):
                for number, item in _ITEM_RE.findall(clauses[1]):
                    if "cookies" in item:
                        consumed[item] += float(number)
                for item, amount in consumed.items():
                    if item in stocks and amount > stocks[item]:
                        suspected(f"{item} 原有 {stocks[item]:g}，吃掉与送出的数量合计 {amount:g}，超过库存。")
    m = re.search(r"randy has (\d+) blocks.*?he uses (\d+) blocks.*?(\d+) blocks", body)
    if m and int(m[2]) + int(m[3]) > int(m[1]):
        suspected(f"积木原有 {m[1]} 块，两处用量 {m[2]}+{m[3]} 超过总量。")
    m = re.search(r"a farmer had (\d+) tomatoes.*?picked (\d+) of them yesterday and (\d+) today", body)
    if m and int(m[2]) + int(m[3]) > int(m[1]):
        suspected(f"番茄原有 {m[1]} 个，两次采摘 {m[2]}+{m[3]} 超过总量。")
    m = re.search(r"a waiter had (\d+) customers\. after .*?left he still had (\d+) customers", body)
    if m and int(m[2]) > int(m[1]):
        suspected(f"原有 {m[1]} 位顾客，离开一些后反而有 {m[2]} 位。")

    if "crazy silly school" in body:
        available = {item: int(num) for num, item in re.findall(r"(\d+) different (books|movies)", body)}
        consumed = {item: int(num) for num, item in re.findall(r"(\d+) of the (books|movies)", body)}
        for item in available.keys() & consumed.keys():
            if consumed[item] > available[item]:
                suspected(f"系列共有 {available[item]} 部/本 {item}，却称已读/看其中 {consumed[item]} 部/本。")
        if re.search(r"read \d+ of the movies|watched \d+ of the books", body):
            adaptation("书与电影的阅读/观看动词错置，中文改编时需明确对象。")

    if "every day ryan" in body or "ryan spends" in body:
        hours = [int(n) for n in re.findall(r"(\d+) hours? on learning", body)]
        if sum(hours) > 24:
            suspected(f"题述每天分别学习的时长合计 {sum(hours)} 小时，超过一天。")
    if "dean" in body or "ron" in body:
        for match in re.finditer(r"stands? at (\d+) feet", body):
            if int(match[1]) > 8:
                adaptation(f"人物身高写为 {match[1]} 英尺；数量关系可用，但人物尺度应改编。")
    if "recipe calls for" in body and "cups of salt" in body:
        adaptation("蛋糕配方以多杯盐作为干扰量，宜改为合理配料或其他材料情境。")
    if "harvest" in body:
        for weeks in re.findall(r"(\d+) weeks", body):
            if int(weeks) > 52:
                adaptation(f"单次收获期写为 {weeks} 周，宜调整时间数值或工作情境。")
    if "jogging" in body:
        changes = re.findall(r"lost (\d+) kilograms", body)
        if any(int(number) > 20 for number in changes):
            adaptation("通过慢跑大幅减重的数值不宜直接用于儿童练习，建议改为货物质量变化等情境。")
    if "debby" in body and re.search(r"drank|drinks", body) and "a day" in body:
        amounts = re.findall(r"(?:drank|drinks) (\d+) (?:water |soda )?bottles", body)
        if any(int(number) > 12 for number in amounts):
            adaptation("个人每天饮用瓶数偏离日常情境，宜改为商店售出量或集体消耗量。")
    return findings


def classify(record):
    """Classify a normalized record containing source_id/body/question/answer/equation.

    The returned primary V category is an instructional candidate; the independent
    quantity_category captures the mathematical relationship.  V04 and V06 are not
    assigned from a single record, since edit direction needs a validated pair.
    """
    source_id = record.get("source_id", record.get("ID", ""))
    body_original = str(record.get("body", record.get("Body", "")) or "")
    question_original = str(record.get("question", record.get("Question", "")) or "")
    body, question = body_original.lower(), question_original.lower()
    text = body + " " + question
    equation = record.get("equation", record.get("Equation", ""))
    answer = record.get("answer", record.get("Answer"))
    source_type = str(record.get("source_type", record.get("Type", "")))
    source_type = {"Substraction": "Subtraction", "Common-Divison": "Common-Division"}.get(source_type, source_type)
    text_numbers = _numbers(text)
    try:
        tree, (value, operation_count, literals, _) = _equation_tree(equation)
        operand_pattern = _operand_pattern(tree, text_numbers)
    except (SyntaxError, ValueError, TypeError, ZeroDivisionError, OverflowError):
        value, operation_count, literals, operand_pattern = None, 0, [], "unparsed"
    # A chapter count can establish that the listed parts cover a whole book
    # without appearing as an arithmetic operand.  It is not a distractor in a
    # whole/part chapter question; retain it as a structural condition.
    structural_positions = set()
    if re.search(r"\b(?:first|second|third) chapter\b|\bbook have\b|\bbook.*altogether\b", question):
        matches = list(_NUMBER_RE.finditer(text))
        for index, match in enumerate(matches):
            if re.match(r"\s+chapters?\b", text[match.end():]) and re.search(r"\bbook (?:has|had)\s*$", text[max(0, match.start() - 20):match.start()]):
                structural_positions.add(index)
    unused_positions = [i for i, number in enumerate(text_numbers) if number not in set(literals) and i not in structural_positions]
    surplus_numeric_roles = max(0, len(text_numbers) - len(structural_positions) - len(literals))
    has_unused_candidate = bool(unused_positions or surplus_numeric_roles)
    compare = bool(_COMPARE_RE.search(question))
    inverse = bool(_INVERSE_RE.search(question)) or (
        bool(re.search(r"cost\??$", question.strip())) and "left" in body and "after" in body
    )
    scope = bool(_SCOPE_RE.search(question)) or bool(has_unused_candidate and re.search(
        r"\b(?:red|green|yellow|salty|sweet|roses|orchids|emails|letters|crayons|erasers|"
        r"books|pens|apps|files|push-ups|crunches|cakes|pastries|bacon|potatoes|tomatoes)\b", question))
    money = bool(re.search(r"\$|\bdollars?\b|\bcost\b|\bprice\b|\brent\b", text))
    proportional = bool(re.search(r"\btimes\b|\btwice\b|\bdouble\b", body))
    relational_body = bool(re.search(r"\b(?:more|fewer|less|lesser|longer|shorter|taller|farther)\b.*?\bthan\b", body))
    indirect_comparison = relational_body and not compare and not proportional
    area_context = bool(re.search(r"\bcarpet\b|\bsquare feet\b", text))
    # Ordinal chapter names ("third chapter") do not imply fraction knowledge.
    fractions = bool(re.search(r"\bfraction\b|\bhalf (?:of|the|a)\b|\b(?:one|a|two|three) (?:thirds?|quarters?)\b", text))
    temporal = bool(re.search(r"\b(?:left|initially|at first|at the start|now|lost|gave|"
                              r"ate|bought|sold|grew|died|added|removed|deleted)\b", text))
    two_step_target_candidate = operation_count >= 2 and (
        inverse or indirect_comparison or compare or (scope and has_unused_candidate)
    )

    if fractions:
        quantity = "A10"
    elif area_context:
        quantity = "A14"
    elif money:
        quantity = "A07"
    elif proportional:
        quantity = "A05"
    elif operation_count >= 2:
        quantity = "A06"
    elif source_type in ("Multiplication", "Common-Division"):
        quantity = "A04"
    elif compare or re.search(r"\b(?:more|fewer|less)\b.*?\bthan\b", body):
        quantity = "A03"
    elif temporal:
        quantity = "A02"
    else:
        quantity = "A01"

    candidates = []
    if inverse or indirect_comparison:
        candidates.append("V01")
    if compare:
        candidates.append("V02")
    if scope and has_unused_candidate:
        candidates.append("V03")
    if has_unused_candidate:
        candidates.append("V05")
    if two_step_target_candidate:
        candidates.append("V07")
    if two_step_target_candidate:
        category = "V07"
    elif compare:
        category = "V02"
    elif inverse or indirect_comparison:
        category = "V01"
    elif scope and has_unused_candidate:
        category = "V03"
    elif has_unused_candidate:
        category = "V05"
    else:
        category = "V00"
    reading_demand = inverse or indirect_comparison or has_unused_candidate or (relational_body and temporal)
    if operation_count >= 3:
        level, level_basis = "I2", "需要组织多步关系。"
    elif operation_count >= 2 and (inverse or compare or relational_body):
        level, level_basis = "I2", "两步关系叠加反求或比较基准，需要处理中间量与目标的关系。"
    elif operation_count >= 2 and has_unused_candidate:
        level, level_basis = "I1", "熟悉计算组合中还需筛选所问对象或范围。"
    elif operation_count >= 2:
        level, level_basis = "C2", "熟悉数量关系的直接两步组合，未仅凭步数判为提高。"
    elif reading_demand:
        level, level_basis = "I1", "计算至多一步，但含反求、范围筛选或干扰信息辨析。"
    else:
        level, level_basis = "C1", "一个直接数量关系；直接比较两项已知量也保留为基础巩固。"

    knowledge = [QUANTITY_NAMES[quantity]]
    if money and quantity != "A07":
        knowledge.append(QUANTITY_NAMES["A07"])
    if proportional and quantity != "A05":
        knowledge.append(QUANTITY_NAMES["A05"])
    if re.search(r"feet|pounds|inches|kilograms|grams|square", text):
        knowledge.append("单位与度量")
    if re.search(r"\bper (?:day|minute|week)|\ba (?:day|minute|week)|each (?:day|week)", text):
        knowledge.append("单位时间与总量")
    if "carpet" in text or "square feet" in text:
        knowledge.append("长方形面积")
    if operation_count > 0 and source_type in ("Multiplication", "Common-Division"):
        knowledge.append("乘除互逆")
    elif operation_count == 0:
        knowledge.append("识别题干已给出的所求量")
    reasoning = []
    if inverse or indirect_comparison:
        reasoning.append("确定未知量位置")
    if compare:
        reasoning.append("辨认比较对象与方向")
    if has_unused_candidate:
        reasoning.append("筛选与所问目标相关的信息")
    if scope:
        reasoning.append("区分对象、阶段或所问范围")
    if operation_count >= 2:
        reasoning.append("组织两步数量关系" if operation_count == 2 else "组织多步数量关系")
    if not reasoning:
        reasoning.append("由题意建立直接数量关系")
    if operation_count == 0:
        reasoning.append("判断是否确实需要计算")

    basis = [
        "由单题题干、所问目标与原算式自动推定教学用途；V 标签不证明原作者确实做过对应变式操作。",
        f"原算式含 {operation_count} 个二元四则运算；主数量关系候选为 {QUANTITY_NAMES[quantity]}。",
        "层级依据：" + level_basis + "计算数值大小不等同于数量关系难度。",
    ]
    if unused_positions:
        basis.append("有数值未直接出现在原算式中，作为无关信息/范围辨析候选；同值数的角色仍可能有歧义。")
    elif surplus_numeric_roles:
        basis.append("题面数值角色多于原算式所用项数，但有数值相同，只标存在额外信息的候选，不猜定具体被忽略的数值角色。")
    if category == "V00":
        basis.append("未获得足够单题证据指向 V01–V07，保留为直接关系基线。")
    if operation_count >= 2 and not two_step_target_candidate:
        basis.append("两步算式本身不构成目标迁移证据，因此未仅凭两步赋予 V07。")
    if structural_positions:
        basis.append("书的章节数用于说明部分覆盖整体，作为结构条件保留，不因未出现在算式中而当作无关信息。")
    if source_type == "Common-Division":
        basis.append("保留等分、包含除法等量纲差异，不用同为除法认定重复。")
    if operation_count == 0:
        basis.append("原算式为单个已知数，本题可用于无需计算的取数辨析；不按源 Common-Division 标签强加除法。")

    findings = _quality_rules(body, question, equation, answer)
    override = _overrides().get(source_id)
    if override:
        for flag in override.get("flags", []):
            findings.append((flag, override.get("confirmation", "confirmed"), override["reason"], override.get("disposition", "reject")))
    severity_order = {"adaptation": 0, "suspected": 1, "confirmed": 2}
    severities = {}
    for flag, severity, _, _ in findings:
        if flag not in severities or severity_order[severity] > severity_order[severities[flag]]:
            severities[flag] = severity
    dispositions = {disposition for _, _, _, disposition in findings}
    disposition = next((d for d in ("reject", "hold", "adapt") if d in dispositions), "keep")
    quality_notes = list(dict.fromkeys(note for _, _, note, _ in findings))

    result = {
        "category": category,
        "subcategory": QUANTITY_NAMES[quantity] + "：" + VARIATION_NAMES[category],
        "quantity_category": quantity,
        "variation_tags": candidates or ["V00"],
        "variation_evidence": "single_record_instructional_candidate",
        "level": level,
        "knowledge_tags": list(dict.fromkeys(knowledge)),
        "reasoning_tags": reasoning,
        "quality_flags": sorted(severities),
        "flag_severity": severities,
        "quality_notes": quality_notes,
        "disposition_hint": disposition,
        "review_status": "assistant_reviewed_case" if override else "rule_screened",
        "classification_basis": basis,
        "operation_count": operation_count,
        "calculation_required": operation_count > 0,
        "equation_operand_pattern": operand_pattern,
        "unused_number_positions": unused_positions,
        "structural_number_positions": sorted(structural_positions),
        "surplus_numeric_role_count": surplus_numeric_roles,
        "arithmetic_load": "large_numbers" if max(text_numbers + ([abs(value)] if value is not None else []) + [0]) >= 10000 else "ordinary_numbers",
        "family_key": "svamp-body-" + _hash(_template(body_original)),
        "variation_key": "svamp-variant-" + _hash(_template(body_original + " " + question_original)),
        "parent_asdiv_ids": [],
        "parent_link_status": "unknown",
    }
    if override and override.get("expected_answer") is not None:
        result["review_expected_answer"] = override["expected_answer"]
    return result
