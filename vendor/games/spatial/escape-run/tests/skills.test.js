import { test } from "node:test";
import assert from "node:assert/strict";
import { mulberry32 } from "../src/util.js";
import { SKILLS, SKILL_ORDER, generateChallenge } from "../src/skills/index.js";

function tokenKey(t) {
  if (t && typeof t === "object") {
    if (t.solid) return "solid:" + t.solid;
    if (t.pair) return "pair:" + [...t.pair].sort().join("+");
    if (t.cuts) return "part:" + t.style + ":" + t.cuts.join(",");
    if (t.shape) return "shape:" + t.shape + "|" + (t.color || ""); // shape tiles distinct by shape+colour
    return JSON.stringify(t);
  }
  return String(t);
}

test("every skill produces well-formed challenges at all levels", () => {
  for (const id of SKILL_ORDER) {
    const max = SKILLS[id].meta.maxLevel;
    for (let level = 1; level <= max; level++) {
      const rng = mulberry32(level * 1000 + id.length);
      for (let i = 0; i < 200; i++) {
        const c = generateChallenge(id, level, rng);
        assert.equal(c.skillId, id, `${id} skillId`);
        assert.equal(c.options.length, 3, `${id} has 3 options`);
        assert.ok(c.correctIndex >= 0 && c.correctIndex < 3, `${id} correctIndex in range`);
        // options are distinct
        const keys = c.options.map(tokenKey);
        assert.equal(new Set(keys).size, 3, `${id} options distinct`);
        assert.ok(c.promptText && c.say, `${id} has prompt + say`);
      }
    }
  }
});

test("counting: correct option equals the dot count", () => {
  const rng = mulberry32(7);
  for (let i = 0; i < 300; i++) {
    const c = generateChallenge("counting", 3, rng);
    assert.equal(c.options[c.correctIndex], c.prompt.count);
    assert.ok(c.prompt.count >= 0);
  }
});

test("comparison: correct option is the extreme per mode", () => {
  const rng = mulberry32(11);
  for (let i = 0; i < 300; i++) {
    const c = generateChallenge("comparison", 4, rng);
    const target = c.prompt.mode === "bigger" ? Math.max(...c.options) : Math.min(...c.options);
    assert.equal(c.options[c.correctIndex], target);
  }
});

test("arithmetic: the expression evaluates to the correct option", () => {
  const rng = mulberry32(21);
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("arithmetic", 4, rng);
    const [a, op, b] = c.prompt.text.split(" ");
    const expected = op === "+" ? +a + +b : +a - +b;
    assert.equal(c.options[c.correctIndex], expected);
    assert.ok(expected >= 0, "no negative answers for kids");
  }
});

test("bonds: given + correct = target", () => {
  const rng = mulberry32(33);
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("bonds", 3, rng);
    assert.equal(c.prompt.given + c.options[c.correctIndex], c.prompt.target);
  }
});

test("patterning: sequence has exactly one blank and a valid answer", () => {
  const rng = mulberry32(44);
  const max = SKILLS.patterning.meta.maxLevel;
  for (let lvl = 1; lvl <= max; lvl++) {
    for (let i = 0; i < 200; i++) {
      const c = generateChallenge("patterning", lvl, rng);
      const blanks = c.prompt.sequence.filter((s) => s == null).length;
      assert.equal(blanks, 1, "one blank");
      assert.ok(c.options[c.correctIndex] != null, "answer exists");
    }
  }
});

test("arithmetic L6: doubles are 2n; halves use only even n", () => {
  const rng = mulberry32(61);
  let sawDouble = false, sawHalf = false;
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("arithmetic", 6, rng);
    assert.equal(c.prompt.type, "double");
    const ans = c.options[c.correctIndex];
    if (c.prompt.op === "double") {
      sawDouble = true;
      assert.equal(ans, c.prompt.n * 2);
      assert.ok(ans <= 20, "doubles stay within 20");
    } else {
      sawHalf = true;
      assert.equal(c.prompt.n % 2, 0, "halves of even numbers only");
      assert.equal(ans, c.prompt.n / 2);
    }
    for (const o of c.options) assert.ok(o >= 0);
  }
  assert.ok(sawDouble && sawHalf);
});

test("arithmetic L7: the hidden operand completes the equation", () => {
  const rng = mulberry32(71);
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("arithmetic", 7, rng);
    const p = c.prompt;
    assert.equal(p.type, "missing");
    seen.add(`${p.op}${p.slot}`);
    assert.equal(p.op === "+" ? p.a + p.b : p.a - p.b, p.result, "stored fact holds");
    assert.equal(c.options[c.correctIndex], p.slot === "a" ? p.a : p.b);
    assert.ok(p.text.includes("?"));
    assert.ok(p.result >= 0 && p.result <= 12 && p.a <= 12, "within 12");
    for (const o of c.options) assert.ok(o >= 0);
    assert.ok(c.pace > 0 && c.pace <= 1, "slower tiles for equations");
  }
  assert.equal(seen.size, 4, "all four op/slot forms appear");
});

test("bonds L6: bridges through ten with teen targets", () => {
  const rng = mulberry32(56);
  for (let i = 0; i < 300; i++) {
    const c = generateChallenge("bonds", 6, rng);
    assert.ok(c.prompt.target >= 11 && c.prompt.target <= 16, "teen target");
    assert.ok(c.prompt.given >= 5 && c.prompt.given <= 9, "given bridges ten");
    assert.equal(c.prompt.given + c.options[c.correctIndex], c.prompt.target);
  }
});

test("bonds L7: given is the tens part, answer is the ones", () => {
  const rng = mulberry32(57);
  for (let i = 0; i < 300; i++) {
    const c = generateChallenge("bonds", 7, rng);
    assert.equal(c.prompt.given % 10, 0, "given is whole tens");
    assert.ok(c.prompt.target > c.prompt.given && c.prompt.target < c.prompt.given + 10);
    assert.equal(c.prompt.given + c.options[c.correctIndex], c.prompt.target);
  }
});

test("patterning L6: constant steps, can descend, never negative", () => {
  const rng = mulberry32(66);
  let sawDown = false;
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("patterning", 6, rng);
    assert.equal(c.prompt.kind, "number");
    const seq = c.prompt.sequence.filter((s) => s != null);
    const step = seq[1] - seq[0];
    assert.notEqual(step, 0);
    for (let j = 1; j < seq.length; j++) assert.equal(seq[j] - seq[j - 1], step, "constant step");
    assert.equal(c.options[c.correctIndex], seq[seq.length - 1] + step);
    assert.ok(c.options.every((o) => o >= 0), "no negative options");
    if (step < 0) sawDown = true;
  }
  assert.ok(sawDown, "descending runs appear");
});

test("patterning L7: two attributes cycle at different lengths", () => {
  const rng = mulberry32(77);
  for (let i = 0; i < 200; i++) {
    const c = generateChallenge("patterning", 7, rng);
    const seq = c.prompt.sequence;
    assert.equal(c.prompt.kind, "shape");
    assert.equal(seq.length, 8);
    const shown = seq.filter((s) => s != null);
    assert.equal(new Set(shown.map((t) => t.shape)).size, 2, "two shapes");
    assert.equal(new Set(shown.map((t) => t.color)).size, 3, "three colours");
    // position 7 ≡ position 1 in the combined cycle of 6
    const a = c.options[c.correctIndex];
    assert.equal(`${a.shape}|${a.color}`, `${shown[1].shape}|${shown[1].color}`);
  }
});

test("counting L6–7: grouped-ten presentation with correct ranges", () => {
  for (const [lvl, lo, hi] of [[6, 10, 20], [7, 20, 40]]) {
    const rng = mulberry32(1000 + lvl);
    for (let i = 0; i < 300; i++) {
      const c = generateChallenge("counting", lvl, rng);
      assert.equal(c.prompt.grouped, 10, "rows of ten");
      assert.ok(c.prompt.count >= lo && c.prompt.count <= hi, `L${lvl} count in [${lo},${hi}]`);
      assert.equal(c.options[c.correctIndex], c.prompt.count);
    }
  }
});

test("comparison L7: includes a transposed-digit pair and stays correct", () => {
  const rng = mulberry32(1700);
  for (let i = 0; i < 300; i++) {
    const c = generateChallenge("comparison", 7, rng);
    const os = c.options;
    assert.equal(new Set(os).size, 3, "distinct");
    const hasSwap = os.some((x) =>
      os.some((y) => x !== y && Math.floor(x / 10) === y % 10 && x % 10 === Math.floor(y / 10))
    );
    assert.ok(hasSwap, "transposed pair present");
    const target = c.prompt.mode === "bigger" ? Math.max(...os) : Math.min(...os);
    assert.equal(c.options[c.correctIndex], target);
    assert.ok(os.every((o) => o >= 10), "all two-digit or more");
  }
});

// ---- L1–5 freeze ----
// Raising the level ceiling must never shift existing content underneath
// current players. These pin the L1–5 ranges and presentation.

test("freeze: counting L1–5 ranges and presentation unchanged", () => {
  const ranges = [[1, 4], [3, 6], [5, 9], [7, 14], [10, 20]];
  for (let lvl = 1; lvl <= 5; lvl++) {
    const rng = mulberry32(500 + lvl);
    for (let i = 0; i < 200; i++) {
      const c = generateChallenge("counting", lvl, rng);
      assert.equal(c.prompt.type, "dots");
      assert.equal(c.prompt.grouped, undefined, "no grouping at L1–5");
      const [lo, hi] = ranges[lvl - 1];
      assert.ok(c.prompt.count >= lo && c.prompt.count <= hi, `L${lvl} count in [${lo},${hi}]`);
    }
  }
});

test("freeze: arithmetic L1–5 stays within 20 and uses expr prompts", () => {
  for (let lvl = 1; lvl <= 5; lvl++) {
    const rng = mulberry32(600 + lvl);
    for (let i = 0; i < 200; i++) {
      const c = generateChallenge("arithmetic", lvl, rng);
      assert.equal(c.prompt.type, "expr");
      const ans = c.options[c.correctIndex];
      assert.ok(ans >= 0 && ans <= 20, `L${lvl} answer within 20`);
    }
  }
});

test("freeze: comparison L1–5 ranges unchanged", () => {
  const ranges = [[1, 9], [1, 20], [5, 50], [10, 99], [20, 200]];
  for (let lvl = 1; lvl <= 5; lvl++) {
    const rng = mulberry32(700 + lvl);
    for (let i = 0; i < 200; i++) {
      const c = generateChallenge("comparison", lvl, rng);
      assert.equal(c.prompt.type, "compare");
      const [lo, hi] = ranges[lvl - 1];
      for (const o of c.options) assert.ok(o >= lo && o <= hi, `L${lvl} option in [${lo},${hi}]`);
    }
  }
});

test("freeze: bonds L1–5 targets unchanged", () => {
  const allowed = [[5], [10], [10], [10, 20], [20]];
  for (let lvl = 1; lvl <= 5; lvl++) {
    const rng = mulberry32(800 + lvl);
    for (let i = 0; i < 200; i++) {
      const c = generateChallenge("bonds", lvl, rng);
      assert.ok(allowed[lvl - 1].includes(c.prompt.target), `L${lvl} target`);
    }
  }
});

test("freeze: patterning L1–2 shapes, L3–5 ascending numbers", () => {
  for (let lvl = 1; lvl <= 5; lvl++) {
    const rng = mulberry32(900 + lvl);
    for (let i = 0; i < 200; i++) {
      const c = generateChallenge("patterning", lvl, rng);
      assert.equal(c.prompt.kind, lvl <= 2 ? "shape" : "number");
      if (c.prompt.kind === "number") {
        const seq = c.prompt.sequence.filter((s) => s != null);
        assert.ok(seq[1] > seq[0], "ascending at L3–5");
      }
    }
  }
});

// ---- Super Groups (× ÷) ----
test("groups L1–3: equal groups, correct = bags × per", () => {
  for (let lvl = 1; lvl <= 3; lvl++) {
    const rng = mulberry32(1400 + lvl);
    for (let i = 0; i < 300; i++) {
      const c = generateChallenge("groups", lvl, rng);
      assert.equal(c.prompt.type, "groups");
      assert.equal(c.options[c.correctIndex], c.prompt.bags * c.prompt.per);
      assert.ok(c.prompt.bags >= 2 && c.prompt.per >= 2);
      if (lvl >= 2) assert.ok(c.prompt.text, "caption shown");
    }
  }
});

test("groups L4–5,7: symbolic × ÷ / missing factor stay consistent", () => {
  for (const lvl of [4, 5, 7]) {
    const rng = mulberry32(1500 + lvl);
    for (let i = 0; i < 300; i++) {
      const c = generateChallenge("groups", lvl, rng);
      assert.equal(c.prompt.type, "gtext");
      const ans = c.options[c.correctIndex];
      const t = c.prompt.text;
      let m;
      if ((m = t.match(/^(\d+) × (\d+) = \?$/))) assert.equal(ans, +m[1] * +m[2]);
      else if ((m = t.match(/^\? × (\d+) = (\d+)$/))) assert.equal(ans * +m[1], +m[2]);
      else if ((m = t.match(/^(\d+) ÷ (\d+) = \?$/))) assert.equal(ans, +m[1] / +m[2]);
      else assert.fail("unexpected gtext: " + t);
      for (const o of c.options) assert.ok(o >= 0);
    }
  }
});

test("groups L6: sharing divides evenly, correct = total ÷ plates", () => {
  const rng = mulberry32(1600);
  for (let i = 0; i < 300; i++) {
    const c = generateChallenge("groups", 6, rng);
    assert.equal(c.prompt.type, "share");
    assert.equal(c.prompt.total % c.prompt.plates, 0, "shares evenly");
    assert.equal(c.options[c.correctIndex], c.prompt.total / c.prompt.plates);
    assert.ok(c.prompt.plates >= 2);
  }
});

const SHAPE_CORNERS = { circle: 0, oval: 0, triangle: 3, square: 4, rect: 4, diamond: 4, star: 5 };

test("shapes L1–2: name prompt, correct tile shape matches the target", () => {
  for (let lvl = 1; lvl <= 2; lvl++) {
    const rng = mulberry32(1700 + lvl);
    for (let i = 0; i < 300; i++) {
      const c = generateChallenge("shapes", lvl, rng);
      assert.equal(c.prompt.type, "shapename");
      assert.equal(c.optionKind, "shape");
      assert.equal(c.options[c.correctIndex].shape, c.prompt.name);
      if (lvl === 1) {
        for (const o of c.options) assert.ok(["circle", "square", "triangle"].includes(o.shape));
      }
    }
  }
});

test("shapes L3: corners answer equals the shown shape's corner count", () => {
  const rng = mulberry32(1710);
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("shapes", 3, rng);
    assert.equal(c.prompt.type, "showshape");
    assert.equal(c.optionKind, "number");
    assert.equal(c.options[c.correctIndex], SHAPE_CORNERS[c.prompt.shape]);
  }
});

test("shapes L4: silhouette — correct tile matches the shadow shape", () => {
  const rng = mulberry32(1720);
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("shapes", 4, rng);
    assert.equal(c.prompt.type, "silhouette");
    assert.equal(c.optionKind, "shape");
    assert.equal(c.options[c.correctIndex].shape, c.prompt.shape);
  }
});

test("shapes L5: solids — each question has exactly one unambiguous answer", () => {
  const rng = mulberry32(1730);
  const ANSWER = {
    "Which is round all over?": "ball",
    "Which has only flat sides?": "box",
    "Which can roll and stack?": "can",
  };
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("shapes", 5, rng);
    assert.equal(c.prompt.type, "solidq");
    assert.equal(c.optionKind, "solid");
    assert.ok(ANSWER[c.prompt.q], "known question: " + c.prompt.q);
    assert.equal(c.options[c.correctIndex].solid, ANSWER[c.prompt.q]);
    const kinds = new Set(c.options.map((o) => o.solid));
    assert.equal(kinds.size, 3, "all three solids shown");
  }
});

test("shapes L6: equal parts — correct tile is a clean half, others are not", () => {
  const rng = mulberry32(1740);
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("shapes", 6, rng);
    assert.equal(c.optionKind, "part");
    const correct = c.options[c.correctIndex];
    assert.ok(Math.abs(correct.cuts[0] - 0.5) < 0.001, "correct is halved");
    c.options.forEach((o, i) => {
      if (i !== c.correctIndex) assert.ok(Math.abs(o.cuts[0] - 0.5) > 0.02, "distractor not halved");
    });
  }
});

test("shapes L7: compose — correct pair matches the composite's parts", () => {
  const rng = mulberry32(1750);
  const norm = (a) => [...a].sort().join("+");
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("shapes", 7, rng);
    assert.equal(c.prompt.type, "composite");
    assert.equal(c.optionKind, "pair");
    assert.equal(norm(c.options[c.correctIndex].pair), norm(c.prompt.parts));
  }
});

test("fractions L1: fair share — correct tile is the equal (½,½) cut", () => {
  const rng = mulberry32(1800);
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("fractions", 1, rng);
    assert.equal(c.optionKind, "part");
    const correct = c.options[c.correctIndex];
    assert.ok(Math.abs(correct.cuts[0] - 0.5) < 0.001);
    c.options.forEach((o, i) => {
      if (i !== c.correctIndex) assert.ok(Math.abs(o.cuts[0] - 0.5) > 0.02, "distractor is unequal");
    });
  }
});

test("fractions L2–3: named unit fraction — correct denom matches the word", () => {
  for (const [lvl, denom] of [[2, 2], [3, 4]]) {
    const rng = mulberry32(1810 + lvl);
    for (let i = 0; i < 300; i++) {
      const c = generateChallenge("fractions", lvl, rng);
      const correct = c.options[c.correctIndex];
      assert.equal(correct.cuts.length, denom, "correct has the right number of parts");
      assert.equal(correct.shaded.filter(Boolean).length, 1, "exactly one shaded part");
      const denoms = new Set(c.options.map((o) => o.cuts.length));
      assert.equal(denoms.size, 3, "three different denominators");
    }
  }
});

test("fractions L4–5: fraction of a group divides evenly, correct = total/denom", () => {
  for (const [lvl, denom] of [[4, 2], [5, 4]]) {
    const rng = mulberry32(1820 + lvl);
    for (let i = 0; i < 300; i++) {
      const c = generateChallenge("fractions", lvl, rng);
      assert.equal(c.prompt.type, "partof");
      assert.equal(c.prompt.denom, denom);
      assert.equal(c.prompt.total % denom, 0, "shares evenly");
      assert.ok(c.prompt.total <= 20, "stays within 20 (NCERT cap)");
      assert.equal(c.options[c.correctIndex], c.prompt.total / denom);
    }
  }
});

test("fractions L6: compare — biggest piece is the half (fewest cuts)", () => {
  const rng = mulberry32(1830);
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("fractions", 6, rng);
    assert.equal(c.optionKind, "part");
    assert.equal(c.options[c.correctIndex].cuts.length, 2, "correct is one half");
    const denoms = c.options.map((o) => o.cuts.length).sort();
    assert.deepEqual(denoms, [2, 3, 4], "compares ½, ⅓, ¼");
  }
});

test("fractions L7: symbols — correct label matches the shaded proportion", () => {
  const rng = mulberry32(1840);
  const correctLanes = new Set();
  const firstLaneLabels = new Set();
  for (let i = 0; i < 400; i++) {
    const c = generateChallenge("fractions", 7, rng);
    assert.equal(c.prompt.type, "partshow");
    assert.equal(c.optionKind, "frac");
    const v = c.prompt.on / c.prompt.denom;
    assert.equal(c.options[c.correctIndex].v, v);
    const labels = new Set(c.options.map((o) => o.label));
    assert.deepEqual([...labels].sort(), ["¼", "½", "¾"]);
    correctLanes.add(c.correctIndex);
    firstLaneLabels.add(c.options[0].label);
  }
  // Lanes must shuffle: the answer isn't pinned to one lane, and the symbols
  // aren't in a fixed order (otherwise a child learns position, not the symbol).
  assert.deepEqual([...correctLanes].sort(), [0, 1, 2], "answer appears in every lane");
  assert.equal(firstLaneLabels.size, 3, "the left lane shows different symbols");
});
