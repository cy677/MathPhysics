// Dev-only audio generator (ElevenLabs). Run once to create the game's audio;
// the browser never calls the API. Idempotent: existing files are skipped so
// re-runs don't spend credits. Use `--force <id|category>` to regenerate.
//
//   node tools/gen-audio.mjs            # generate anything missing
//   node tools/gen-audio.mjs --force sfx:correct
//
// Requires ELEVENLABS_API_KEY in .env and ffmpeg on PATH.
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "audio");
const API = "https://api.elevenlabs.io/v1";
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — warm, friendly

function loadKey() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) throw new Error(".env not found");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+)\s*$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("ELEVENLABS_API_KEY not set in .env");
}
const KEY = loadKey();
const force = new Set(process.argv.slice(2).filter((a) => a !== "--force"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- asset definitions ----
const MUSIC = [
  { id: "menu_calm", seconds: 45,
    prompt: "Calm, warm, gentle background music for a children's learning game menu. Soft mellow marimba and soft piano with light twinkles, slow relaxed tempo, cozy and friendly, no drums, peaceful and soothing, seamless loop." },
  { id: "game_calm", seconds: 60,
    prompt: "Gentle, encouraging background music for a kids' math driving game. Light playful marimba and soft warm synth pads, mellow and calm, steady soft rhythm, upbeat but relaxing and not distracting, seamless loop." },
];

const SFX = [
  { id: "correct", seconds: 1.2, prompt: "cheerful bright positive success chime, playful happy ding, short, clean" },
  { id: "wrong", seconds: 1.0, prompt: "soft gentle low 'try again' blip, kind and not harsh, short, mellow" },
  { id: "collect", seconds: 0.8, prompt: "cute light sparkle collect pickup pop, playful, very short" },
  { id: "star", seconds: 1.0, prompt: "magical twinkle star sparkle shimmer, bright, short" },
  { id: "win", seconds: 2.0, prompt: "happy celebration victory jingle for kids, playful fanfare, short and warm" },
  { id: "unlock", seconds: 1.4, prompt: "magical unlock reveal chime, ascending sparkle shimmer, rewarding, short" },
  { id: "tap", seconds: 0.5, prompt: "soft subtle UI tap click, gentle, very short" },
  { id: "levelup", seconds: 1.4, prompt: "positive power-up level-up chime, ascending happy arpeggio, short" },
];

const VOICE = [
  { id: "onb_steer", text: "Hi! I'm Pip. Tap the left, middle, or right lane to steer your car." },
  { id: "onb_collect", text: "Grab the sparkly stars to score. And steer around the cones!" },
  { id: "onb_gate", text: "When a question pops up, drive into the lane with the right answer. How many dots?" },
  { id: "onb_ready", text: "You've got it! Ready to race and learn? Let's go!" },
  { id: "teach_intro", text: "Let's look together. You can do it!" },
  { id: "hint_intro", text: "Here's a little hint." },
  { id: "levelup", text: "Level up! Here's the idea." },
  { id: "win", text: "Mission complete! Great driving!" },
];

async function post(path, body, accept = "audio/mpeg") {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: accept },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${path} -> ${res.status} ${res.statusText} ${txt.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function transcode(rawPath, finalPath, args) {
  execFileSync("ffmpeg", ["-y", "-i", rawPath, ...args, finalPath], { stdio: "ignore" });
  rmSync(rawPath, { force: true });
}

function want(category, id) {
  const finalPath = join(OUT, category, `${id}.mp3`);
  const forced = force.has(category) || force.has(`${category}:${id}`);
  if (existsSync(finalPath) && !forced) {
    console.log(`  skip ${category}/${id} (exists)`);
    return null;
  }
  mkdirSync(join(OUT, category), { recursive: true });
  return finalPath;
}

const manifest = { music: [], sfx: [], voice: [], generatedAt: new Date().toISOString() };

async function run() {
  console.log("Generating music…");
  for (const m of MUSIC) {
    const finalPath = want("music", m.id);
    manifest.music.push({ id: m.id, file: `assets/audio/music/${m.id}.mp3`, seconds: m.seconds });
    if (!finalPath) continue;
    const raw = finalPath + ".raw";
    writeFileSync(raw, await post("/music", { prompt: m.prompt, music_length_ms: Math.round(m.seconds * 1000) }));
    transcode(raw, finalPath, ["-c:a", "libmp3lame", "-b:a", "96k", "-ar", "44100"]);
    console.log(`  \u2713 music/${m.id}`);
    await sleep(800);
  }

  console.log("Generating SFX…");
  for (const s of SFX) {
    const finalPath = want("sfx", s.id);
    manifest.sfx.push({ id: s.id, file: `assets/audio/sfx/${s.id}.mp3` });
    if (!finalPath) continue;
    const raw = finalPath + ".raw";
    writeFileSync(raw, await post("/sound-generation", { text: s.prompt, duration_seconds: s.seconds, prompt_influence: 0.6 }));
    transcode(raw, finalPath, ["-c:a", "libmp3lame", "-b:a", "96k", "-ac", "1", "-ar", "44100"]);
    console.log(`  \u2713 sfx/${s.id}`);
    await sleep(800);
  }

  console.log("Generating voice…");
  for (const v of VOICE) {
    const finalPath = want("voice", v.id);
    manifest.voice.push({ id: v.id, file: `assets/audio/voice/${v.id}.mp3`, text: v.text });
    if (!finalPath) continue;
    const raw = finalPath + ".raw";
    writeFileSync(raw, await post(
      `/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      { text: v.text, model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true } }
    ));
    transcode(raw, finalPath, ["-c:a", "libmp3lame", "-b:a", "64k", "-ac", "1", "-ar", "44100"]);
    console.log(`  \u2713 voice/${v.id}`);
    await sleep(600);
  }

  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("\nDone. Manifest written to assets/audio/manifest.json");
}

run().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
