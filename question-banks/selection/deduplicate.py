"""Conservative text deduplication and inferred assessment families.

``annotate(records, prefer_key=None)`` returns ``records``, ``groups`` and
``summary``.  It never changes selection decisions or input dictionaries.  A
record is identified by ``bank:source_id``.  ``duplicate_group`` is scoped to
the ASDiv/SVAMP pool or the separate GSM8K pool; ``assessment_group_id`` can
cross those pools so a later assessment can avoid text-family leakage.

An assessment family is an *inference from text*, not a source lineage claim.
Only an identical normalised question, or an identical number/name template
with compatible operand roles, is marked redundant.  Different questions,
unknown positions and condition patterns remain semantic variants.  Equal
arithmetic operator strings alone never establish a family or a duplicate.

The fuzzy search uses bounded rare-shingle postings and at most 48 candidates
per body.  Families are stars around an anchor, not transitive connected
components.  This deliberately favours precision over exhaustive recall.
No source question text is included in the returned group evidence.
"""

from __future__ import annotations

import ast
import hashlib
import html
import re
import unicodedata
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from difflib import SequenceMatcher
from typing import Callable, Iterable


METHOD_VERSION = "text-family-v2"
MAX_POSTING = 128
MAX_SHINGLES = 10
MAX_CANDIDATES = 48

_WORD_NUMBERS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40,
    "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80,
    "ninety": 90, "hundred": 100, "thousand": 1000,
    "million": 1000000,
}
_PROTECTED = set("""
    a an the this that those these each every all another some any no not
    how what which who whose when where why if after before during while
    then now there here it its he she his her him they them their we our
    you your i my me one two three four five six seven eight nine ten
    monday tuesday wednesday thursday friday saturday sunday january
    february march april may june july august september october november
    december christmas halloween easter thanksgiving valentine ramadan
    mr mrs ms miss dr sir am pm a.m p.m us usa uk u.s tv dvd dvds cd cds
    cm mm km m kg ml l mph kph ft usd cad eur gbp celsius fahrenheit
    north south east west northeast northwest southeast southwest
    english french spanish chinese american european indian australian
    algebra geometry arithmetic math mathematics science history social
    studies physical education pi gcd lcm abc abcd pqrs xyz ufo iq gps
""".split()) | set(_WORD_NUMBERS)
_AMBIGUOUS_NAMES = set("bill will rose mark chase grace dawn hope faith grant pat summer hunter chuck art".split())
_STOP = set("""
    a an the is are was were be been being has have had do does did will
    would can could should of to for from in on at with by and or but as
    than that this these those there here it its he she his her him they
    their them we our you your i my me if then each every some all any
    many much how what which who whose when where so also now after
    before into out up down per total together altogether more less
    left both other another one two three four five six seven eight nine
    ten p0 p1 p2 p3 p4 p5 p6 p7 p8 p9
""".split())
# These words can change the relation even when only one word differs.
_RELATION_WORDS = set("""
    more fewer less extra remaining remain left lost lose spent spend
    sold sell bought buy gave give received receive increase decreased
    decrease increased initial initially start started beginning final
    end finished altogether total combined together difference twice
    half double triple times ratio each per equal equally evenly not
    except including excluding before after first last rest remainder
    most least minimum maximum complete full additional another
""".split())
_OBJECT_PROTECTED = _PROTECTED | _STOP | _RELATION_WORDS | set("""
    dollar dollars cent cents penny pennies nickel nickels dime dimes
    pound pounds ounce ounces gram grams kilogram kilograms ton tons
    inch inches foot feet yard yards mile miles meter meters metre metres
    centimeter centimeters centimetre centimetres kilometre kilometres
    liter liters litre litres milliliter milliliters gallon gallons
    second seconds minute minutes hour hours day days week weeks month
    months year years decade decades century centuries percent percentage
    square squares rectangle rectangles triangle triangles circle circles
    radius diameter area perimeter volume length width height degrees
    side sides angle angles rate rates speed distance
""".split())
_TOKEN = re.compile(r"\d+(?:\.\d+)?(?:/\d+(?:\.\d+)?)?|[A-Za-z]+(?:'[A-Za-z]+)?|[%$£€:+*/=<>-]")
_NUMBER = re.compile(r"^\d+(?:\.\d+)?(?:/\d+(?:\.\d+)?)?$")


def _hash(value: str, prefix: str) -> str:
    return prefix + hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def _text(value: object) -> str:
    text = unicodedata.normalize("NFKC", html.unescape(str(value or "")))
    text = text.translate(str.maketrans({"’": "'", "‘": "'", "−": "-", "–": "-", "×": "*", "÷": "/"}))
    return re.sub(r"(?<=\d),(?=\d{3}(?:\D|$))", "", text)


def _ref(record: dict) -> str:
    return f"{record['bank']}:{record['source_id']}"


def _scope(record: dict) -> str:
    return "gsm8k" if record["bank"] == "gsm8k" else "foundation"


def _default_preference(record: dict) -> tuple:
    decision = record.get("decision", "selected")
    severity = {"selected": 0, "candidate": 0, "keep": 0, "adapt": 1,
                "reserve": 1, "review": 2, "hold": 2,
                "excluded": 3, "reject": 3}.get(decision, 1)
    flags = record.get("quality_flags") or []
    return severity, len(flags), {"asdiv": 0, "svamp": 1, "gsm8k": 2}.get(record["bank"], 3), _ref(record)


def _source_order_key(record: dict) -> tuple:
    """Canonical source order, independent of quality or curriculum labels."""
    identifier = str(record["source_id"])
    suffix = re.search(r"(\d+)$", identifier)
    split = record.get("source_split", identifier.split("-", 1)[0])
    return ({"asdiv": 0, "svamp": 1, "gsm8k": 2}.get(record["bank"], 3),
            {"train": 0, "test": 1}.get(split, 0),
            int(suffix.group()) if suffix else 0, _ref(record))


def _split(record: dict) -> tuple[str, str]:
    body, question = _text(record.get("body", "")), _text(record.get("question", ""))
    if body:
        return body.strip(), question.strip()
    # GSM8K stores the whole problem in ``question``.  Keep its last question
    # sentence separate; do not interpret the answer rationale as a story.
    cuts = list(re.finditer(r"(?<=[.!?])\s+(?=[A-Z])", question))
    for match in reversed(cuts):
        tail = question[match.end():]
        if "?" in tail or re.match(r"(?:How|What|Find|Calculate|Determine)\b", tail):
            return question[:match.start()].strip(), tail.strip()
    match = re.search(r"\b(?:How many|How much|How long|How far|What is|What are)\b", question)
    if match and match.start() > 0:
        return question[:match.start()].strip(), question[match.start():].strip()
    return question.strip(), question.strip()


def _name_lexicon(parts: list[tuple[str, str]]) -> set[str]:
    upper, lower, medial = Counter(), Counter(), Counter()
    for body, question in parts:
        for text in (body, question):
            for match in re.finditer(r"[A-Za-z]+(?:'[A-Za-z]+)?", text):
                word = match.group().removesuffix("'s")
                key = word.lower()
                if len(word) < 2 or key in _PROTECTED or word.isupper():
                    continue
                if word[0].isupper():
                    upper[key] += 1
                    before = text[:match.start()].rstrip()
                    if before and before[-1] not in ".!?":
                        medial[key] += 1
                else:
                    lower[key] += 1
    # A capitalised mid-sentence occurrence is evidence of a name.  This
    # avoids anonymising ordinary sentence-initial nouns and math vocabulary.
    return {word for word, count in upper.items()
            if medial[word] and count > lower[word] * 4
            and word not in _STOP | _RELATION_WORDS | {"however", "therefore", "finally"}} | _AMBIGUOUS_NAMES


def _number_key(value: str | int | float) -> str:
    try:
        if "/" in str(value):
            numerator, denominator = str(value).split("/", 1)
            return format((Decimal(numerator) / Decimal(denominator)).normalize(), "f") if Decimal(denominator) else str(value)
        number = Decimal(str(value))
        return format(number.normalize(), "f")
    except (InvalidOperation, ValueError, ZeroDivisionError):
        return str(value)


def _number_word_value(words: list[str]) -> int:
    total = part = 0
    for word in words:
        value = _WORD_NUMBERS[word]
        if value == 100:
            part = max(1, part) * value
        elif value >= 1000:
            total += max(1, part) * value
            part = 0
        else:
            part += value
    return total + part


def _normalise(body: str, question: str, names: set[str]) -> dict:
    entities: dict[str, str] = {}
    quantities: list[str] = []
    domains: set[str] = set()
    used_names = False
    exact_parts, template_parts = [], []
    for text in (body, question):
        raw = _TOKEN.findall(text)
        exact_parts.append(tuple(token.lower() for token in raw))
        template, index = [], 0
        while index < len(raw):
            token = raw[index]
            key = token.lower()
            if _NUMBER.fullmatch(token):
                quantities.append(_number_key(token))
                template.append("#")
                domains.add("fraction" if "/" in token else "decimal" if "." in token and not Decimal(token) == Decimal(token).to_integral_value() else "integer")
            elif key in _WORD_NUMBERS:
                words = [key]
                while index + 1 < len(raw):
                    nxt = raw[index + 1].lower()
                    if (nxt == "and" and any(_WORD_NUMBERS[word] >= 100 for word in words)
                            and index + 2 < len(raw) and raw[index + 2].lower() in _WORD_NUMBERS):
                        index += 1
                        nxt = raw[index + 1].lower()
                    if (nxt == "-" and index + 2 < len(raw) and raw[index + 2].lower() in _WORD_NUMBERS
                            and (_WORD_NUMBERS[words[-1]] >= 20 or _WORD_NUMBERS[raw[index + 2].lower()] >= 100)):
                        index += 1
                        nxt = raw[index + 1].lower()
                    if nxt not in _WORD_NUMBERS:
                        break
                    # Do not swallow "two three", "two twenty-dollar
                    # bills", or two successive tens as one cardinal.
                    if (_WORD_NUMBERS[nxt] < 100 and _WORD_NUMBERS[words[-1]] < 20
                            or 10 <= _WORD_NUMBERS[nxt] < 100 and _WORD_NUMBERS[words[-1]] < 100):
                        break
                    words.append(nxt)
                    index += 1
                quantities.append(str(_number_word_value(words)))
                template.append("#")
                domains.add("integer")
            else:
                root = key.removesuffix("'s")
                if token[0].isupper() and root in names and root not in _PROTECTED:
                    if root not in entities:
                        entities[root] = f"p{len(entities)}"
                    template.append(entities[root] + ("'s" if key.endswith("'s") else ""))
                    used_names = True
                else:
                    template.append(key)
                if key == "%" or key in {"percent", "percentage"}:
                    domains.add("percent")
                if key in {"half", "halves", "third", "thirds", "quarter", "quarters"}:
                    domains.add("fraction-word")
            index += 1
        template_parts.append(tuple(template))
    gender_pronouns = tuple(token.lower() for text in (body, question) for token in _TOKEN.findall(text)
                            if token.lower() in {"he", "she"})
    if len(entities) == 1:
        # A one-person story keeps the same referent when its name and
        # he/she pronoun change.  Multiple-person stories retain pronouns,
        # where gender can disambiguate the referent.
        template_parts = [tuple("person_subject" if token in {"he", "she"} else token for token in part)
                          for part in template_parts]
    tokens = template_parts[0]
    content = tuple(token for token in tokens
                    if token not in _STOP and token != "#" and re.search(r"[a-z]", token)
                    and not re.fullmatch(r"p\d+(?:'s)?", token))
    full = tokens + ("|",) + template_parts[1]
    counts = Counter(full)
    counted_objects = set()
    # A repeated noun immediately following a quantity can be a cosmetic
    # story substitution (balls/apples/plums).  Keep units, mathematical
    # terms, relation words and the binding of different objects intact.
    for position, token in enumerate(tokens):
        if token != "#":
            continue
        for nxt in tokens[position + 1:position + 4]:
            if nxt in {"more", "fewer", "less"}:
                continue
            if nxt in _OBJECT_PROTECTED or not re.fullmatch(r"[a-z]+", nxt):
                break
            if counts[nxt] >= 2:
                counted_objects.add(nxt)
            # A short counted noun phrase may include an adjective.
            if nxt.endswith("s"):
                break
    object_names = {}
    surface = []
    for token in full:
        if token in counted_objects:
            object_names.setdefault(token, f"o{len(object_names)}")
            surface.append(object_names[token])
        else:
            surface.append(token)
    separator = len(tokens)
    return {
        "exact": exact_parts[0] + exact_parts[1],
        "body": tokens, "question": template_parts[1],
        "full": full,
        "surface_full": tuple(surface), "surface_question": tuple(surface[separator + 1:]),
        "object_sequence": tuple(object_names),
        "content": content, "content_set": frozenset(content),
        "quantities": quantities, "domains": tuple(sorted(domains)),
        "names_normalised": used_names, "name_sequence": tuple(entities),
        "gender_pronouns": gender_pronouns,
    }


def _operand_roles(record: dict, norm: dict) -> str:
    expression = str(record.get("formula") or record.get("equation") or "").split("=", 1)[0].strip()
    if not expression or not re.fullmatch(r"[\d.()+*/\-\s]+", expression):
        return "unknown"
    try:
        tree = ast.parse(expression, mode="eval")
    except (SyntaxError, ValueError, MemoryError):
        return "unknown"
    if sum(1 for _ in ast.walk(tree)) > 80:
        return "unknown"
    values = norm["quantities"]
    operators = {ast.Add: "+", ast.Sub: "-", ast.Mult: "*", ast.Div: "/", ast.FloorDiv: "//", ast.Mod: "%", ast.Pow: "**"}

    def visit(node: ast.AST) -> str:
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            value = _number_key(node.value)
            indices = [str(i) for i, item in enumerate(values) if item == value]
            return "n" + ",".join(indices) if indices else "c" + value
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
            return ("-" if isinstance(node.op, ast.USub) else "+") + visit(node.operand)
        if isinstance(node, ast.BinOp) and type(node.op) in operators:
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, (ast.Add, ast.Mult)):
                left, right = sorted((left, right))
            return f"({left}{operators[type(node.op)]}{right})"
        raise ValueError("not a numeric expression")

    try:
        return visit(tree.body)
    except (ValueError, RecursionError):
        return "unknown"


def _answer_key(record: dict) -> str:
    answer = str(record.get("answer", "")).strip()
    if "####" in answer:
        answer = answer.rsplit("####", 1)[1].strip()
    return " ".join(_TOKEN.findall(_text(answer).lower()))


def _shingles(tokens: tuple[str, ...]) -> set[tuple[str, ...]]:
    return {tokens[i:i + 3] for i in range(len(tokens) - 2)}


def _family_similarity(left: dict, right: dict) -> tuple[bool, float]:
    if left["body"] == right["body"]:
        return True, 1.0
    if (left["surface_full"] == right["surface_full"]
            and left["object_sequence"] != right["object_sequence"]
            and len(left["body"]) >= 8):
        return True, round(SequenceMatcher(None, left["body"], right["body"], autojunk=False).ratio(), 6)
    a, b = left["content_set"], right["content_set"]
    if min(len(a), len(b)) < 6:
        return False, 0.0
    common = len(a & b)
    jaccard = common / len(a | b)
    containment = common / min(len(a), len(b))
    if common < 6 or jaccard < .62 or containment < .82:
        return False, 0.0
    ratio = SequenceMatcher(None, left["body"], right["body"], autojunk=False).ratio()
    if ratio < .76:
        return False, ratio
    # Similarity measures support a probable shared story, never lineage.
    return True, round(ratio, 6)


def annotate(records: Iterable[dict], prefer_key: Callable[[dict], object] | None = None) -> dict:
    """Annotate all locked-source records without selecting or deleting them.

    Optional ``prefer_key`` follows ``sorted(key=...)`` semantics (lower wins).
    ``quality_flags`` and current decisions are respected by the default key.
    Each non-representative ``duplicate_of`` names a record in the same pool.
    Different ``semantic_variant_id`` values in one assessment group should
    be considered for intentional comparison practice, not blindly removed.
    """
    rows = [dict(record) for record in records]
    keys = [_ref(row) for row in rows]
    if len(set(keys)) != len(keys):
        raise ValueError("bank:source_id must be unique")
    preference = prefer_key or _default_preference
    preferred_order = sorted(range(len(rows)), key=lambda i: (preference(rows[i]), keys[i]))
    rank = {index: position for position, index in enumerate(preferred_order)}
    source_order = sorted(range(len(rows)), key=lambda i: _source_order_key(rows[i]))
    source_rank = {index: position for position, index in enumerate(source_order)}
    parts = [_split(row) for row in rows]
    names = _name_lexicon(parts)
    normalised = [_normalise(body, question, names) for body, question in parts]
    roles = [_operand_roles(row, norm) for row, norm in zip(rows, normalised)]
    answer_keys = [_answer_key(row) for row in rows]

    # Exact-body atoms keep all questions about an identical story together.
    atoms_by_body = defaultdict(list)
    for index in source_order:
        atoms_by_body[normalised[index]["body"]].append(index)
    atoms = sorted(atoms_by_body.values(), key=lambda group: source_rank[group[0]])
    representatives = [group[0] for group in atoms]
    atom_shingles = [_shingles(normalised[i]["content"]) for i in representatives]
    postings = defaultdict(list)
    surface_postings = defaultdict(list)
    for atom, shingles in enumerate(atom_shingles):
        for shingle in shingles:
            postings[shingle].append(atom)
        surface_postings[normalised[representatives[atom]]["surface_full"]].append(atom)
    family_for_atom, families, anchor_scores = {}, {}, {}
    comparisons = candidate_pairs = 0
    for atom, index in enumerate(representatives):
        rare = sorted((shingle for shingle in atom_shingles[atom] if len(postings[shingle]) <= MAX_POSTING),
                      key=lambda item: (len(postings[item]), item))[:MAX_SHINGLES]
        counts = Counter(candidate for shingle in rare for candidate in postings[shingle] if candidate < atom)
        # Direct template lookups also cover short stories with few content
        # words.  Take only a bounded prefix; the first is the shared anchor.
        for candidate in surface_postings[normalised[index]["surface_full"]][:MAX_CANDIDATES]:
            if candidate < atom:
                counts[candidate] += MAX_SHINGLES + 1
        candidates = sorted(counts, key=lambda candidate: (-counts[candidate], candidate))[:MAX_CANDIDATES]
        candidate_pairs += len(candidates)
        checked, best_anchor, best_score = set(), None, -1.0
        for candidate in candidates:
            anchor = family_for_atom[candidate]
            if anchor in checked:
                continue
            checked.add(anchor)
            comparisons += 1
            compatible, score = _family_similarity(normalised[index], normalised[representatives[anchor]])
            if compatible and score > best_score:
                best_anchor, best_score = anchor, score
        if best_anchor is None:
            best_anchor, best_score = atom, 1.0
            families[atom] = []
        family_for_atom[atom] = best_anchor
        families[best_anchor].extend(atoms[atom])
        for member in atoms[atom]:
            anchor_scores[member] = best_score

    group_reports = []
    duplicate_counts = Counter()
    duplicate_by_bank = defaultdict(Counter)
    exact_conflicts = []
    all_duplicate_groups = []

    for anchor, unsorted_members in families.items():
        members = sorted(unsorted_members, key=lambda index: rank[index])
        family_key = "|".join(sorted(keys[index] for index in members))
        story_id = _hash(family_key, "story-")
        assessment_id = _hash(family_key, "assessment-")
        variant_members, duplicate_members = defaultdict(list), defaultdict(list)
        exact_members = defaultdict(list)
        for index in members:
            row, norm = rows[index], normalised[index]
            # The question and numeric role positions preserve requested
            # quantities.  Conditions distinguish same-question edits too.
            condition_terms = tuple(sorted(set(norm["body"]) & _RELATION_WORDS))
            variant_key = repr((norm["surface_question"], roles[index], norm["domains"],
                                len(norm["quantities"]), condition_terms))
            variant_id = _hash(story_id + variant_key, "variant-")
            variant_members[variant_id].append(index)
            duplicate_key = (_scope(row), norm["full"], roles[index], norm["domains"])
            duplicate_members[duplicate_key].append(index)
            exact_members[(_scope(row), norm["exact"])].append(index)
            row.update({
                "source_lineage_id": row.get("source_lineage_id") or "unknown",
                "story_family_id": story_id,
                "assessment_group_id": assessment_id,
                "semantic_variant_id": variant_id,
                "family_basis": "inferred-text-similarity",
                "family_anchor": keys[representatives[anchor]],
                "preferred_family_representative": keys[members[0]],
                "family_confidence": round(anchor_scores[index], 4),
                "duplicate_group": None, "duplicate_of": None,
                "duplicate_type": "none", "duplicate_confidence": None,
                "story_variant": "unique" if len(members) == 1 else "semantic_variant",
            })

        if len(members) > 1:
            for same_target in variant_members.values():
                for position, index in enumerate(same_target):
                    rows[index]["story_variant"] = ("family_representative" if index == members[0]
                                                    else "semantic_variant" if position == 0
                                                    else "same_target_variant")

        # Conflicting answers for literally identical text need review, not
        # automatic duplicate removal.  Keep this guard independent of tags.
        conflict_indices = set()
        for same_text in exact_members.values():
            if len(same_text) > 1 and len({answer_keys[i] for i in same_text}) > 1:
                conflict_indices.update(same_text)
                exact_conflicts.append([keys[i] for i in same_text])
                for index in same_text:
                    rows[index]["quality_flags"] = list(dict.fromkeys([*(rows[index].get("quality_flags") or []), "duplicate-answer-conflict"]))
                    rows[index]["story_variant"] = "answer_conflict"

        family_duplicate_groups = []
        for same_template in duplicate_members.values():
            same_template = [index for index in same_template if index not in conflict_indices]
            if len(same_template) < 2:
                continue
            head = same_template[0]
            duplicate_id = _hash("|".join(sorted(keys[index] for index in same_template)), "duplicate-")
            exact_heads = {}
            for index in same_template:
                exact_key = normalised[index]["exact"]
                exact_head = exact_heads.setdefault(exact_key, index)
                if index == head:
                    kind, target, confidence = "representative", None, None
                elif exact_head != index:
                    kind, target, confidence = "exact", keys[exact_head], 1.0
                else:
                    kind = "name_numeric_variant" if (normalised[index]["name_sequence"], normalised[index]["gender_pronouns"]) != (normalised[head]["name_sequence"], normalised[head]["gender_pronouns"]) else "numeric_variant"
                    target, confidence = keys[head], .98
                rows[index].update({"duplicate_group": duplicate_id, "duplicate_of": target,
                                    "duplicate_type": kind, "duplicate_confidence": confidence})
                if target:
                    rows[index]["story_variant"] = "exact_copy" if kind == "exact" else "numeric_or_name_variant"
                    duplicate_counts[kind] += 1
                    duplicate_by_bank[rows[index]["bank"]][kind] += 1
            entry = {
                "id": duplicate_id, "scope": _scope(rows[head]),
                "representative": keys[head], "members": [keys[index] for index in same_template],
                "evidence": "identical-full-number-name-template-and-compatible-operand-roles",
                "template_fingerprint": _hash(repr(normalised[head]["full"]), "sha256-"),
                "normalised_operand_roles": roles[head],
                "numeric_domains": list(normalised[head]["domains"]),
                "exact_duplicate_count": sum(rows[index]["duplicate_type"] == "exact" for index in same_template),
            }
            family_duplicate_groups.append(entry)
            all_duplicate_groups.append(entry)

        if len(members) > 1:
            banks = sorted({rows[index]["bank"] for index in members})
            scopes = sorted({_scope(rows[index]) for index in members})
            splits = sorted({rows[index].get("source_split", str(rows[index]["source_id"]).split("-", 1)[0]) for index in members if rows[index]["bank"] == "gsm8k"})
            group_reports.append({
                "id": assessment_id, "story_family_id": story_id,
                "basis": "inferred-text-similarity", "lineage_verified": False,
                "anchor": keys[representatives[anchor]],
                "preferred_representative": keys[members[0]],
                "members": [keys[index] for index in members],
                "banks": banks, "scopes": scopes, "gsm8k_source_splits": splits,
                "cross_bank": len(banks) > 1, "cross_pool": len(scopes) > 1,
                "gsm8k_train_test_overlap": "train" in splits and "test" in splits,
                "minimum_anchor_similarity": round(min(anchor_scores[index] for index in members), 4),
                "body_template_count": len({normalised[index]["body"] for index in members}),
                "counted_object_template_count": len({normalised[index]["surface_full"] for index in members}),
                "semantic_variant_count": len(variant_members),
                "semantic_variants": [{"id": variant_id, "members": [keys[index] for index in indices]} for variant_id, indices in sorted(variant_members.items())],
                "duplicate_groups": family_duplicate_groups,
            })

    family_counts = Counter(len(members) for members in families.values())
    families_by_bank = {}
    for bank in sorted({row["bank"] for row in rows}):
        counts = Counter(row["assessment_group_id"] for row in rows if row["bank"] == bank)
        families_by_bank[bank] = {
            "record_count": sum(counts.values()), "family_count": len(counts),
            "non_singleton_family_count": sum(size > 1 for size in counts.values()),
            "members_in_non_singleton_families": sum(size for size in counts.values() if size > 1),
            "largest_family_size": max(counts.values(), default=0),
        }
    summary = {
        "method_version": METHOD_VERSION, "record_count": len(rows),
        "assessment_family_count": len(families),
        "non_singleton_family_count": len(group_reports),
        "singleton_count": family_counts[1],
        "families_by_bank": families_by_bank,
        "family_size_distribution": {str(size): count for size, count in sorted(family_counts.items())},
        "duplicate_group_count": len(all_duplicate_groups),
        "redundant_copies_by_type": dict(sorted(duplicate_counts.items())),
        "redundant_copies_by_bank": {bank: dict(sorted(counts.items())) for bank, counts in sorted(duplicate_by_bank.items())},
        "cross_bank_family_count": sum(group["cross_bank"] for group in group_reports),
        "asdiv_svamp_family_count": sum("asdiv" in group["banks"] and "svamp" in group["banks"] for group in group_reports),
        "cross_pool_family_count": sum(group["cross_pool"] for group in group_reports),
        "gsm8k_train_test_family_count": sum(group["gsm8k_train_test_overlap"] for group in group_reports),
        "cross_pool_family_ids": [group["id"] for group in group_reports if group["cross_pool"]],
        "gsm8k_train_test_family_ids": [group["id"] for group in group_reports if group["gsm8k_train_test_overlap"]],
        "exact_text_answer_conflicts": exact_conflicts,
        "candidate_search": {"max_posting_length": MAX_POSTING, "rarest_shingles_per_body": MAX_SHINGLES,
                             "max_candidates_per_body": MAX_CANDIDATES, "candidate_pairs": candidate_pairs,
                             "anchor_comparisons": comparisons, "body_atom_count": len(atoms),
                             "clustering_order": "bank-asdiv-svamp-gsm8k_then_train-test_then_numeric-source-id",
                             "preference_affects_clustering": False},
        "limitations": [
            "Families are inferred from lexical evidence; unverified source lineage remains unknown.",
            "Bounded lexical search favours precision and can miss extensively rewritten paraphrases.",
            "Semantic variants are retained; matching operators or categories alone are never duplicate evidence.",
            "GSM8K has separate duplicate groups; shared assessment families only disclose overlap.",
        ],
    }
    return {"records": rows, "groups": sorted(group_reports, key=lambda group: (-len(group["members"]), group["id"])), "summary": summary}
