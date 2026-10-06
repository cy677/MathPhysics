import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = "http://localhost:8123/";
const errors = [];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--use-gl=swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: 414, height: 896, deviceScaleFactor: 2 });
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.goto(URL, { waitUntil: "networkidle0" });
// Skip the first-run onboarding so we land on the menu.
await page.evaluate(() => localStorage.setItem("escape-run:v1", JSON.stringify({ version: 1, onboarded: true })));
await page.reload({ waitUntil: "networkidle0" });

const clickText = async (re) => {
  const ok = await page.evaluate((src) => {
    const rx = new RegExp(src);
    const b = [...document.querySelectorAll("button")].find((b) => rx.test(b.textContent));
    if (b) { b.click(); return true; }
    return false;
  }, re.source);
  await new Promise((r) => setTimeout(r, 200));
  return ok;
};
const heading = () => page.evaluate(() => (document.querySelector("h2")?.textContent || document.querySelector("h1")?.textContent || "").trim());

// Menu -> Adventure Map
console.log("map:", await clickText(/🗺 Map/), await heading());
// pick a skill card (starts a run) then quit via pause
await page.evaluate(() => document.querySelector(".world")?.click());
await new Promise((r) => setTimeout(r, 300));
console.log("run started, hud:", await page.evaluate(() => !!document.querySelector(".hud")));
await page.evaluate(() => document.querySelector(".pill.pause")?.click());
await new Promise((r) => setTimeout(r, 150));
console.log("pause:", await heading());
await clickText(/Quit to Menu/);
console.log("back to menu:", await heading());

// Menu -> Garage
console.log("garage:", await clickText(/Garage/), await heading());
await clickText(/Back/);

// Menu -> Grown-ups (solve the gate)
await clickText(/Grown-ups/);
await new Promise((r) => setTimeout(r, 150));
const solved = await page.evaluate(() => {
  const p = [...document.querySelectorAll("p")].find((p) => /what is \d+ \+ \d+/.test(p.textContent));
  const m = p && p.textContent.match(/(\d+) \+ (\d+)/);
  if (!m) return false;
  const input = document.querySelector(".gate-input");
  input.value = String(+m[1] + +m[2]);
  const btn = [...document.querySelectorAll("button")].find((b) => /Enter/.test(b.textContent));
  btn.click();
  return true;
});
await new Promise((r) => setTimeout(r, 200));
console.log("parent gate solved:", solved, "->", await heading());
// toggle an accessibility setting
await page.evaluate(() => {
  const cb = document.querySelector('input.sw[type="checkbox"]');
  cb.click();
});
console.log("toggled a setting, body classes:", await page.evaluate(() => document.body.className));

console.log("\n--- errors ---");
console.log(errors.length ? errors.join("\n") : "none");
await browser.close();
process.exit(errors.length ? 1 : 0);
