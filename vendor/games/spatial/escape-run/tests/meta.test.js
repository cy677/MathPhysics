import { test } from "node:test";
import assert from "node:assert/strict";
import { dailySkill, isDailyDone, claimDaily, DAILY_BONUS, dailyKey } from "../src/progress/daily.js";
import { ensureQuests, applyRunToQuests } from "../src/progress/quests.js";
import { checkAchievements } from "../src/progress/achievements.js";
import { SKILL_ORDER } from "../src/skills/index.js";
import { looksMathy } from "../src/game/hud.js";

// ---- banner icon suppression ----
test("banner: plain questions keep the skill icon; equations/fractions don't", () => {
  // Natural-language questions (even with a trailing "?") should show the icon.
  for (const t of ["How many dots?", "What comes next?", "How many corners?",
    "Which piece is biggest?", "Which shows one half?", "Tap the SMALLER number"]) {
    assert.equal(looksMathy(t), false, `icon kept for: ${t}`);
  }
  // Equations, number-led prompts and fraction symbols should suppress the icon.
  for (const t of ["? + 1 = 7", "3 × ? = 6", "12 ÷ 3 = ?", "3 groups of 2",
    "2 groups of 3", "Tap ½", "Tap ¼", "Tap ¾"]) {
    assert.equal(looksMathy(t), true, `icon suppressed for: ${t}`);
  }
});

// ---- daily ----
test("daily: skill is deterministic per day and valid", () => {
  const st = { unlocks: { skills: [...SKILL_ORDER] } }; // all roads open
  const a = dailySkill(st, "Mon Jan 01 2026");
  const b = dailySkill(st, "Mon Jan 01 2026");
  assert.equal(a, b); // same day + state -> same skill
  assert.ok(SKILL_ORDER.includes(a));
  // a different day is still valid (and may differ)
  assert.ok(SKILL_ORDER.includes(dailySkill(st, "Tue Jan 02 2026")));
  // only unlocked skills are ever chosen
  const locked = { unlocks: { skills: ["counting"] } };
  assert.equal(dailySkill(locked, "Mon Jan 01 2026"), "counting");
});

test("daily: claim awards bonus once", () => {
  const st = { daily: { claimedKey: null } };
  assert.equal(isDailyDone(st, "K"), false);
  assert.equal(claimDaily(st, "K"), DAILY_BONUS);
  assert.equal(isDailyDone(st, "K"), true);
  assert.equal(claimDaily(st, "K"), 0); // already claimed
});

// ---- quests ----
function questState() {
  return { quests: { key: null, list: [] }, stars: 0 };
}

test("quests: generates 3 deterministic quests per day", () => {
  const s1 = questState();
  const s2 = questState();
  const a = ensureQuests(s1, "Wed Jan 03 2026");
  const b = ensureQuests(s2, "Wed Jan 03 2026");
  assert.equal(a.length, 3);
  assert.deepEqual(a.map((q) => q.type), b.map((q) => q.type));
  a.forEach((q) => assert.ok(q.target > 0 && q.reward > 0 && q.text));
});

test("quests: regenerate when the day changes", () => {
  const s = questState();
  ensureQuests(s, "Wed Jan 03 2026");
  const key1 = s.quests.key;
  ensureQuests(s, "Thu Jan 04 2026");
  assert.notEqual(s.quests.key, null);
  assert.notEqual(s.quests.key, key1);
});

test("quests: progress completes and awards stars once", () => {
  const s = questState();
  // force a known quest set with a 'correct' quest (use today's key so
  // applyRunToQuests -> ensureQuests keeps our list instead of regenerating)
  s.quests.key = dailyKey();
  s.quests.list = [{ id: "correct-0", type: "correct", icon: "✔", target: 3, reward: 4, progress: 0, done: false, text: "x" }];
  let done = applyRunToQuests(s, { correct: 3, sparks: 0, missionStars: 1, focal: "counting" });
  assert.equal(done.length, 1);
  assert.equal(s.stars, 4);
  assert.equal(s.quests.list[0].done, true);
  // applying again does not re-award
  done = applyRunToQuests(s, { correct: 5, sparks: 0, missionStars: 1, focal: "counting" });
  assert.equal(done.length, 0);
  assert.equal(s.stars, 4);
});

// ---- achievements ----
function achState(overrides = {}) {
  const skills = {};
  for (const id of SKILL_ORDER) skills[id] = { level: 1, mastered: false };
  return {
    stats: { runs: 0, threeStars: 0, questsDone: 0, starsEarned: 0 },
    streak: { count: 0 },
    skills,
    daily: { claimedKey: null },
    unlocks: { characters: ["pip"], cars: ["classic"], worlds: ["meadow"] },
    achievements: { unlocked: [] },
    ...overrides,
  };
}

test("achievements: first mission unlocks once", () => {
  const s = achState();
  s.stats.runs = 1;
  const fresh = checkAchievements(s);
  assert.ok(fresh.some((a) => a.id === "first_mission"));
  // not re-awarded
  assert.equal(checkAchievements(s).some((a) => a.id === "first_mission"), false);
});

test("achievements: trailblazer unlocks at level 6", () => {
  const s = achState();
  s.skills.arithmetic.level = 6;
  const ids = checkAchievements(s).map((a) => a.id);
  assert.ok(ids.includes("trailblazer"));
  // and not before
  const s2 = achState();
  s2.skills.arithmetic.level = 5;
  assert.ok(!checkAchievements(s2).map((a) => a.id).includes("trailblazer"));
});

test("achievements: grand master requires all skills mastered", () => {
  const s = achState();
  for (const id of SKILL_ORDER) s.skills[id].mastered = true;
  const ids = checkAchievements(s).map((a) => a.id);
  assert.ok(ids.includes("master_one"));
  assert.ok(ids.includes("master_all"));
});
