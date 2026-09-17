/**
 * Screenshots of the application at a given width.
 *
 *   node scripts/shots.mjs 1280 /doors /compare
 *
 * Seeds a profile first, so the screens have a real board to lay out rather
 * than an empty state. Files land in `public/qa/`, which is git-ignored.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
].find((candidate) => existsSync(candidate));

const BASE = process.env.QA_BASE_URL ?? "http://127.0.0.1:3123";
const OUT = path.resolve("public/qa");

const SEED = {
  version: 1,
  state: {
    profile: {
      grade: 11,
      interests: ["programming", "ux"],
      countries: ["KZ", "PL"],
      budget_per_year: { amount: 1500000, currency: "KZT" },
      languages: [
        { code: "ru", level: "C1" },
        { code: "en", level: "B2" },
      ],
      exams: [{ id: "ent", score: 112, status: "taken" }],
      constraints: { can_relocate: true, needs_full_funding: false },
    },
    interview: {
      started: true,
      completed: true,
      answered_question_ids: ["q_interests", "q_countries"],
      skipped_question_ids: [],
      conflicts: [],
    },
    route: null,
    previous_route: null,
    completed_action_ids: [],
    action_states: {},
    change_seen: true,
    selected_compare_ids: ["mit", "oxford"],
    preferences: { locale: "ru", tone: "friendly" },
    metadata: { schema_version: 1 },
  },
};

const width = Number(process.argv[2] ?? 390);
const routes = process.argv.slice(3);
if (routes.length === 0) routes.push("/doors");

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
const problems = [];
page.on("pageerror", (error) => problems.push(error.message.slice(0, 140)));

await page.setViewport({
  width,
  height: width < 700 ? 850 : 900,
  deviceScaleFactor: width < 700 ? 2 : 1,
  isMobile: width < 700,
});

await page.goto(BASE + "/doors", { waitUntil: "domcontentloaded" });
await page.evaluate((seed) => {
  window.localStorage.setItem("stepwise-storage", JSON.stringify(seed));
}, SEED);

for (const route of routes) {
  await page.goto(BASE + route, { waitUntil: "networkidle0" });
  await new Promise((resolve) => setTimeout(resolve, 600));
  const name = route.replace(/\//g, "_") || "_root";
  await page.screenshot({ path: path.join(OUT, width + name + ".png"), fullPage: true });
}

await browser.close();
console.log(`сняты ${width}px: ${routes.join(" ")}`);
if (problems.length > 0) console.log("ошибки страницы:", problems.join(" | "));
