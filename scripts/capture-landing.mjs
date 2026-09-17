/**
 * Captures the four landing illustrations from the running application.
 *
 * The second landing screen shows what the product does, so the artwork is the
 * product: real screens, real computed dates, rendered by the same code that
 * ships. Stock photography would have been decoration; this stays true even
 * when the UI changes, because regenerating is one command.
 *
 *   npm run build && npm start        # in one terminal
 *   npm run shots                     # in another
 *
 * Uses the Chrome already installed on the machine via puppeteer-core, so no
 * 150 MB browser download lands in node_modules.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.SHOT_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("public/landing");
/**
 * 4:3 exactly, matching the window frame on the landing, and narrow enough that
 * the interface still reads once scaled into it. Wider shots made the type too
 * small to follow, and cropping a wider shot sliced cards at the edge. The
 * whole viewport is captured, so nothing can be cut off by definition.
 */
const VIEWPORT = { width: 1000, height: 750 };

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

/** A believable applicant, so every screen has real content on it. */
const PROFILE = {
  rawStatement: "",
  homeCountry: "KZ",
  grade: "11",
  intakeYear: 2027,
  targetCountries: ["DE", "GB", "PL"],
  interest: "tech",
  budget: "over_30k",
  exams: {
    nationalScore: 118,
    nationalTaken: false,
    gpa: null,
    sat: null,
    languageTest: "none",
    languageScore: null,
  },
  strengths: { Аналитика: 50, Креатив: 17, Коммуникация: 0, Лидерство: 16, Практика: 17 },
  updatedAt: "2026-09-16T00:00:00.000Z",
};

const SEED = {
  state: { profile: PROFILE, completed: [], previous: null, changePending: false },
  version: 2,
};

/**
 * `scrollY` keeps the four frames visually distinct: the next-action card
 * appears on both /doors and /roadmap, so the roadmap shot starts below it, on
 * the month groups that only that screen has.
 */
const SHOTS = [
  // /start is centred with no sidebar; the app screens sit right of a 240px rail.
  { file: "interview.webp", url: "/start", wait: "Расскажи о себе", scrollY: 0 },
  { file: "roadmap.webp", url: "/roadmap", wait: "Что и когда начинать", scrollY: 720 },
  {
    file: "compare.webp",
    url: "/compare?a=uk-ucas-main&b=kz-grant",
    wait: "Два пути рядом",
    scrollY: 120,
  },
  // The eyebrow is uppercased in CSS, and innerText reports it that way.
  { file: "next-step.webp", url: "/doors", wait: "БЛИЖАЙШИЙ ШАГ", scrollY: 0 },
];

function findChrome() {
  const explicit = process.env.CHROME_PATH;
  if (explicit && existsSync(explicit)) return explicit;
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "Chrome не найден. Укажи путь через CHROME_PATH=... npm run shots",
    );
  }
  return found;
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--hide-scrollbars", "--force-color-profile=srgb", "--font-render-hinting=none"],
  });

  try {
    for (const shot of SHOTS) {
      const page = await browser.newPage();
      await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 2 });

      // Seed before any script runs: the app reads both keys during hydration.
      await page.evaluateOnNewDocument(
        (seed, key) => {
          window.localStorage.setItem(key, JSON.stringify(seed));
          window.localStorage.setItem("theme", "dark");
        },
        SEED,
        "stepwise.v2",
      );

      await page.goto(`${BASE}${shot.url}`, { waitUntil: "networkidle0", timeout: 60_000 });
      await page
        .waitForFunction(
          (needle) => document.body.innerText.includes(needle),
          { timeout: 20_000 },
          shot.wait,
        )
        .catch(() => {
          console.warn(`  ! «${shot.wait}» не дождались на ${shot.url}`);
        });

      if (shot.scrollY) {
        await page.evaluate((y) => window.scrollTo(0, y), shot.scrollY);
      }

      // Let entrance transitions settle so nothing is caught mid-fade.
      await new Promise((resolve) => setTimeout(resolve, 900));

      const file = path.join(OUT, shot.file);
      await page.screenshot({ path: file, type: "webp", quality: 82 });
      console.log(`  ✓ ${shot.file}  <- ${shot.url}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
