"""Conservative, reproducible GSM8K teaching classification.

The rules infer teaching categories from the *question and solution*, rather
than equating the number of ``<<...>>`` annotations with difficulty.  This is
not a claim of full semantic verification or human review.  Individually
inspected exceptions live in ``gsm8k_overrides.json`` and retain their reasons.

``classify`` deliberately does not select representatives or publish questions.
The caller owns deduplication, split policy and the final selection manifest.
"""

from __future__ import annotations

import ast
import json
import re
from fractions import Fraction
from functools import lru_cache
from pathlib import Path


CLASSIFIER_VERSION = "gsm8k-content-rules-v1"
CATEGORIES = {
    "G01": "多阶段总量与剩余",
    "G02": "单价、数量、总价与预算",
    "G03": "倍数与差量组合",
    "G04": "分数的部分与整体",
    "G05": "比例分配与单位量",
    "G06": "平均数与缺失数据",
    "G07": "时间、速率与产量",
    "G08": "几何量与生活计算",
    "G09": "百分数与简单折扣",
    "G10": "两类关系综合任务",
    "REVIEW": "待补充分类或超出首版范围",
}

_ANNOTATION = re.compile(r"<<([^<>]+)>>")
_NUMBER = re.compile(r"(?<![\w.])-?(?:\d[\d,]*(?:\.\d+)?|\.\d+)")
_PROSE_NUMBER = r"(?:\d[\d,]*(?:\.\d+)?|\.\d+)"
_PROSE_ATOM = rf"(?:\(\s*)*-?\s*\$?{_PROSE_NUMBER}\s*%?(?:\s*\))*"
_PROSE_OP = r"(?:[+*/×÷−–-]|\bx\b)"
_PROSE_EQUATION = re.compile(
    rf"(?<![\w.])(?P<left>{_PROSE_ATOM}(?:\s*{_PROSE_OP}\s*{_PROSE_ATOM}){{1,12}})"
    rf"\s*=\s*(?P<right>{_PROSE_ATOM}(?:\s*{_PROSE_OP}\s*{_PROSE_ATOM}){{0,12}})"
)
_VULGAR_FRACTIONS = {"½": "(1/2)", "⅓": "(1/3)", "⅔": "(2/3)",
                    "¼": "(1/4)", "¾": "(3/4)", "⅕": "(1/5)", "⅖": "(2/5)",
                    "⅗": "(3/5)", "⅘": "(4/5)", "⅛": "(1/8)", "⅜": "(3/8)",
                    "⅝": "(5/8)", "⅞": "(7/8)"}
_FRACTION = re.compile(
    r"\b\d+\s*/\s*\d+(?:st|nd|rd|th)?\b|\b(?:one|two|three|four|five|six|seven|eight|nine)"
    r"[- ](?:half|halves|thirds?|fourths?|quarters?|fifths?|sixths?|eighths?|tenths?)\b"
    r"|\b(?:half|a third|a fourth|a quarter)\s+(?:as|of|the|her|his|their|its)\b"
    r"|\b(?:in|into)\s+(?:half|halves|thirds|fourths|quarters|fifths|sixths|eighths)\b"
)
_ALGEBRA = re.compile(
    r"\b(?:combining like terms|combine like terms|substitut\w*|equating|"
    r"both sides|set(?:ting)? (?:the|these|two|both) .*?equal)\b"
    r"|\blet\s+(?:[a-z]\s+(?:be|represent|=)|the number|the amount)\b"
)
_PERCENT = re.compile(r"%|\bpercent(?:age)?s?\b|\bdiscount\b")
_COMPARISON = re.compile(
    r"\b(?:twice|thrice|double[ds]?|triple[ds]?|quadruple[ds]?)\b"
    r"|\b(?:times (?:as|more|less|the)|(?:more|less|fewer|greater|larger|"
    r"smaller|longer|shorter|older|younger|heavier|lighter|faster|slower) than)\b"
    r"|\b(?:more|less|fewer|greater|larger|smaller|longer|shorter|older|younger)"
    r"(?:\s+[a-z'-]+){1,5}\s+than\b"
)
_EXPLICIT_RATIO = re.compile(r"\bratio\b|\b\d+\s*:\s*\d+\b(?!\s*(?:am|pm))")
_MONEY = re.compile(
    r"\$|\b(?:dollars?|cents?|pennies|nickels?|dimes?|costs?|prices?|"
    r"budget|pay|pays|paid|earns?|earned|spend|spends|spent|profit|"
    r"revenue|sales|sells?|sold|buys?|bought|purchase[ds]?)\b"
)
_GEOMETRY = re.compile(
    r"\b(?:area|perimeter|volume|radius|diameter|angles?|rectangle|rectangular|"
    r"triangle|triangular|trapezoid|cylinder|sphere|hypotenuse)\b"
    r"|\bsquare\s+(?:garden|plot|field|room|tile|table|piece|pool|yard|"
    r"carpet|paper|shape|frame|sandbox|fence|box)\b"
)
_TIME_UNIT = re.compile(r"\b(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b")
_RATE = re.compile(
    r"\b(?:mph|kph|km/h|speed|rate|per (?:second|minute|hour|day|week|month|year))\b"
    r"|\b(?:each|every)\s+(?:second|minute|hour|day|week|month|year)\b"
    r"|\b\d+(?:\.\d+)?(?:\s+[a-z]+){0,2}\s+an?\s+(?:second|minute|hour|day|week|month|year)\b"
    r"|\b(?:miles?|kilometers?|kilometres?|meters?|metres?|feet)\s*/\s*"
    r"(?:seconds?|minutes?|hours?)\b"
)
_PROBABILITY = re.compile(
    r"\b(?:probability|odds|likelihood|expected value)\b"
    r"|\b(?:chance|chances)\b.{0,65}\b(?:random|win|los|infect|happen|drop|get)"
    r"|\b(?:at random|randomly)\b.{0,180}\b(?:percent|chance|expect|probab)"
    r"|\b(?:percent|chance|expect|probab)\w*\b.{0,180}\b(?:at random|randomly)\b"
)
_FINANCIAL_CONVENTION = re.compile(
    r"\b(?:tax|taxes|taxation|loan|loans|mortgage|mortgaging|hedge fund|"
    r"compound(?:ed)? interest|interest compounded|simple interest|interest rate|"
    r"finance fee|late fee|stock market|stock price)\b"
)
_ADVANCED_GEOMETRY = re.compile(
    r"\b(?:hypotenuse|pythagor\w*|square root|sqrt|trapezoid|cylinder|"
    r"sphere|hemisphere|cone|hexagon|pentagon|triangle|triangular|"
    r"circular|radius|diameter|volume)\b"
)


def _has(pattern: str | re.Pattern[str], text: str) -> bool:
    return bool(re.search(pattern, text))


def _append_unique(items: list[str], *new: str) -> None:
    for item in new:
        if item and item not in items:
            items.append(item)


def _question_target(question: str) -> str:
    """Isolate the requested quantity from leading/trailing givens.

    A final sentence may read 'If the original price is 90, how much ...?'.
    The original-price condition must not turn the requested discounted price
    into an inverse task.  A trailing explanatory sentence is not the target.
    """
    starts = list(re.finditer(r"\b(?:how (?:many|much|long|far|old|tall|wide|fast)|"
                              r"what(?:'s|\s+(?:is|are|was|were|will|would|amount|"
                              r"number|percentage|percent|fraction|portion|rate|time|share)))\b", question))
    if not starts:
        starts = list(re.finditer(r"(?:^|[.!?,]\s+)\b(?:calculate|find)\b", question))
    target = question[starts[-1].start():] if starts else re.split(r"[.!?]\s+", question)[-1]
    target = target.split("?", 1)[0]
    return re.split(r",?\s+if\b", target, maxsplit=1)[0].strip()


def _asks_for_initial_value(target: str) -> bool:
    """Recognise an initial-value question, not any mention of 'original'."""
    marker = re.search(r"\b(?:original(?:ly)?|initial(?:ly)?|previous|at first|"
                       r"at the start|at the beginning|before|when)\b", target)
    if not marker:
        return False
    prefix = target[:marker.start()]
    # These targets ask a forward difference, portion, deadline or final value.
    if _has(r"\b(?:save|saved|saving|discount|reduction|difference|lose|lost|loss|"
            r"remaining|left|remain|remained|beyond|new|current|percentage|percent)\b", prefix):
        return False
    if _has(r"\b(?:original|initial|previous)\s+(?:monthly\s+|total\s+)?(?:price|cost|"
            r"income|salary|amount|number|quantity|length|height|width|weight|value|"
            r"volume|size|speed|rate|age|count|population|balance|investment)\b", target):
        return True
    # Recovering a past quantity differs from 'how long before he retires' or
    # 'how much will she pay before the next shopping trip'.
    return _has(r"\b(?:did|was|were|had)\b", prefix) and _has(
        r"\b(?:original(?:ly)?|initial(?:ly)?|previous|at first|at the start|"
        r"at the beginning|before|when .{0,35}(?:planted|bought|started))\b", target
    )


def _evidence(flag: str, reason: str, certainty: str = "suspected", **extra) -> dict:
    return {"flag": flag, "certainty": certainty, "reason": reason, **extra}


class UnsupportedArithmetic(ValueError):
    """The expression is outside the numeric-only arithmetic grammar."""


def safe_arithmetic(expression: str) -> Fraction:
    """Evaluate a bounded numeric AST; names, calls and attributes are forbidden.

    No Python ``eval``/``exec`` or symbolic substitutions are used.  Commas,
    ordinary multiplication/division signs and numeric percentages are accepted.
    Resource bounds also prevent pathological exponent/tree inputs.
    """
    text = expression.strip().replace("−", "-").replace("–", "-")
    text = text.replace("×", "*").replace("÷", "/").replace("^", "**")
    text = text.replace(",", "")
    text = re.sub(r"(?<=[\d)])\s*x\s*(?=[\d.(+-])", "*", text)
    text = re.sub(r"(\d+(?:\.\d+)?|\.\d+)\s*%", r"(\1/100)", text)
    if len(text) > 600 or not text or not re.fullmatch(r"[\d.\s+*/()\-]+", text):
        raise UnsupportedArithmetic("not a numeric arithmetic expression")
    try:
        tree = ast.parse(text, mode="eval")
    except (SyntaxError, ValueError) as exc:
        raise UnsupportedArithmetic("invalid arithmetic syntax") from exc
    if len(list(ast.walk(tree))) > 128:
        raise UnsupportedArithmetic("arithmetic tree too large")

    def visit(node: ast.AST) -> Fraction:
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            if abs(node.value) > 10**18:
                raise UnsupportedArithmetic("numeric literal out of bounds")
            result = Fraction(str(node.value))
        elif isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            result = visit(node.operand) * (-1 if isinstance(node.op, ast.USub) else 1)
        elif isinstance(node, ast.BinOp):
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Add):
                result = left + right
            elif isinstance(node.op, ast.Sub):
                result = left - right
            elif isinstance(node.op, ast.Mult):
                result = left * right
            elif isinstance(node.op, ast.Div):
                result = left / right
            elif isinstance(node.op, ast.FloorDiv):
                result = Fraction(left // right)
            elif isinstance(node.op, ast.Pow) and right.denominator == 1 and abs(right) <= 8:
                result = left ** int(right)
            else:
                raise UnsupportedArithmetic("unsupported arithmetic operator")
        else:
            raise UnsupportedArithmetic("non-numeric AST node")
        if abs(result) > 10**40 or result.denominator > 10**40:
            raise UnsupportedArithmetic("arithmetic result out of bounds")
        return result

    try:
        return visit(tree.body)
    except (ZeroDivisionError, OverflowError) as exc:
        raise UnsupportedArithmetic("undefined arithmetic") from exc


def validate_arithmetic(answer: str, question: str = "") -> dict:
    """Check calculator annotations, explicitly limiting the claim's scope.

    Correct annotations do not establish correct modelling or sufficient
    conditions.  Unannotated prose and algebra are not silently called verified.
    Explicit rounding of a non-integer division is accepted; small unexplained
    rounding is a suspected issue, not a confirmed mathematical contradiction.
    """
    stats = {"total": 0, "checked": 0, "exact": 0, "accepted_rounding": 0,
             "rounding_candidates": 0, "mismatches": 0, "unparsed": 0}
    findings = []
    explicit_rounding = _has(r"\b(?:round\w*|approximately|approx\.?|about|roughly)\b",
                             (question + " " + answer).lower())
    integer_rounding = _has(r"\b(?:round(?:ed)? (?:up|down)|ceiling|floor|truncate\w*)\b",
                            (question + " " + answer).lower())
    for annotation in _ANNOTATION.findall(answer):
        stats["total"] += 1
        try:
            left, right = annotation.rsplit("=", 1)
            actual, stated = safe_arithmetic(left), safe_arithmetic(right)
        except (ValueError, UnsupportedArithmetic):
            stats["unparsed"] += 1
            continue
        stats["checked"] += 1
        if actual == stated:
            stats["exact"] += 1
            continue
        right_plain = right.strip().replace(",", "")
        decimal = re.fullmatch(r"-?(?:\d+(?:\.(\d+))?|\.(\d+))", right_plain)
        decimals = len((decimal.group(1) or decimal.group(2) or "")) if decimal else 0
        tolerance = Fraction(1, 2 * 10**decimals)
        difference = abs(actual - stated)
        is_rounding = bool(decimal and actual.denominator != 1 and (
            difference <= tolerance or (integer_rounding and decimals == 0 and difference < 1)
        ))
        if is_rounding and explicit_rounding:
            stats["accepted_rounding"] += 1
        elif is_rounding:
            stats["rounding_candidates"] += 1
            findings.append(_evidence(
                "rounding_or_annotation_review", "注记接近舍入值，但未明确说明舍入规则。",
                annotation=annotation, exact_value=str(actual),
            ))
        else:
            stats["mismatches"] += 1
            findings.append(_evidence(
                "arithmetic_annotation_mismatch", "数值算术注记等式不成立。", "confirmed",
                annotation=annotation, exact_value=str(actual),
            ))
    final = answer.rsplit("####", 1)[1].strip() if "####" in answer else ""
    try:
        final_value = safe_arithmetic(final)
        final_status = "numeric"
    except (ValueError, UnsupportedArithmetic):
        final_value = None
        final_status = "missing_or_unparsed"
        findings.append(_evidence("missing_or_unparsed_final_answer", "末尾答案缺失或不属于支持的数值格式。"))
    status = "no_annotations" if not stats["total"] else (
        "annotation_mismatch" if stats["mismatches"] else
        "annotations_partially_checked" if stats["unparsed"] or stats["rounding_candidates"] else
        "checked_annotations_consistent"
    )
    return {**stats, "status": status, "final_status": final_status,
            "final_value": str(final_value) if final_value is not None else None,
            "scope": "仅数值算术注记；不验证题目条件、建模或无注记解说。",
            "findings": findings}


def validate_arithmetic_prose(answer: str, question: str = "") -> dict:
    """Scan fully numeric prose equalities conservatively, outside annotations.

    Unlike a calculator annotation, a regex match in prose can lose a unit or
    a fractional convention.  Therefore every mismatch is explicitly a
    *candidate* for review, never an automatic declaration of a wrong answer.
    Partial algebra, mixed numbers and interrupted expressions are skipped.
    """
    body = _ANNOTATION.sub("", answer.split("####", 1)[0])
    for symbol, replacement in _VULGAR_FRACTIONS.items():
        body = body.replace(symbol, replacement)
    # Do not join spaced number groups: "12 200-kilobyte videos" is not 12200,
    # and a comma can separate sentences rather than thousands.
    checked, rounded, unit_scaled, skipped = 0, 0, 0, 0
    findings = []
    for match in _PROSE_EQUATION.finditer(body):
        prefix = body[max(0, match.start() - 45):match.start()]
        end = match.end() - len(match["right"]) + len(match["right"].rstrip())
        suffix = body[end:]
        left = match["left"].replace("$", "").strip()
        right = match["right"].replace("$", "").strip()
        if (re.search(r"[+*/×÷−–x-]\s*\(*\s*$|\d,?\s+$|\d,\s*$|\d:$|"
                      r"\b(?:day|week|month|year|weeks|step|part)\s*$|"
                      r"\d\s+and\s*$|\)\s*$", prefix, re.I)
                or re.match(r"\s*[/+*×÷]|\s+\d+|^[a-zA-Z]|\s*-\s*\d", suffix)
                or left.startswith("-") or re.search(r"\.\s+$", prefix)):
            skipped += 1
            continue
        try:
            actual, stated = safe_arithmetic(left), safe_arithmetic(right)
        except (ValueError, UnsupportedArithmetic):
            skipped += 1
            continue
        checked += 1
        if actual == stated:
            continue
        # Sources often write percentage points on the left, e.g. 100-20=80%.
        # Accept an unambiguous final representation change, not a blanket
        # factor-of-100 tolerance for all equations.
        if right.endswith("%") and "%" not in left:
            try:
                if actual == safe_arithmetic(right[:-1]):
                    unit_scaled += 1
                    continue
            except ValueError:
                pass
        if stated and actual and (
            (_has(r"\bcents?\b", question.lower()) and
             ("$" in match["left"] or "$" in match["right"]) and
             (actual / stated in (100, Fraction(1, 100))))
            or (_has(r"\bthousand\b", question.lower()) and
                (actual / stated in (1000, Fraction(1, 1000))))
        ):
            unit_scaled += 1
            continue
        # A whole-item floor/ceiling or a decimal approximation is insufficient
        # evidence of a wrong source answer.  Preserve its count for inspection.
        if actual.denominator != 1 and abs(actual - stated) < 1:
            rounded += 1
            continue
        findings.append(_evidence(
            "solution_arithmetic_review",
            "解说中的数值等式按通常算术语法不一致；须核对是否笔误、单位省略或分数书写约定。",
            expression=f"{left} = {right}", exact_value=str(actual),
        ))
    return {"checked": checked, "mismatch_candidates": len(findings),
            "rounding_or_integer_adjustments": rounded,
            "accepted_representation_or_unit_changes": unit_scaled,
            "skipped_partial_expressions": skipped,
            "scope": "保守扫描可完整提取的数值等式；不覆盖自然语言、一般代数或全部隐含运算。",
            "findings": findings}


def estimate_steps(answer: str) -> tuple[int, str]:
    """Return a coarse solution-line estimate, never 'meaningful steps'."""
    body = answer.split("####", 1)[0]
    annotations = len(_ANNOTATION.findall(body))
    lines = [line.strip() for line in body.splitlines() if line.strip()]
    math_lines = sum(bool(re.search(r"=|[+*/×÷]|\b(?:subtract|add|divid|multipl|"
                                   r"combining|combine|substitut|equat)\w*", line.lower()))
                     for line in lines)
    # A paragraph can contain several genuine equations.  This lower bound is
    # intentionally coarse; inverse/probability knowledge still controls level.
    if len(lines) == 1 and not annotations:
        math_lines = max(math_lines, min(6, body.count("=")))
    estimate = max(annotations, math_lines, 1 if body.strip() else 0)
    return estimate, "算术注记数与含算式/代数变换解说行数的较大值；仅为粗估，分级另结合知识与推理要求"


@lru_cache(maxsize=1)
def _overrides() -> dict:
    path = Path(__file__).with_name("gsm8k_overrides.json")
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("records", data)


def classify(record: dict) -> dict:
    """Infer one GSM category, level and disposition for a source record.

    Required record fields: ``source_id``, ``source_split``, ``question``,
    ``answer``.  ``keep`` means a candidate under automated rules, never final
    approval for a child-facing lesson.  The caller reserves the source test
    split separately; split membership must not count as a quality problem.
    """
    question, answer = record.get("question", ""), record.get("answer", "")
    q, a = question.lower().replace("’", "'"), answer.lower().replace("’", "'")
    for symbol, replacement in _VULGAR_FRACTIONS.items():
        q, a = q.replace(symbol, replacement), a.replace(symbol, replacement)
    target = _question_target(q)
    knowledge, reasoning, flags, evidence, basis = [], [], [], [], []
    _append_unique(knowledge, "四则运算")
    arithmetic = validate_arithmetic(answer, question)
    prose_arithmetic = validate_arithmetic_prose(answer, question)
    for finding in arithmetic["findings"]:
        _append_unique(flags, finding["flag"])
        evidence.append(finding)
    for finding in prose_arithmetic["findings"]:
        _append_unique(flags, finding["flag"])
        evidence.append(finding)
    estimated, estimate_method = estimate_steps(answer)
    annotated = arithmetic["total"]
    inverse = _has(_ALGEBRA, a) or _asks_for_initial_value(target)
    percent = _has(_PERCENT, q)
    fraction = _has(_FRACTION, q)
    comparison = _has(_COMPARISON, q)
    # A clock time is not a ratio.  Only explicit 'ratio' or numeric a:b whose
    # surrounding text lacks clock indicators can contribute this feature.
    ratio = _has(r"\bratio\b", q) or (
        _has(_EXPLICIT_RATIO, q) and not _has(r"\b(?:am|pm|a\.m|p\.m)\b", q)
        and not _has(r"\d:\d\d", q)
    )
    money = _has(_MONEY, q) and _has(
        r"\$|\b(?:dollars?|cents?|pennies|nickels?|dimes?|costs?|prices?|pay|"
        r"pays|paid|earns?|earned|budget|profit|revenue|income|salary|expenses?)\b", q)
    shape = _has(r"\b(?:rectang\w*|triang\w*|trapezoid|cylinder|sphere|circular|"
                 r"circle|cube|cuboid|cone|hexagon|pentagon)\b|"
                 r"\bsquare\b(?!\s+(?:feet|foot|inches|inch|meters|metres|centimeters))", q)
    dimension_alias = {"long": "length", "wide": "width", "tall": "height", "sides": "side"}
    dimensions = {dimension_alias.get(value, value) for value in re.findall(
        r"\b(?:length|long|width|wide|height|tall|base|radius|diameter|angles?|sides?)\b", q)}
    dimensional_pair = _has(r"\b\d+(?:\.\d+)?\s*(?:(?:foot|feet|inch\w*|meter\w*|"
                            r"metre\w*|centimeter\w*)\s+)?by\s+\d+(?:\.\d+)?\b", q)
    geometric_target = _has(r"\b(?:area|perimeter|volume|radius|diameter|width|height|"
                            r"angles?|degrees|side|length of (?:the|a) (?:rectangle|square|fence)|"
                            r"(?:feet|meters|metres) of fence)\b", target)
    formula_in_solution = _has(
        r"\b(?:perimeter|hypotenuse|pythagor\w*)\b|"
        r"\b(?:length|width|base)\b.{0,30}(?:\*|times|multipl\w*).{0,30}"
        r"\b(?:length|width|height)\b|\b(?:four|4|two|2) (?:equal )?sides\b|"
        r"\bradius\b.{0,40}\bdiameter\b|\bdiameter\b.{0,40}\bradius\b", a)
    # 'Area' can mean a locality.  Even a stated wall area is only a unit-rate
    # quantity when paint coverage is supplied: no geometric formula is needed.
    surface_context = _has(r"\b(?:wall|room|plot|garden|floor|field|sandbox|flowerbed|"
                           r"warehouse|building|yard|pool|fence|carpet)\b", q)
    geometry = (_has(_GEOMETRY, q) or surface_context) and (
        shape and (len(dimensions) >= 2 or dimensional_pair or
                   geometric_target and bool(dimensions or _has(r"\b(?:area|perimeter|volume)\b", q)))
        or surface_context and len(dimensions) >= 2
        or dimensional_pair and _has(r"\b(?:area|perimeter|volume|fence|wall|floor|room)\b", q)
        or formula_in_solution and (shape or bool(dimensions))
    )
    average = _has(r"\b(?:average|mean)\b", target) or _has(
        r"\b(?:average|mean)\b.{0,100}\b(?:at least|needs?|must|missing|last|final)\b", q)
    time_present = _has(_TIME_UNIT, q)
    rate_time = time_present and (_has(_RATE, q) or _has(
        r"\b(?:how (?:long|many (?:minutes|hours|days|weeks|months|years))|"
        r"what time|catch up|overtime|travel|journey|drive|drives|driving|"
        r"walks?|walking|runs?|running|reads?|reading|produces?|production)\b", q))
    # An age comparison is an additive/multiplicative relationship rather than
    # a production/time-rate task.
    if _has(r"\b(?:years? old|ages?|older|younger)\b", q) and not _has(r"\b(?:per|each|every|speed)\b", q):
        rate_time = False
    if _has(r"\brings?\b", q) and _has(r"\bgroups?\b", q) and _has(
        r"\b(?:older|old|age|years?)\b", q):
        rate_time = False  # counting age marks in groups, not a growth-rate calculation
    unit_conversion = (
        (_has(r"\bhours?\b", q) and _has(r"\bminutes?\b", q))
        or (_has(r"\bminutes?\b", q) and _has(r"\bseconds?\b", q))
        or (_has(r"\bfeet\b", q) and _has(r"\byards?|inches?\b", q))
        or (_has(r"\bmeters?|metres?\b", q) and _has(r"\bcentimeters?|kilometers?|kilometres?\b", q))
        or (_has(r"\bpounds?\b", q) and _has(r"\bounces?\b", q))
        or (_has(r"\bgallons?\b", q) and _has(r"\bquarts?|pints?|cups?\b", q))
        or (_has(r"\bdollars?\b|\$", q) and _has(r"\bcents?\b", q))
    )
    probability = _has(_PROBABILITY, q) or _has(
        r"\bprobabilit\w*\b", a) and _has(r"\b(?:chance|random|likely|odds)\b", q)
    combinatorial = _has(r"\b(?:how many|number of)\b.{0,100}\b(?:combinations|"
                         r"different ways|permutations)\b", q)
    finance = _has(_FINANCIAL_CONVENTION, q)
    advanced_geometry = geometry and _has(_ADVANCED_GEOMETRY, q + " " + a)
    cooperative_reciprocals = _has(
        r"\b(?:together|jointly|working at the same time|simultaneously)\b", q
    ) and _has(r"(?:1\s*/\s*\d+.{0,45}1\s*/\s*\d+)|\breciprocal\w*\b", a)
    complex_equations = _has(r"\b(?:quadratic|simultaneous equations|system of (?:three|3)|"
                             r"three unknowns|three variables)\b", a)
    unit_groups = _has(r"\b(?:per|each|every|equal(?:ly)?|groups?|packs?|boxes|bags|"
                       r"batches|containers|rows|cans?|bottles?|cartons?|packets?|"
                       r"gallons?|rolls?|cases?)\b", q) or _has(
        r"\b(?:a|one)\s+.{0,30}\b(?:has|holds|contains|covers|can cover)\b", q)

    if percent:
        _append_unique(knowledge, "百分数")
    if fraction:
        _append_unique(knowledge, "分数与部分整体")
    if comparison:
        _append_unique(knowledge, "倍数与差量")
    if ratio:
        _append_unique(knowledge, "比例分配")
    if money:
        _append_unique(knowledge, "金额与预算")
    if average:
        _append_unique(knowledge, "平均数")
    if geometry:
        _append_unique(knowledge, "几何度量")
    if rate_time:
        _append_unique(knowledge, "时间与速率")
    if unit_conversion:
        _append_unique(knowledge, "单位换算")
    if _has(r"(?<!\d)\d*\.\d+\b", q):
        _append_unique(knowledge, "小数")
    if inverse:
        _append_unique(reasoning, "逆向求量或方程关系")
    if fraction and _has(r"\b(?:remaining|remainder|rest|left)\b", q):
        _append_unique(reasoning, "剩余量作为新基数")
    if _has(r"\b(?:round\w*|at least|at most|minimum|maximum|whole|full|"
            r"left over|leftover|remainder)\b", q):
        _append_unique(reasoning, "整数取舍或边界条件")
    if _has(r"\b(?:then|after|before|next|first|second|third|finally)\b", q):
        _append_unique(reasoning, "顺序变化")
    if _has(r"\b(?:both|neither|overlap)\b", q) and _has(
        r"\b(?:only|at least one|either|neither|both.*and)\b", q):
        _append_unique(reasoning, "交叉条件需核对")

    category, subcategory, components = "G01", "多阶段合并、变化与剩余", ["G01"]
    if probability or combinatorial:
        category, subcategory, components = "REVIEW", "概率、期望或赔率" if probability else "组合计数", []
    elif geometry and (percent or rate_time or average or (money and _has(r"\bper\b|\beach\b", q))):
        second = "G09" if percent else "G06" if average else "G07" if rate_time else "G02"
        category, subcategory, components = "G10", "几何量与另一类数量关系", ["G08", second]
    elif average and (percent or fraction):
        category, subcategory, components = "G10", "平均数与部分整体关系", ["G06", "G09" if percent else "G04"]
    elif rate_time and percent and _has(r"\b(?:speed|rate|per hour|per minute|overtime|"
                                       r"increase|decrease|faster|slower)\b", q):
        category, subcategory, components = "G10", "速率与百分比变化", ["G07", "G09"]
    elif geometry:
        category, subcategory, components = "G08", "矩形、正方形或几何量应用", ["G08"]
    elif average:
        category, subcategory, components = "G06", "缺失数据反求" if inverse else "总量、份数与平均数", ["G06"]
    elif percent:
        category, subcategory, components = "G09", "百分比反求" if inverse else "百分数求量与简单折扣", ["G09"]
    elif ratio:
        category, subcategory, components = "G05", "按比或份数分配", ["G05"]
    elif fraction:
        category, subcategory, components = "G04", "由部分反求整体" if inverse else "部分、整体及剩余基数", ["G04"]
    elif rate_time:
        category, subcategory, components = "G07", "时间与单位量换算" if unit_conversion else "时间、速率与工作量", ["G07"]
    elif comparison:
        category, subcategory, components = "G03", "和差、和倍或差倍反求" if inverse else "倍数与差量的顺序组合", ["G03"]
    elif money:
        category, subcategory, components = "G02", "预算、收支与余款" if _has(r"\b(?:budget|left|remaining|change|save|saving|spent)\b", q) else "单价、数量、总价", ["G02"]
    elif unit_groups and _has(r"[*/]", " ".join(_ANNOTATION.findall(answer))):
        category, subcategory, components = "G05", "等量分组与单位量", ["G05"]
    elif not question.strip() or not answer.strip():
        category, subcategory, components = "REVIEW", "源字段缺失", []
    elif not _has(r"[+\-*/]", " ".join(_ANNOTATION.findall(answer))) and not _has(
        r"\b(?:total|altogether|combined|sum|left|remaining|more|less|how many|how much)\b", q):
        category, subcategory, components = "REVIEW", "规则不能确定主关系", []

    basis.append("题面和解答共同推定主关系；情境名词仅作辅助，不代表课程年级。")
    basis.append("主分类：" + CATEGORIES[category] + ("；组合依据：" + " + ".join(components) if category == "G10" else ""))
    if inverse:
        basis.append("检测到反求未知量、方程消元或原始基数关系，不能因注记少直接列入巩固。")

    # A fraction/percent alone is not advanced.  Nontrivial inverse reference
    # changes and cross-relation work are what lift the level.
    direct_repetition = (
        estimated <= 6 and not inverse and category in {"G01", "G02", "G05", "G07"}
        and not percent and not fraction and not geometry and not comparison
        and not _has(r"\b(?:different rates|overtime|catch up|remaining .*per|"
                     r"at least|at most|minimum|maximum)\b", q)
        and (estimated <= 4 or _has(r"\b(?:total|altogether|combined|in all|"
                                   r"all (?:the|his|her|their)|make|earn)\b", target))
    )
    if inverse or "剩余量作为新基数" in reasoning:
        level = "I2" if category == "G10" or estimated >= 6 else "I1"
    elif category == "G10":
        level = "I1" if estimated <= 4 else "I2"
    elif direct_repetition or estimated <= 3:
        level = "C2"  # GSM8K remains a multi-step supplementary bank.
    elif estimated <= 4 and (percent or fraction or comparison):
        level = "C2"
    elif estimated <= 5:
        level = "I1"
    else:
        level = "I2"

    disposition = "keep"
    scope_reasons = []
    if probability:
        _append_unique(knowledge, "概率、期望或赔率")
        scope_reasons.append("涉及概率、期望或赔率，超出本次小学文字题首版范围。")
    if combinatorial:
        _append_unique(knowledge, "乘法原理与组合计数")
        scope_reasons.append("组合计数没有对应本次既定 G01–G10 范围，保留为拓展候选；不据此宣称全部小学均不适用。")
    if finance:
        _append_unique(knowledge, "金融计息或税费约定")
        scope_reasons.append("税费、贷款或计息需要额外约定，作为拓展候选保留。")
    if advanced_geometry:
        scope_reasons.append("超出首版矩形、正方形生活计算的几何知识。")
    if cooperative_reciprocals:
        _append_unique(knowledge, "合作效率倒数关系")
        scope_reasons.append("合作效率的倒数相加需要单独教学设计。")
    if complex_equations:
        scope_reasons.append("涉及复杂联立关系或超出首版的一般代数求解。")
    if estimated >= 7 and annotated >= 7:
        scope_reasons.append("解说和算术注记均显示至少七步，需单独压缩和教学复核；冗长的一元代数解说不单凭行数触发此项。")
    if percent and (
        len(re.findall(r"\d+(?:\.\d+)?\s*(?:%|percent)", q)) >= 3
        and _has(r"\b(?:increase\w*|decrease\w*|discount\w*|remaining|then|after)\b", q)
        or _has(r"\b(?:compound\w*|consecutive|each year|every year)\b", q)
           and _has(r"\b(?:increase|decrease|interest|growth|return)\b", q)
    ):
        scope_reasons.append("连续百分比或复合变动超出简单折扣的首版范围。")
    if scope_reasons:
        level, disposition = "extension", "hold"
        _append_unique(flags, "out_of_primary_scope")
        evidence.append(_evidence("out_of_primary_scope", " ".join(scope_reasons)))
    if category == "REVIEW":
        _append_unique(flags, "needs_taxonomy_review")
        evidence.append(_evidence("needs_taxonomy_review", "未强行归入 G10；需要补充分类或专门拓展范围。"))
        disposition = "hold"

    # These are adaptation prompts, not assertions that the arithmetic is wrong.
    adult_context = _has(
        r"\b(?:wine|vodka|whiskey|cigarettes?|cigars?|tobacco|cocaine|casino|"
        r"roulette|blackjack|lottery|gambling|loan shark|drunk drivers?)\b"
        r"|(?<!root )\bbeer\b", q)
    violent_context = _has(
        r"\b(?:murder\w*|homicide|graves?|corpse|pistols?|bullets?|ammunition)\b"
        r"|\b(?:to kill you|killed by|killing an enemy|pepper.sprays?)\b", q)
    if adult_context or violent_context:
        _append_unique(flags, "context_adaptation_required")
        evidence.append(_evidence(
            "context_adaptation_required", "自动检出酒类、赌博或伤害情境；发布前应改写为适宜儿童的普通情境。"))
        if disposition == "keep":
            disposition = "adapt"

    if (arithmetic["mismatches"] or arithmetic["rounding_candidates"] or
            arithmetic["final_status"] != "numeric" or prose_arithmetic["mismatch_candidates"]):
        disposition = "hold"

    review_status = "automated_rule_inference"
    override = _overrides().get(record.get("source_id", ""))
    if override:
        review_status = "content_reviewed_by_assistant"
        for key, current in (("category", category), ("subcategory", subcategory), ("level", level)):
            if key in override:
                if key == "category":
                    category = override[key]
                elif key == "subcategory":
                    subcategory = override[key]
                else:
                    level = override[key]
        if "category_components" in override:
            components = override["category_components"]
        elif "category" in override and category != "G10":
            components = [] if category == "REVIEW" else [category]
        for flag in override.get("remove_flags", []):
            flags = [item for item in flags if item != flag]
            evidence = [item for item in evidence if item["flag"] != flag]
        for flag in override.get("flags", []):
            _append_unique(flags, flag)
        if override.get("quality_evidence"):
            evidence.extend(override["quality_evidence"])
        elif override.get("reason"):
            evidence.extend(_evidence(flag, override["reason"], "confirmed")
                            for flag in override.get("flags", []))
        _append_unique(knowledge, *override.get("knowledge_tags", []))
        _append_unique(reasoning, *override.get("reasoning_tags", []))
        disposition = override.get("disposition_hint", disposition)
        basis.append("逐题例外记录：" + override.get("reason", "参见 gsm8k_overrides.json。"))
    if "out_of_primary_scope" in flags and disposition == "adapt":
        disposition = "hold"
    basis[1] = "主分类：" + CATEGORIES[category] + (
        "；组合依据：" + " + ".join(components) if category == "G10" else ""
    )

    # The build layer preserves source test records outside the default
    # recommendation pool.  This is not a mathematical quality judgment.
    split_policy = "test_candidate_only" if record.get("source_split") == "test" else "train_primary_candidate"
    basis.append(f"算术注记 {annotated} 条；解说步骤粗估 {estimated}，不作为单一分级标准。")
    return {
        "category": category,
        "category_name": CATEGORIES[category],
        "category_components": components,
        "subcategory": subcategory,
        "level": level,
        "knowledge_tags": knowledge,
        "reasoning_tags": reasoning,
        "quality_flags": flags,
        "quality_evidence": evidence,
        "classification_basis": basis,
        "classification_version": CLASSIFIER_VERSION,
        "review_status": review_status,
        "classification_status": "assistant_reviewed_exception" if override else "auto_provisional",
        "disposition_hint": disposition,
        "source_split_policy": split_policy,
        "operation_count": annotated,
        "estimated_step_count": estimated,
        "estimate_method": estimate_method,
        "arithmetic_check": arithmetic,
        "prose_arithmetic_check": prose_arithmetic,
        "publish_allowed": False,
    }
