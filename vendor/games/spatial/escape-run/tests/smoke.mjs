import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = "http://localhost:8123/";

const errors = [];
const logs = [];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage();
await page.setViewport({ width: 414, height: 896, deviceScaleFactor: 2 });

page.on("console", (m) => {
  logs.push(`${m.type()}: ${m.text()}`);
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("requestfailed", (r) =>
  errors.push("requestfailed: " + r.url() + " " + (r.failure()?.errorText || ""))
);

await page.goto(URL, { waitUntil: "networkidle0" });
// Skip the first-run onboarding so we land on the menu.
await page.evaluate(() => localStorage.setItem("escape-run:v1", JSON.stringify({ version: 1, onboarded: true })));
await page.reload({ waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 400));

// Menu should be present
const hasPlay = await page.evaluate(() =>
  [...document.querySelectorAll("button")].some((b) => /Play/.test(b.textContent))
);
console.log("menu Play button:", hasPlay);

// Click Play (starts a run using recommended skill)
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((b) => /Play/.test(b.textContent));
  b && b.click();
});
await new Promise((r) => setTimeout(r, 300));

// HUD should mount
const hasHud = await page.evaluate(() => !!document.querySelector(".hud"));
console.log("hud mounted:", hasHud);

// Simulate driving + let the run progress through gates.
// Fast-forward by nudging lane taps and waiting.
async function tapLane(i) {
  const box = { 0: 60, 1: 207, 2: 360 }[i];
  await page.mouse.click(box, 700);
}
const start = Date.now();
let results = false;
while (Date.now() - start < 75000) {
  // handle interstitials: teaching/hint modal, and the balloon bonus round
  const handled = await page.evaluate(() => {
    const m = document.getElementById("teach-modal");
    if (m) { m.querySelector("button.btn").click(); return true; }
    if (document.querySelector(".balloon-field")) {
      const cont = [...document.querySelectorAll("button")].find((b) => /Continue/.test(b.textContent));
      if (cont) cont.click();
      return true;
    }
    return false;
  });
  if (!handled) await tapLane(Math.floor(Math.random() * 3));
  await new Promise((r) => setTimeout(r, 450));
  results = await page.evaluate(() =>
    [...document.querySelectorAll("h2")].some((h) => /Mission Complete/.test(h.textContent))
  );
  if (results) break;
}
console.log("reached results:", results);

// Canvas is actually painting (non-blank)
const painted = await page.evaluate(() => {
  const c = document.getElementById("game");
  const ctx = c.getContext("2d");
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  let nonzero = 0;
  for (let i = 0; i < data.length; i += 400) if (data[i] || data[i + 1] || data[i + 2]) nonzero++;
  return nonzero;
});
console.log("canvas painted samples:", painted);

console.log("\n--- console errors ---");
console.log(errors.length ? errors.join("\n") : "none");

await browser.close();

if (errors.length) {
  console.log("\nSMOKE TEST FAILED");
  process.exit(1);
}
console.log("\nSMOKE TEST PASSED");
