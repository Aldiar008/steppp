/**
 * Walks the application at phone widths and reports what does not fit.
 *
 * A layout that overflows by twelve pixels is invisible in a test and obvious
 * to anyone holding a phone, so this drives a real browser: it seeds a profile
 * into localStorage, visits every screen at 360, 390 and 430 CSS pixels, and
 * fails loudly on horizontal overflow or a tap target smaller than the finger
 * that has to hit it.
 *
 *   npm run build && npx next start -p 3123
 *   node scripts/mobile-qa.mjs
 *
 * Uses the Chrome already on the machine through puppeteer-core, so no browser
 * download lands in node_modules.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

// 127.0.0.1 rather than "localhost": the name can resolve to an IPv6
// address the server is not answering on, and a browser that cannot connect
// would otherwise be measured as a page with no overflow.
const BASE = process.env.QA_BASE_URL ?? "http://127.0.0.1:3123";
const OUT = path.resolve("public/qa");
const WIDTHS = [360, 390, 430];
const ROUTES = [
  "/start",
  "/profile",
  "/diagnostics",
  "/doors",
  "/doors/nu",
  "/doors/mit",
  "/compare",
  "/roadmap",
  "/next-action",
  "/sources",
];

/**
 * Words a screen has to actually print, checked against the built app.
 *
 * Not a copy test: each of these is a label the component reads out of a shared
 * module, and a server component that imports a value from a `"use client"`
 * file gets a client reference instead of the value. It renders as nothing,
 * quietly, and only in a real build — vitest renders the same component just
 * fine. This is the only place that failure is visible.
 */
const MUST_SAY = {
  "/sources": ["Подтверждено источником", "Год выведен из цикла", "По прошлому циклу"],
  "/doors": ["Точка невозврата", "Когда закрываются"],
  "/profile": ["Кто сейчас в приложении"],
};

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

const executablePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!executablePath) {
  console.error("Chrome не найден — проверка на телефонных ширинах пропущена.");
  process.exit(1);
}

/** A profile and a board, so the screens have something real to lay out. */
const SEED = {
  state: {
    profile: {
      grade: 11,
      interests: ["программирование", "дизайн интерфейсов"],
      countries: ["KZ", "US", "GB"],
      budget_per_year: { amount: 1500000, currency: "KZT" },
      languages: [
        { code: "ru", level: "C1" },
        { code: "en", level: "B2" },
      ],
      exams: [{ id: "ent", score: 112, status: "planned" }],
      constraints: { can_relocate: true, needs_full_funding: false },
    },
    interview: {
      started: true,
      completed: true,
      answered_question_ids: ["q_interests", "q_countries", "q_budget"],
      skipped_question_ids: [],
    },
    route: null,
    previous_route: null,
    completed_action_ids: [],
    change_seen: true,
    selected_compare_ids: ["nu", "mit"],
    preferences: { locale: "ru", tone: "friendly" },
    metadata: { schema_version: 1 },
  },
  version: 1,
};

const browser = await puppeteer.launch({ executablePath, headless: "new" });
const problems = [];

try {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 780, deviceScaleFactor: 2, isMobile: true });

    // The store computes the board itself once a profile is present, so only
    // the profile is seeded; nothing here fakes engine output.
    await page.goto(`${BASE}/doors`, { waitUntil: "domcontentloaded" });
    await page.evaluate((seed) => {
      window.localStorage.setItem("stepwise-storage", JSON.stringify(seed));
    }, SEED);

    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
      await new Promise((resolve) => setTimeout(resolve, 350));

      // The board folds most of a 75-university catalogue away. Measuring it
      // closed would measure the easy case, so everything is opened first.
      if (route === "/doors") {
        await page.evaluate(() => {
          for (const node of document.querySelectorAll("details")) node.open = true;
          const more = [...document.querySelectorAll("button")].find((item) =>
            item.textContent?.startsWith("Показать ещё"),
          );
          more?.click();
        });
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      const report = await page.evaluate(() => {
        const doc = document.documentElement;
        // Proof that this is the application and not a browser error page: a
        // screen with no heading has nothing worth measuring, and a QA pass
        // that measures an error page is worse than no QA pass at all.
        const heading = document.querySelector("h1, h2")?.textContent?.trim() ?? "";
        // The error boundary has a heading too, and a pass that measures it is
        // the same lie as a pass that measures Chrome's error page.
        const text = document.body.innerText;
        const crashed = text.includes("Что-то не загрузилось");
        const overflow = doc.scrollWidth - doc.clientWidth;

        const offenders = [];
        for (const node of document.querySelectorAll("*")) {
          const box = node.getBoundingClientRect();
          if (box.width === 0) continue;
          if (box.right > doc.clientWidth + 1) {
            offenders.push(`${node.tagName.toLowerCase()}.${node.className}`.slice(0, 90));
          }
        }

        const small = [];
        for (const node of document.querySelectorAll("button, a[href]")) {
          const box = node.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) continue;
          // A link inside running text is typography, not a control, and a
          // skip link is invisible until focused. Neither is a thumb target.
          if (node.closest("p, li") && node.tagName === "A") continue;
          if (box.height <= 1) continue;
          if (box.height < 32) {
            small.push(`${node.textContent?.trim().slice(0, 40) ?? ""} (${Math.round(box.height)}px)`);
          }
        }

        return { overflow, heading, crashed, text, offenders: offenders.slice(0, 5), small: small.slice(0, 5) };
      });

      const name = route.replace(/\//g, "_") || "_root";
      await page.screenshot({ path: path.join(OUT, `${width}${name}.png`), fullPage: true });

      if (report.heading === "") {
        problems.push(`${width}px ${route}: экран не отрисовался — заголовка нет`);
        continue;
      }
      if (report.crashed) {
        problems.push(`${width}px ${route}: сработал экран ошибки, а не сам экран`);
        continue;
      }
      if (report.overflow > 0) {
        problems.push(`${width}px ${route}: горизонтальное переполнение ${report.overflow}px — ${report.offenders.join(", ")}`);
      }
      // Compared case-insensitively: `innerText` gives back what the screen
      // renders, and an eyebrow label is uppercased by CSS.
      const shouting = report.text.toLowerCase();
      const missing = (MUST_SAY[route] ?? []).filter(
        (phrase) => !shouting.includes(phrase.toLowerCase()),
      );
      if (missing.length > 0) {
        problems.push(`${width}px ${route}: экран не напечатал — ${missing.join(", ")}`);
      }
      if (report.small.length > 0) {
        problems.push(`${width}px ${route}: мелкие цели — ${report.small.join("; ")}`);
      }
    }

    await page.close();
  }
} finally {
  await browser.close();
}

if (problems.length === 0) {
  console.log(`OK: ${WIDTHS.join(", ")}px — переполнения нет, цели не мельче 32px.`);
} else {
  console.log(`Найдено ${problems.length}:`);
  for (const problem of problems) console.log(" -", problem);
  process.exitCode = 1;
}
