"""Source-grounded ASDiv screening and provisional teaching classifications.

This module reads metadata and source text supplied by the caller.  It never
rewrites the upstream question/answer, and it never marks a question published
or human-approved.  Rules classify all records; the small, explicitly identified
override file records additional assistant checks, not a human review of the
whole corpus.  A successful arithmetic check is not a semantic correctness
proof.  Unsupported symbolic/choice/clock answers are retained as such.
"""

from __future__ import annotations

import ast
import json
import math
import re
from fractions import Fraction
from functools import lru_cache
from pathlib import Path


VERSION = "2026-10-05-review-2"
ALIASES = {"Substraction": "Subtraction", "Common-Divison": "Common-Division"}
LEVEL_ORDER = {"C1": 0, "C2": 1, "I1": 2, "I2": 3, "extension": 4}
DISPOSITION_ORDER = {"keep": 0, "adapt": 1, "hold": 2, "reject": 3}
NUMBER = r"-?\d+(?:\.\d+)?"
IMPERIAL = re.compile(r"\b(?:inches?|feet|foot|ft|yards?|miles?|pounds?|ounces?|gallons?|quarts?|pints?|acre[sd]?)\b", re.I)
COINS = re.compile(r"\b(?:nickels?|dimes?|pennies|penny)\b|\bquarter(?:s)?\b(?=.{0,30}\b(?:dollar|cent|coin|nickel|dime|penn))", re.I)
MONEY = re.compile(r"\$|\b(?:dollars?|cents?|nickels?|dimes?|pennies|penny)\b", re.I)
FRACTION_TEXT = re.compile(r"\b\d+\s*/\s*\d+\b|\b(?:half|halves|one[- ](?:half|third|fourth|fifth|sixth|quarter)|two[- ]thirds|three[- ](?:fourths|quarters)|four[- ]fifths|fraction|numerator|denominator)\b", re.I)
MULTIPLICATIVE = re.compile(r"\b(?:twice|thrice|double|triple|half as|times (?:as|the|more|less|of)|times (?:his|her|their|a|an|its)\b)", re.I)
ADDITIVE_COMPARISON = re.compile(r"\b(?:more|fewer|less|older|younger|longer|shorter|taller|heavier|lighter)\b.{0,60}\bthan\b", re.I)
INITIAL_QUESTION = re.compile(r"\b(?:at first|initially|originally|at the beginning|start with|started with|begin with|began with|before (?:some|he|she|his|her|the|they|giving|selling)|had before|have before|there before|in the beginning)\b", re.I)
CHANGE_QUESTION = re.compile(r"\b(?:were|was|did|has|have)\b.{0,35}\b(?:added|removed|gave|give|lose|lost|sold|sell|taken|take|donate|donated|missing)\b|\b(?:more|much)\b.{0,45}\bneed\b", re.I)
FINAL_QUESTION = re.compile(r"\b(?:now|left|remaining|remain|in the end|still|after|then|at the end)\b", re.I)
DYNAMIC = re.compile(r"\b(?:ate|eaten|lost|gave|removed|taken|joined|joins|flew|flies|came|bought|sold|used|put|added|another|more|received)\b", re.I)
GEOMETRY_QUESTION = re.compile(r"\b(?:area|perimeter|circumference|radius|diameter|angles?|width|wide|dimensions)\b", re.I)
NON_RECTANGLE = re.compile(r"\b(?:circles?|circular (?!saw)|triang(?:les?|ular)|trapezi(?:um|oid)|pentagon(?:al)?|hexagon(?:al)?|octagon(?:al)?|polygon(?:al)?|parallelogram|angles?|radius|diameter|circumference)\b", re.I)
CLOCK = re.compile(r"\b\d{1,2}:\d{2}(?::\d{2})?\b|\bo'clock\b|\b\d{1,2}\s*(?:a\.?m\.?|p\.?m\.?)\b", re.I)


def _has(pattern, text):
    return bool(re.search(pattern, text, re.I))


def _uniq(items):
    return list(dict.fromkeys(items))


def _without_units(expression):
    # Only remove parenthetical unit labels.  Never remove algebra such as
    # (6+w), (2x), or (x): doing so can fabricate a successful arithmetic check.
    def strip(match):
        s = match.group(1).strip()
        if re.fullmatch(r"[A-Za-z][A-Za-z ./'_-]*", s) and len(s) > 1:
            return ""
        if s in {"g", "kg", "m", "cm", "L", "mL", "h"}:
            return ""
        return match.group(0)
    return re.sub(r"\(([^()]*)\)", strip, expression)


def _number_value(expression):
    """Evaluate bounded arithmetic only; no Python eval, symbols, or functions."""
    s = expression.strip().replace(",", "").replace("^", "**")
    s = re.sub(r"(\d+(?:\.\d+)?)\s*%", r"(\1/100)", s)
    if len(s) > 1000:
        raise ValueError("expression too long")
    if re.fullmatch(r"\d+\s+\d+/\d+", s):
        whole, frac = s.split()
        return Fraction(whole) + Fraction(frac)
    tree = ast.parse(s, mode="eval")
    if len(list(ast.walk(tree))) > 150:
        raise ValueError("expression too complex")

    def visit(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return Fraction(str(node.value))
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            value = visit(node.operand)
            return -value if isinstance(node.op, ast.USub) else value
        if isinstance(node, ast.BinOp):
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Div):
                return left / right
            if isinstance(node.op, ast.Pow) and abs(right) <= 20:
                if right.denominator == 1:
                    return left ** int(right)
                if right == Fraction(1, 2) and left >= 0:
                    n, d = math.isqrt(left.numerator), math.isqrt(left.denominator)
                    if n * n == left.numerator and d * d == left.denominator:
                        return Fraction(n, d)
        raise ValueError("not supported numeric arithmetic")
    return visit(tree.body)


def _answer_number(answer):
    a = re.sub(r"\([^()]*[A-Za-z][^()]*\)\s*$", "", answer).strip()
    # Do not turn a ratio, multi-answer, or clock into its first integer.
    if ":" in a or ";" in a or re.search(r"\br\s*\d", a, re.I):
        raise ValueError("structured answer")
    if re.fullmatch(r"[\d\s.,()/+*%^-]+", a):
        return _number_value(a)
    raise ValueError("nonnumeric answer")


def answer_type(record):
    answer = str(record.get("answer", "")).strip()
    body = str(record.get("body", "")) + " " + str(record.get("question", ""))
    typ = ALIASES.get(str(record.get("source_type", "")), str(record.get("source_type", "")))
    if re.fullmatch(r"(?:yes|no)\.?", answer, re.I):
        return "boolean"
    if typ == "Comparison":
        return "object_choice"
    if ";" in answer:
        return "multiple_values"
    if re.fullmatch(r"\d+\s*:\s*\d+(?:\s*:\s*\d+)*", answer) and (typ == "Ratio" or _has(r"\bratio\b", body)):
        return "ratio"
    if CLOCK.search(answer) or (":" in answer and _has(r"what (?:day and )?time|clock", body)):
        return "clock_time"
    if re.search(r"\d\s*r\s*\d|remainder", answer, re.I):
        return "quotient_remainder"
    if re.search(r"\d(?:st|nd|rd|th)\b", answer, re.I):
        return "ordinal"
    try:
        value = _answer_number(answer)
        if _has(r"%|percent", answer):
            return "percentage"
        if "/" in answer:
            return "fraction"
        return "integer" if value.denominator == 1 else "decimal"
    except (ValueError, SyntaxError, ZeroDivisionError, OverflowError):
        return "text"


def numeric_validation(record):
    """Check explicit numeric annotations; report coverage, never assume it."""
    formula = str(record.get("formula", "")).strip()
    typ = ALIASES.get(str(record.get("source_type", "")), str(record.get("source_type", "")))
    result = {"status": "not_checked_symbolic_or_structured", "scope": "formula_and_answer_only"}
    try:
        answer = _answer_number(str(record.get("answer", "")))
        if typ in {"Comparison", "Ratio", "Algebra-1", "Algebra-2"}:
            return result
        if typ in {"GCD", "LCM"}:
            m = re.fullmatch(r"(?:GCD|LCM)\s*[\[(]([\d,\s]+)[\])]\s*=\s*(\d+)\s*", formula, re.I)
            if not m:
                return result
            values = [int(x) for x in re.findall(r"\d+", m.group(1))]
            expected = Fraction((math.gcd if typ == "GCD" else math.lcm)(*values))
            if expected != int(m.group(2)):
                return {**result, "status": "mismatch", "reason": "最大公因数/最小公倍数算式结果不一致"}
        elif typ in {"Surplus", "Floor-Division", "Ceil-Division"}:
            m = re.fullmatch(r"(.+?)\s*=\s*(\d+)\s*r\s*(\d+)\s*", formula)
            if not m:
                return result
            # The dividend may itself be an arithmetic expression (e.g. 4*32).
            division = ast.parse(_without_units(m.group(1)), mode="eval").body
            if not isinstance(division, ast.BinOp) or not isinstance(division.op, ast.Div):
                return result
            numerator = _number_value(ast.unparse(division.left))
            denominator = _number_value(ast.unparse(division.right))
            if numerator.denominator != 1 or denominator.denominator != 1 or denominator <= 0:
                return result
            quotient, remainder = divmod(int(numerator), int(denominator))
            if (quotient, remainder) != (int(m.group(2)), int(m.group(3))):
                return {**result, "status": "mismatch", "reason": "源算式中的商余数不满足被除数=除数×商+余数"}
            expected = Fraction({"Surplus": remainder, "Floor-Division": quotient,
                                 "Ceil-Division": quotient + (remainder > 0)}[typ])
        else:
            if formula.count("=") != 1 or ";" in formula:
                return result
            lhs, rhs = formula.split("=")
            expected = _number_value(_without_units(lhs))
            rhs = _without_units(rhs).strip()
            annotated = _number_value(rhs)
            if annotated != answer:
                return {**result, "status": "mismatch", "reason": "源算式右端与源答案不一致"}
        if expected == answer:
            return {**result, "status": "verified", "scope": "formula_and_answer_only"}
        # An unstated rounding convention calls for adaptation, not a false
        # assertion that an approximate answer is intrinsically incorrect.
        raw_answer = str(record.get("answer", ""))
        decimal = re.match(r"\s*-?\d+\.(\d+)", raw_answer)
        if decimal and abs(expected - answer) <= Fraction(1, 2 * 10 ** len(decimal.group(1))):
            return {**result, "status": "rounded", "reason": "源答案使用近似小数，题面需明确精度与容差"}
        return {**result, "status": "mismatch", "reason": "源算式计算值与源答案不一致"}
    except (ValueError, SyntaxError, ZeroDivisionError, OverflowError, TypeError):
        return result


def _operation_count(formula):
    f = _without_units(formula).split("=")[0]
    if ";" in f or re.search(r"[A-Za-z]", f):
        return None
    try:
        tree = ast.parse(f.replace("^", "**").replace(",", ""), mode="eval")
        return sum(isinstance(x, ast.BinOp) for x in ast.walk(tree))
    except (ValueError, SyntaxError):
        return None


@lru_cache(maxsize=1)
def load_overrides():
    path = Path(__file__).with_name("asdiv_overrides.json")
    return json.loads(path.read_text(encoding="utf8")) if path.exists() else {}


def classify(record):
    """Return provisional A01-A16/EXT/REVIEW classification and screening data."""
    body = str(record.get("body", ""))
    question = str(record.get("question", ""))
    text = (body + " " + question).replace("’", "'")
    formula = str(record.get("formula", ""))
    answer = str(record.get("answer", ""))
    source_type = ALIASES.get(str(record.get("source_type", "")), str(record.get("source_type", "")))
    attrs = record.get("solution_type_attributes", {}) or {}
    subgoals = [ALIASES.get(v, v) for k, v in attrs.items() if k.lower().startswith("subgoal")]
    unit_trans = attrs.get("UnitTrans", "")
    operations = _operation_count(formula)
    complexity = max(operations or 1, len(subgoals) + 1)
    lhs_terms = re.sub(r"[\s()]", "", formula.split("=")[0]).split("+")
    repeated_addition = (
        len(lhs_terms) >= 2 and len(set(lhs_terms)) == 1 and
        bool(re.fullmatch(NUMBER, lhs_terms[0])) and
        _has(r"\beach\b|\bevery\b|\bper (?:day|hour|week|minute)\b|\ba day\b", text)
    )
    if repeated_addition:
        complexity = 1  # An expanded 2+2+... form is still one grouping relation.
    atype = answer_type(record)
    money = bool(MONEY.search(text))
    coins = bool(COINS.search(text))
    # A named first/second half is often a time or stage label (e.g. a game),
    # not a claim that the scored points themselves are fractional quantities.
    fraction_text = re.sub(r"\b(?:first|second|1st|2nd)[ -]+half\b", "segment", text, flags=re.I)
    fraction = bool(FRACTION_TEXT.search(fraction_text)) or unit_trans == "Half"
    percent = _has(r"%|\bpercent(?:age)?\b", text)
    ratio = _has(r"\bratio\b", text) or source_type == "Ratio"
    decimal = _has(r"\b\d+\.\d+\b", text)
    age = _has(r"\b(?:ages?|years? old|older|younger|as old|how old)\b", text)
    multiplicative = bool(MULTIPLICATIVE.search(text))
    # A land area used only as a per-group quantity is still equal grouping;
    # it does not exercise the rectangle area/perimeter relationship.
    geometry = source_type == "Geometry" or "Geometry" in subgoals or (
        bool(GEOMETRY_QUESTION.search(question)) and
        _has(r"rectangle|rectangular|square (?:has|paper|piece|garden|tile)|length|width|wide|long|side|diameter|radius|perimeter|circumference|angle", text)
    ) or (source_type.startswith("Algebra") and bool(NON_RECTANGLE.search(text)))
    non_rectangle = geometry and (bool(NON_RECTANGLE.search(text)) or _has(r"\b3\.14\b", formula))
    gcd_lcm = source_type in {"GCD", "LCM"} or any(t in {"GCD", "LCM"} for t in subgoals)
    clock = (bool(CLOCK.search(text)) and not ratio) or atype == "clock_time"
    general_algebra = source_type == "Algebra-2" and _has(r"\bspeeds?\b|\bupstream\b|\bdownstream\b|km/hr|km an hour|still water|invest|simple interest|area.*reduced", text)
    abstract_number = source_type in {"Algebra-1", "Algebra-2", "Set-Operation"} and _has(r"\b(?:numbers?\b(?! of)|integers?|digits?|numerator|denominator)\b", text)
    if source_type == "Set-Operation" and _has(r"sum of the remaining|remaining numbers", text):
        abstract_number = False  # Missing component of a total is ordinary A01.
    coin_conversion = coins and (_has(r"\$|\bdollars?\b|\bcents?\b|\bworth\b|\bcost\b|\bpay\b", text) or _has(r"\bmoney\b", question) or unit_trans == "Money")
    initial = bool(INITIAL_QUESTION.search(question))
    change = bool(CHANGE_QUESTION.search(question))
    knowledge, reasoning, flags, notes, severity = [], [], [], [], {}
    disposition = "keep"
    category, subcategory, level = "REVIEW", "数量关系待复核", "I1"
    basis = "尚无足够明确的规则匹配"

    def flag(code, note, hint="adapt", certainty="suspected"):
        nonlocal disposition
        flags.append(code)
        notes.append(note)
        if severity.get(code) != "confirmed":
            severity[code] = certainty
        if DISPOSITION_ORDER[hint] > DISPOSITION_ORDER[disposition]:
            disposition = hint

    if money:
        knowledge.append("money")
    if coin_conversion:
        knowledge.append("foreign_coin_denominations")
        flag("Q07", "美制硬币面值需显式提供，中文改编时重算币值关系", certainty="confirmed")
    if IMPERIAL.search(text):
        knowledge.append("imperial_units")
        flag("Q07", "英制单位需改编或明示换算规则；不能只替换单位名称", certainty="confirmed")
    if unit_trans:
        knowledge.extend(["unit_conversion", "source_unit_" + unit_trans.lower()])
    if decimal:
        knowledge.append("decimal")
    if fraction:
        knowledge.append("fraction")
    if ratio:
        knowledge.append("ratio")
    if percent:
        knowledge.append("percentage")
    if age:
        knowledge.append("age")
    if subgoals:
        reasoning.extend(["subgoal_decomposition"] + ["source_subgoal_" + x.lower() for x in subgoals])
    if source_type.startswith("Algebra"):
        knowledge.append("algebraic_source_representation")
    if gcd_lcm:
        category = "A15"
        if source_type == "GCD" or "GCD" in subgoals:
            knowledge.append("gcd")
            subcategory = "最大等长分割" if _has(r"length|wide|width|side of|strips|planks", question) else "最大等量分组"
        else:
            knowledge.append("lcm")
            subcategory = "同步周期与再次时刻" if clock else "同步周期与间隔" if _has(r"again|same day|same time|next|starting (?:point|line)", question) else "最小公倍数与配套数量"
            if _has(r"packages|pieces", question):
                subcategory = "配套数量换算包数或件数"
        level = "I2" if clock or len(subgoals) >= 2 else "I1"
        reasoning.append("divisibility_constraints")
        basis = "源类别或子目标明确标注GCD/LCM，并按所求量细分"
    elif source_type in {"Surplus", "Floor-Division", "Ceil-Division"}:
        category = "A13"
        subcategory = {"Surplus": "余数对应剩余量", "Floor-Division": "去尾求完整份数", "Ceil-Division": "进一保证全部容纳"}[source_type]
        level = "I1"
        knowledge.append("division_with_remainder")
        reasoning.append({"Surplus": "interpret_remainder", "Floor-Division": "floor_decision", "Ceil-Division": "ceiling_decision"}[source_type])
        basis = "按源商余数类型和题面所求量划分，取整语义仍需审核"
        if _has(r"\babout\b|approximately", question):
            subcategory, level = "估算与取整规则待明确", "C2"
            flag("Q06", "估算题与进一/去尾标签混用，需明确估算方法和容许区间", certainty="confirmed")
        if source_type == "Floor-Division" and _has(r"equally|equal number|same amount|same number", text) and not _has(r"\bwhole\b|full|left ?over|left with|remaining|rest", text):
            flag("Q06", "非整除的平均分未明确剩余处理，需确认完整单位与剩余归属")
    elif source_type in {"Number-Pattern", "Sequential-Operation", "Number-Operation"}:
        category, level = "EXT", "extension"
        subcategory = "数字规律" if source_type in {"Number-Pattern", "Sequential-Operation"} else "数位组成或运算过程比较"
        if _has(r"\bin line\b", text):
            subcategory = "队列位置与序数"
        knowledge.append("number_pattern" if "pattern" in text.lower() else "number_structure")
        reasoning.append("conditional_extension")
        basis = "源数字规律/数位/序数类别超出A01–A16主池范围，作为条件性拓展"
        flag("Q05", "需另设数位、序数或规律专题，不纳入主池覆盖数", "hold", "confirmed")
    elif source_type == "Comparison":
        if _has(r"most likely|probability|chance", question):
            category, subcategory, level = "EXT", "可能性比较", "extension"
            knowledge.append("probability")
            flag("Q05", "概率与可能性专题超出本轮A01–A16主池范围", "hold", "confirmed")
        else:
            category = "A16"
            if ratio:
                subcategory, level = "两方案的比值比较", "I2"
                reasoning.append("compare_ratios")
            elif _has(r"unit price|better deal|cheaper|highest price|higher.*price|lower.*price|cost the most|most expensive", question):
                subcategory, level = "两方案的单价比较", "I1"
                reasoning.append("common_unit_comparison")
            elif geometry:
                subcategory, level = "几何方案比较", "I1"
                knowledge.append("geometry_measurement")
            elif atype == "boolean":
                subcategory, level = "数量阈值与相等判断", "I1" if complexity > 1 or coins else "C1"
            else:
                subcategory, level = "对象数量或长度比较", "I1" if coins or complexity > 1 else "C1"
            reasoning.append("finite_alternative_comparison")
        basis = "比较类按比值、单价、阈值或对象选择细分；对象答案与是非答案均有效"
    elif general_algebra:
        category, subcategory, level = "EXT", "复合行程或联立关系", "extension"
        reasoning.append("multiple_unknowns")
        basis = "涉及复合速度、倒数关系或多未知量；不按原年级标签直接入选"
        flag("Q05", "需验证适合小学的算术解法，暂存拓展复核", "hold", "confirmed")
    elif geometry:
        knowledge.append("geometry_measurement")
        if non_rectangle:
            category, subcategory, level = "EXT", "其他几何（角度、圆、多边形）", "extension"
            flag("Q05", "原方案A14只覆盖矩形/正方形，其他几何单列拓展", "hold", "confirmed")
        else:
            category = "A14"
            if money:
                subcategory, level = "面积、用量与费用综合", "I2"
            elif _has(r"fractional part|fraction of", question):
                subcategory, level = "面积中的部分与整体", "I1"
            elif _has(r"border|remaining|not taken|pond|equal to|ratio", text):
                subcategory, level = "组合或逆向周长面积", "I2"
            elif _has(r"tiles|cards|smaller squares|wire", question):
                subcategory, level = "铺排分割与长度面积关联", "I2"
            elif _has(r"perimeter", question):
                subcategory, level = "由边长或面积求周长", "C2" if complexity <= 3 else "I1"
            elif _has(r"area", question):
                subcategory, level = "由边长或周长求面积", "C2" if complexity <= 2 else "I1"
            else:
                subcategory, level = "由周长面积反求边长", "I1"
        basis = "按几何题面及源Geometry子目标识别，矩形/正方形以外不混入A14"
    elif percent:
        category, subcategory, level = "EXT", "百分数、折扣或利息", "extension"
        basis = "百分数为原方案条件性专题，独立于基础四则巩固"
        flag("Q05", "百分数先修与情境需另行确认，不能按源四则标签自动收进巩固层", "hold", "confirmed")
    elif ratio:
        category = "A11"
        if (source_type.startswith("Algebra") and _has(r"becomes|will be|from now|add.*each", text)) or (atype == "ratio" and _has(r"shared|in the ratio", body) and _has(r"used|then|after", text)):
            subcategory, level = "数量变化后的比", "I2"
        elif atype == "ratio":
            if _has(r"total|all", question):
                subcategory, level = "部分量与总量的比", "I1"
            elif subgoals or _has(r";", formula):
                subcategory, level = "先求缺失数量再化比", "I1"
            else:
                subcategory, level = "两个数量的比及化简", "C2"
        elif _has(r"same rate|for every|for \d+|every \d+", text) or not _has(r"\bratio\b", text):
            subcategory, level = "同一速率或配方按比例求量", "C2"
            reasoning.append("scale_proportional_quantities")
        elif _has(r"difference|more than|less than|younger|older", body):
            subcategory, level = "已知差与比求数量", "I1"
        elif _has(r"total|combined|original|completing the race", question):
            subcategory, level = "已知部分与比求整体", "I1"
        elif _has(r"sum|total|together", body):
            subcategory, level = "已知整体按比分配", "C2"
        else:
            subcategory, level = "已知一量按比求另一量", "C2"
        reasoning.append("identify_ratio_baseline")
        basis = "识别ratio关系与分配/变化/部分整体的所求量"
    elif _has(r"\bmean\b|\baverage\b", question):
        category, subcategory, level = "A12", "平均数与等量化", "C2"
        knowledge.append("arithmetic_mean")
        reasoning.append("sum_then_equalize")
        basis = "问题明确求平均数，不沿用Set-Operation泛类别"
    elif clock:
        category, level = "A09", "C2"
        # Converting hh:mm to minutes and back expands a single clock relation
        # into several arithmetic operators without adding semantic subgoals.
        complexity = max(1, len(subgoals) + 1)
        knowledge.append("clock_time")
        if _has(r"what time.*(?:start|leave|put)|when.*start", question) or _has(r"what day and time", question):
            subcategory = "由结束时刻反推开始时刻"
            level = "I1"
            reasoning.append("reverse_time")
        elif _has(r"what time|when", question):
            subcategory = "由开始时刻求结束时刻"
            start = re.search(r"\b(\d{1,2}):(\d{2})\b", body)
            finish = re.search(r"\b(\d{1,2}):(\d{2})\b", answer)
            if start and finish and start.group(1) == finish.group(1) and int(finish.group(2)) >= int(start.group(2)):
                level = "C1"
            reasoning.append("forward_time")
        else:
            subcategory = "经过时间与空闲时间"
        crosses_midnight = _has(r"a\.?m\.?", body) and _has(r"p\.?m\.?", answer) and "reverse_time" in reasoning
        if _has(r"between|beginning|time zone|philippines|japan", text) or len(subgoals) > 1 or crosses_midnight:
            level = "I2"
        basis = "题面出现时刻或结构化时间答案；与仅含时间单位的等量分组区分"
    elif abstract_number:
        category, subcategory, level = "EXT", "数位、数字关系与未知数专题", "extension"
        reasoning.append("conditional_extension")
        basis = "纯数字关系/数位或分子分母题，保留为条件性拓展"
        flag("Q05", "未纳入本轮核心A01–A16，需确认算术化解法与先修", "hold", "confirmed")
    elif fraction and not _has(r"numerator|denominator", text):
        category = "A10"
        if _has(r"remaining|rest|left|at first|original|start with|had you|whole", question) or source_type.startswith("Algebra"):
            subcategory, level = "由部分或剩余反求整体", "I1" if complexity <= 3 else "I2"
            reasoning.append("identify_whole_and_part")
        else:
            subcategory, level = "已知整体求部分或分数关系", "C2" if complexity <= 1 else "I1"
        if _has(r"half of the remaining|half of.*half|remaining space", text):
            level = "I2"
            reasoning.append("changing_fraction_baseline")
        basis = "分数由题面而非算式中的普通除号识别，关注部分与单位1"
    elif source_type == "UnitTrans" or unit_trans or coin_conversion:
        category, level = "A08", "C2" if complexity <= 2 else "I1"
        subcategory = "货币面值换算" if coin_conversion or unit_trans == "Money" else "时间单位换算" if unit_trans == "Time" else "常用单位换算与数量关系"
        reasoning.append("normalize_units")
        basis = "源UnitTrans属性或硬币面值要求明确换算关系"
    elif money and _has(r"cost|price|pay|paid|spent|spend|charge|change|buy|bought|sale|sell|sold|earn|discount|\bfare\b", text):
        category = "A07"
        expense_question = _has(r"\bspend\b|\bspent\b|\bspending\b", question)
        formula_lhs = _without_units(formula).split("=")[0]
        balance_inverse = expense_question and _has(r"left|remaining|returned|change", body) and "-" in formula_lhs and not _has(r"[*/]", formula_lhs)
        partial_expense = expense_question and not balance_inverse and _has(r"spent (?:a )?total|total money|all the gifts cost", body) and "-" in formula_lhs and "+" not in formula_lhs.split("-")[0]
        if initial:
            subcategory = "由支出与余额反求购物前金额"
            reasoning.append("initial_unknown")
        elif balance_inverse:
            subcategory = "由购物前金额与余额反求支出"
            reasoning.append("change_unknown")
        elif expense_question and _has(r"how much (?:more|less)|than", question):
            subcategory = "两项或两组支出的差额比较"
            reasoning.append("additive_comparison")
        elif partial_expense:
            subcategory = "由总支出反求某项费用"
            reasoning.append("missing_expense_component")
        elif _has(r"left|change|more.*need|save|saved", question):
            subcategory = "购物后余额、找零或差额"
        elif _has(r"each|per|one .*cost", question):
            subcategory = "已知总价反求单价"
        elif _has(r"how many|how much.*(?:can|could).*buy", question):
            subcategory = "预算或总价反求数量"
        else:
            subcategory = "单项或多项购物总价"
        level = "C1" if complexity <= 1 and not decimal else "C2" if complexity <= 2 else "I1" if complexity <= 4 else "I2"
        if source_type.startswith("Algebra"):
            # Two symbols can merely represent a simple sum/difference or
            # sum/multiple relation; the source algebra label is not difficulty.
            level = "I2" if _has(r"fixed charge|first kilometer|remaining distance|reservation charge|journey of", text) else "I1"
        if initial or balance_inverse or partial_expense:
            level = "I1" if complexity <= 3 else "I2"
        reasoning.append("price_quantity_total")
        basis = "有货币条件且涉及购买、付款或收入，按所求量区分"
    elif repeated_addition or (source_type in {"Multiplication", "Common-Division"} and not subgoals and not multiplicative):
        category = "A04"
        if source_type == "Common-Division":
            subcategory = "平均分求每份量" if _has(r"\beach\b|\bper\b|\bevery\b", question) else "包含分求份数"
            reasoning.append("partitive_division" if subcategory.startswith("平均分") else "quotitive_division")
        else:
            subcategory = "等量分组求总量"
            reasoning.append("equal_groups_total")
        level = "C2" if decimal or complexity > 1 else "C1"
        if complexity > 2:
            level = "I1"
        basis = "明确每份量、份数或分组关系；重复加法展开不等于多层推理"
    elif initial or source_type == "TVQ-Initial" and bool(DYNAMIC.search(text)):
        category, subcategory, level = "A02", "已知变化与结果反求初始量", "I1" if complexity <= 3 else "I2"
        reasoning.append("initial_unknown")
        basis = "题面问初始量，不能因使用加法而判为直接求和巩固"
    elif change or source_type == "TVQ-Change" and _has(r"gave|give|lost|sold|sell|missing|need|added|removed", question):
        category, subcategory, level = "A02", "已知初末状态求变化量", "I1" if complexity <= 3 else "I2"
        reasoning.append("change_unknown")
        basis = "所求为增加、减少或缺少的变化量"
    elif age and source_type.startswith("Algebra") and _has(r"years? (?:ago|from now|hence|later|earlier)|before \d|after \d", text):
        category, subcategory, level = "A02", "年龄跨时点与不变量", "I2"
        reasoning.extend(["time_state_alignment", "age_difference_invariant"])
        basis = "年龄题按跨时点数量关系初分，源代数写法不等于必须使用方程"
    elif multiplicative:
        category = "A05"
        if _has(r"sum|altogether|together|total|between them", text):
            subcategory, level = "和倍或差倍分配", "I1" if complexity <= 3 else "I2"
        else:
            subcategory = "倍数已知求比较量或基准量"
            direct_multiply = source_type == "Multiplication" or (
                "/" not in formula.split("=")[0] and complexity <= 1
            )
            level = "C1" if complexity <= 1 and direct_multiply and not decimal and not source_type.startswith("Algebra") else "C2" if complexity <= 1 and not source_type.startswith("Algebra") else "I1" if complexity <= 3 else "I2"
        reasoning.append("identify_multiplicative_baseline")
        basis = "题面明确倍数关系，区别于普通每份乘份数"
    elif source_type in {"Multiplication", "Common-Division"} or _has(r"\beach\b|\bper (?:day|hour|week|minute)\b|\bevery (?:day|hour)\b", text) and source_type in {"Addition", "Sum"}:
        category = "A04"
        if source_type == "Common-Division":
            if _has(r"\beach\b|\bper\b|\bevery\b", question):
                subcategory = "平均分求每份量"
                reasoning.append("partitive_division")
            else:
                subcategory = "包含分求份数"
                reasoning.append("quotitive_division")
        else:
            subcategory = "等量分组求总量"
            reasoning.append("equal_groups_total")
        level = "C1" if complexity <= 1 and not decimal else "C2" if complexity <= 2 else "I1" if complexity <= 3 else "I2"
        if len(subgoals) > 0 and any(x not in {"Multiplication", "Sum"} for x in subgoals):
            category, subcategory = "A06", "先求每份或份数再运算"
            level = "I1" if complexity <= 3 else "I2"
        basis = "按分组总量、平均分和包含分区分，并结合源子目标识别混合关系"
    elif source_type == "Difference" or ADDITIVE_COMPARISON.search(text) or _has(r"how (?:many|much).*more|what is the difference", question):
        category, subcategory = "A03", "求相差量或比较量"
        level = "C1" if complexity <= 1 and not decimal else "C2" if complexity <= 2 else "I1" if complexity <= 3 else "I2"
        if source_type.startswith("Algebra") or _has(r"sum|together|total", text) and complexity >= 3:
            category, subcategory, level = "A06", "和差分配或多对象关系", "I1" if complexity <= 3 else "I2"
        reasoning.append("additive_comparison")
        basis = "识别更多/更少/相差关系，不把所有减法视为拿走"
    elif source_type == "TVQ-Final" or FINAL_QUESTION.search(question) and DYNAMIC.search(text):
        category, subcategory, level = "A02", "已知初始量与变化求最终量", "C1" if complexity <= 1 and not decimal else "C2" if complexity <= 3 else "I1"
        reasoning.append("final_unknown")
        basis = "问题明确求变化后的最终状态"
    elif source_type in {"Addition", "Subtraction", "Sum", "TVQ-Initial", "TVQ-Change", "Algebra-1", "Algebra-2", "Set-Operation"}:
        category = "A01"
        subcategory = "合并部分求总量" if source_type in {"Addition", "Sum"} else "已知总量求部分量"
        level = "C1" if complexity <= 1 and not decimal else "C2" if complexity <= 2 else "I1"
        if source_type.startswith("Algebra"):
            category, subcategory, level = "A06", "未知量的简单逆推", "I1"
        reasoning.append("part_whole")
        basis = "按总量与部分关系兜底推定，不能替代发布前语义审核"
    else:
        flag("Q05", "当前分类规则无法确定教学关系", "hold")

    if category != "EXT" and complexity >= 5:
        level = "I2"
        reasoning.append("multiple_subgoals")
    if _has(r"\bdozen\b", text):
        knowledge.append("dozen_unit")
    if _has(r"\b(?:legs?|wheels?)\b", question) and not _has(r"\b(?:has|have|with)\s+(?:\d+|two|four|six|eight)\s+(?:legs?|wheels?)\b", body):
        flag("Q04", "腿数或轮数可能依赖未明示的常识，改编时补充每种对象的数量关系")
    if _has(r"letters? [TS]|starts? with the letters?", text):
        flag("Q07", "题目依赖英语星期名的字母特征，需要中文情境重新设计", certainty="confirmed")
    validation = numeric_validation(record)
    if validation["status"] == "mismatch":
        flag("Q03", validation["reason"], "hold", "confirmed")
    elif validation["status"] == "rounded":
        flag("Q06", validation["reason"], "adapt", "confirmed")
    if _has(r"\b3\.14\b", formula) and not _has(r"\b3\.14\b|\bpi\b", text):
        flag("Q06", "源解答采用π≈3.14，但题面未明示圆周率与近似要求", certainty="confirmed")
    if source_type.startswith("Algebra") and atype == "multiple_values":
        reasoning.append("label_multiple_outputs")
    out = {
        "category": category, "subcategory": subcategory, "level": level,
        "knowledge_tags": _uniq(knowledge), "reasoning_tags": _uniq(reasoning),
        "quality_flags": _uniq(flags), "quality_notes": _uniq(notes),
        "flag_severity": severity, "classification_basis": basis,
        "classification_method": "rule_based", "classification_version": VERSION,
        "disposition_hint": disposition, "issue_severity": "confirmed" if "confirmed" in severity.values() else "suspected" if severity else None,
        "answer_type": atype, "numeric_validation": validation,
        "arithmetic_operator_count": operations, "source_subgoal_count": len(subgoals),
        "rule_complexity_estimate": complexity,
        "assistant_reviewed": False,
    }
    override = load_overrides().get(str(record.get("source_id", "")))
    if override:
        out["assistant_reviewed"] = bool(override.get("assistant_reviewed", True))
        out["assistant_review_reason"] = override["reason"]
        out["classification_method"] = "rules_with_assistant_override"
        for key in ("category", "subcategory", "level", "answer_type"):
            if key in override:
                out[key] = override[key]
        for key in ("knowledge_tags", "reasoning_tags"):
            out[key] = _uniq(out[key] + override.get(key, []))
        override_flags = override.get("flags", override.get("quality_flags", []))
        out["quality_flags"] = _uniq(out["quality_flags"] + override_flags)
        out["quality_notes"] = _uniq(out["quality_notes"] + [override["reason"]])
        for code in override_flags:
            out["flag_severity"][code] = override.get("issue_severity", "confirmed")
        hint = override.get("disposition_hint", "hold" if override_flags else out["disposition_hint"])
        if DISPOSITION_ORDER[hint] > DISPOSITION_ORDER[out["disposition_hint"]]:
            out["disposition_hint"] = hint
        if override_flags:
            out["issue_severity"] = override.get("issue_severity", "confirmed")
        if any(key in override for key in ("category", "subcategory", "level")):
            out["classification_basis"] = override.get("classification_basis", override["reason"])
    out["required_answer_schema"] = {
        "integer": "numeric_scalar_with_unit", "decimal": "decimal_with_precision_and_unit",
        "fraction": "rational_number", "percentage": "percentage_with_explicit_scale",
        "boolean": "boolean", "object_choice": "source_object_id",
        "multiple_values": "named_values", "clock_time": "clock_with_day_offset",
        "ratio": "ordered_ratio_terms", "quotient_remainder": "quotient_and_remainder",
        "ordinal": "ordinal_integer", "text": "reviewed_text_or_named_schema",
    }[out["answer_type"]]
    out["decision_reason"] = (
        "当前规则判为可保留候选，仍需完成中文改编与发布前语义审核"
        if out["disposition_hint"] == "keep" else
        "需改编或明确条件：" + "；".join(out["quality_notes"])
        if out["disposition_hint"] == "adapt" else
        "暂存复核：" + "；".join(out["quality_notes"])
    )
    return out
