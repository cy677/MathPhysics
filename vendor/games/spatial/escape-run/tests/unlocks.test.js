import { test } from "node:test";
import assert from "node:assert/strict";
import { SKILL_ORDER } from "../src/skills/index.js";
import {
  BASE_UNLOCKED,
  defaultUnlockedSkills,
  isSkillUnlocked,
  unlockedSkills,
  evaluateSkillUnlocks,
} from "../src/progress/unlocks.js";

function skill(level = 1) {
  return { level, box: 1, seen: 0, correct: 0, streak: 0, miss: 0, lastPlayedDay: null, mastered: false };
}
function stateWith(levels = {}) {
  const skills = {};
  for (const id of SKILL_ORDER) skills[id] = skill(levels[id] || 1);
  return { skills, unlocks: { skills: defaultUnlockedSkills() } };
}

test("unlocks: the six base skills are open, groups & fractions start locked", () => {
  const s = stateWith();
  for (const id of BASE_UNLOCKED) assert.ok(isSkillUnlocked(s, id), `${id} open`);
  assert.ok(!isSkillUnlocked(s, "groups"));
  assert.ok(!isSkillUnlocked(s, "fractions"));
});

test("unlocks: missing unlocks list falls back to the base set", () => {
  const s = { skills: {}, unlocks: {} };
  assert.deepEqual(unlockedSkills(s).sort(), [...BASE_UNLOCKED].sort());
});

test("unlocks: Super Groups opens at Speed Math level 4", () => {
  const s = stateWith({ arithmetic: 3 });
  assert.deepEqual(evaluateSkillUnlocks(s), []); // level 3 -> still closed
  s.skills.arithmetic.level = 4;
  const opened = evaluateSkillUnlocks(s).map((m) => m.id);
  assert.deepEqual(opened, ["groups"]);
  assert.ok(isSkillUnlocked(s, "groups"));
});

test("unlocks: Fair Share opens from either door (groups L2 or shapes L6)", () => {
  const viaShapes = stateWith({ shapes: 6 });
  const a = evaluateSkillUnlocks(viaShapes).map((m) => m.id);
  assert.ok(a.includes("fractions"));

  const viaGroups = stateWith({ arithmetic: 4, groups: 2 });
  const b = evaluateSkillUnlocks(viaGroups).map((m) => m.id);
  assert.ok(b.includes("groups") && b.includes("fractions"));
});

test("unlocks: evaluation is idempotent (no repeat ceremonies)", () => {
  const s = stateWith({ arithmetic: 4 });
  assert.equal(evaluateSkillUnlocks(s).length, 1);
  assert.equal(evaluateSkillUnlocks(s).length, 0);
});
