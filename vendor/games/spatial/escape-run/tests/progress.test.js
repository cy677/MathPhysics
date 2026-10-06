import { test } from "node:test";
import assert from "node:assert/strict";
import { recordResult, masteryProgress, accuracy } from "../src/progress/mastery.js";
import { isDue, dueSkills, planMission, nextSkill } from "../src/progress/scheduler.js";
import { skillMeta, SKILL_ORDER } from "../src/skills/index.js";

function freshSkill() {
  return { level: 1, box: 1, seen: 0, correct: 0, streak: 0, miss: 0, lastPlayedDay: null, mastered: false };
}

// A full skills map covering every registered skill (future-proof as skills are added).
function allFresh() {
  const skills = {};
  for (const id of SKILL_ORDER) skills[id] = freshSkill();
  return skills;
}

test("mastery: promotes after 3 correct in a row", () => {
  const s = freshSkill();
  recordResult(s, "counting", true);
  recordResult(s, "counting", true);
  const evt = recordResult(s, "counting", true);
  assert.equal(s.level, 2);
  assert.equal(evt.leveledUp, true);
  assert.equal(s.streak, 0);
});

test("mastery: eases down a level after 2 misses (never below 1)", () => {
  const s = freshSkill();
  s.level = 3;
  recordResult(s, "counting", false);
  const evt = recordResult(s, "counting", false);
  assert.equal(s.level, 2);
  assert.equal(evt.leveledDown, true);
  // never below level 1
  const s2 = freshSkill();
  recordResult(s2, "counting", false);
  recordResult(s2, "counting", false);
  assert.equal(s2.level, 1);
});

test("mastery: Leitner box rises on correct, resets on miss", () => {
  const s = freshSkill();
  recordResult(s, "counting", true);
  assert.equal(s.box, 2);
  recordResult(s, "counting", false);
  assert.equal(s.box, 1);
});

test("mastery: reaches mastered at top level with high box", () => {
  const s = freshSkill();
  s.level = skillMeta("counting").maxLevel;
  s.box = 3;
  const evt = recordResult(s, "counting", true); // box -> 4
  assert.equal(s.mastered, true);
  assert.equal(evt.mastered, true);
});

test("mastery: mastered is sticky when the ceiling rises", () => {
  const s = freshSkill();
  s.level = 6; // above the old cap, below the new one
  s.mastered = true;
  recordResult(s, "counting", false);
  assert.equal(s.mastered, true, "a miss never strips the badge");
});

test("mastery: accuracy and progress are sane", () => {
  const s = freshSkill();
  recordResult(s, "counting", true);
  recordResult(s, "counting", false);
  assert.equal(accuracy(s), 0.5);
  const p = masteryProgress(s, "counting");
  assert.ok(p >= 0 && p <= 1);
});

test("scheduler: a never-played skill is due", () => {
  assert.equal(isDue(freshSkill(), 0), true);
});

test("scheduler: box interval gates due-ness", () => {
  const s = freshSkill();
  s.box = 3; // interval 4 days
  s.lastPlayedDay = 0;
  assert.equal(isDue(s, 3), false);
  assert.equal(isDue(s, 4), true);
});

test("scheduler: planMission focuses on a single skill by default", () => {
  const state = {
    day: 0,
    skills: {
      counting: freshSkill(),
      comparison: freshSkill(),
      arithmetic: freshSkill(),
      patterning: freshSkill(),
      bonds: freshSkill(),
    },
  };
  const seq = planMission(state, "arithmetic", 6);
  assert.equal(seq.length, 6);
  assert.ok(seq.every((id) => id === "arithmetic"), "every gate is the picked skill");
});

test("scheduler: planMission can interleave review when asked", () => {
  const state = {
    day: 10,
    skills: {
      ...allFresh(),
      counting: { ...freshSkill(), box: 1, lastPlayedDay: 9 }, // due
      comparison: { ...freshSkill(), box: 1, lastPlayedDay: 9 }, // due
      arithmetic: freshSkill(),
      patterning: { ...freshSkill(), box: 5, lastPlayedDay: 9 },
      bonds: { ...freshSkill(), box: 5, lastPlayedDay: 9 },
    },
  };
  const seq = planMission(state, "arithmetic", 6, { interleaveReview: true });
  assert.equal(seq.length, 6);
  assert.ok(seq.includes("arithmetic"));
  assert.ok(seq.some((id) => id !== "arithmetic"), "mixes in review gates");
  assert.ok(seq.every((id) => id in state.skills));
});

test("scheduler: dueSkills lists overdue skills first", () => {
  const state = {
    day: 10,
    skills: {
      ...allFresh(),
      counting: { ...freshSkill(), box: 1, lastPlayedDay: 9 }, // due (interval 1)
      comparison: { ...freshSkill(), box: 5, lastPlayedDay: 9 }, // not due (interval 15)
      arithmetic: freshSkill(), // never played -> due
      patterning: { ...freshSkill(), box: 2, lastPlayedDay: 1 },
      bonds: { ...freshSkill(), box: 5, lastPlayedDay: 9 },
    },
  };
  const due = dueSkills(state);
  assert.ok(due.includes("counting"));
  assert.ok(due.includes("arithmetic"));
  assert.ok(!due.includes("comparison"));
});

test("scheduler: nextSkill rotates and does not repeat the last played skill", () => {
  const mk = () => ({
    lastPlayedSkill: null,
    day: 0,
    skills: allFresh(),
  });
  const s = mk();
  // all due (fresh) -> first pick is the first in SKILL_ORDER
  const first = nextSkill(s);
  assert.equal(first, SKILL_ORDER[0]);
  // after playing it, next should differ
  s.lastPlayedSkill = first;
  const second = nextSkill(s);
  assert.notEqual(second, first);
  // rotation is stable/deterministic
  assert.equal(nextSkill(s), second);
});
