import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CATALOG, APP_CATALOG } from "@/data/catalog";
import { DEMO_PROFILE } from "@/data/demo-profile";
import { CompareScreen } from "@/features/route/compare-screen";
import { DoorDetailsScreen } from "@/features/route/door-details";
import { DoorsScreen } from "@/features/route/doors-screen";
import { NextActionScreen } from "@/features/route/next-action-screen";
import { RoadmapScreen } from "@/features/route/roadmap-screen";
import { CONFIDENCE_LABEL } from "@/lib/confidence";
import { NEXT_ACTION_REASON, weakestConfidence } from "@/features/route/ui";
import { buildActionIndex, computePointOfNoReturn, computeRoute, getActiveDoors } from "@/lib/engine";
import type { RouteResult } from "@/lib/engine/route";
import { addDays, todayIso } from "@/lib/date";
import { createDefaultAppData, useAppStore } from "@/lib/state/app-store";

/**
 * The screens, against the real engine and the real catalogue.
 *
 * Nothing is mocked below except the router: these tests exist to catch the
 * failure where a page stops agreeing with the engine — a count typed into
 * markup, a board sorted by the wrong key, a screen that throws instead of
 * saying "пока нечего показать".
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/doors",
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("not found");
  },
}));

const TODAY = todayIso();

/** A hydrated store holding a board computed from the demo profile. */
function seedRoute() {
  const route = computeRoute(DEMO_PROFILE, CATALOG, TODAY);
  useAppStore.setState({
    ...createDefaultAppData(),
    hasHydrated: true,
    profile: DEMO_PROFILE,
    route,
  });
  return route;
}

/** Mirrors the board: dated, open and with nothing standing in the way. */
function reachableDoors(route: RouteResult) {
  return route.doors.filter(
    (door) =>
      (door.status === "open" || door.status === "closing_soon") &&
      door.explanation_facts.blockers.length === 0,
  );
}

/** The board shows this many before folding. Kept in step with doors-screen. */
const VISIBLE_DOORS = 6;

beforeEach(() => {
  window.localStorage.clear();
  useAppStore.setState({ ...createDefaultAppData(), hasHydrated: true });
});

describe("doors", () => {
  it("renders the counts the engine computed", () => {
    const route = seedRoute();
    render(<DoorsScreen />);

    const active = route.summary.open + route.summary.closing_soon;
    expect(
      screen.getByRole("heading", { name: `Открыто ${active} из ${route.summary.total}` }),
    ).toBeInTheDocument();
  });

  it("leads with the routes that can be lost first, in engine order", () => {
    const route = seedRoute();
    render(<DoorsScreen />);

    // Seventy-five universities is a catalogue, not a screen. The board shows
    // the few that can be lost soonest — and what it shows has to be the
    // engine's own order, not a re-sorted subset of it.
    const expected = reachableDoors(route)
      .slice(0, VISIBLE_DOORS)
      .map((door) => APP_CATALOG.programs.find((item) => item.id === door.program_id)?.org);

    const headings = screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
    expect(headings.slice(0, expected.length)).toEqual(expected);
  });

  it("keeps the rest one click away rather than dropping it", async () => {
    const user = userEvent.setup();
    const route = seedRoute();
    render(<DoorsScreen />);

    const reachable = reachableDoors(route);
    const hidden = reachable.length - VISIBLE_DOORS;
    expect(hidden).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: new RegExp(`Показать ещё ${hidden}`) }));

    const names = reachable.map(
      (door) => APP_CATALOG.programs.find((item) => item.id === door.program_id)?.org,
    );
    const headings = screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
    expect(headings.slice(0, names.length)).toEqual(names);
  });

  it("accounts for every route on the board, folded or not", () => {
    const route = seedRoute();
    render(<DoorsScreen />);

    // Nothing is quietly dropped: each fold names how many routes it holds, and
    // the folds plus the visible list add up to the whole catalogue.
    const folded = ["Не проходишь по условиям", "Нельзя рассчитать", "Уже закрыто"].map((label) => {
      // A fold with nothing in it is not rendered at all, which is also a count.
      const fold = screen.queryAllByText(new RegExp(`^${label}: \\d+`));
      const match = fold[0]?.textContent?.match(/: (\d+)/);
      return match == null ? 0 : Number(match[1]);
    });

    expect(folded.some((count) => count > 0)).toBe(true);
    expect(folded.reduce((sum, count) => sum + count, reachableDoors(route).length)).toBe(
      route.doors.length,
    );
  });

  it("keeps closed routes in their own section with an honest note", () => {
    const route = seedRoute();
    const closed = route.doors.filter((door) => door.status === "closed");
    render(<DoorsScreen />);

    // The dashboard also counts closed routes, so the fold is matched by its
    // own heading — "Уже закрыто: 8" — rather than by the words alone.
    if (closed.length === 0) {
      expect(screen.queryByText(/^Уже закрыто: \d+/)).not.toBeInTheDocument();
      return;
    }
    expect(screen.getByText(/^Уже закрыто: \d+/)).toBeInTheDocument();
    expect(screen.getByText(/не значит, что туда нельзя поступить/i)).toBeInTheDocument();
  });

  it("never shows a date without saying what controls it", () => {
    const route = seedRoute();
    render(<DoorsScreen />);

    // "Точка невозврата — 24 сентября" is a threat. "Её определяет регистрация
    // на SAT" is something a person can act on. A card that shows the first
    // without the second is the product failing at its own job.
    // Everything the board renders: the visible few plus the folds, which are
    // in the DOM even while closed.
    const reachable = reachableDoors(route);
    const visible = new Set(reachable.slice(0, VISIBLE_DOORS).map((door) => door.program_id));
    const folded = new Set(reachable.slice(VISIBLE_DOORS).map((door) => door.program_id));
    const rendered = route.doors.filter(
      (door) => visible.has(door.program_id) || !folded.has(door.program_id),
    );

    const dated = rendered.filter((door) => door.next_critical_action_id !== undefined);
    expect(dated.length).toBeGreaterThan(0);

    const explained = screen.getAllByText(/Дату определяет:/);
    expect(explained.length).toBe(dated.length);

    for (const door of dated.slice(0, VISIBLE_DOORS)) {
      const title = CATALOG.actions.find(
        (action) => action.id === door.next_critical_action_id,
      )?.title;
      expect(title, door.program_id).toBeDefined();
      expect(
        explained.some((node) => node.textContent?.includes(title ?? "")),
        `${door.program_id}: ${title ?? ""}`,
      ).toBe(true);
    }
  });

  it("shows an empty state instead of crashing without a profile", () => {
    render(<DoorsScreen />);
    expect(screen.getByText("Сначала собери профиль")).toBeInTheDocument();
  });

  it("never shows an admission probability", () => {
    seedRoute();
    const { container } = render(<DoorsScreen />);
    expect(container.textContent).not.toMatch(/вероятн|шанс|%/i);
  });
});

describe("door details", () => {
  it("loads the programme named in the route", () => {
    const route = seedRoute();
    const first = route.doors[0];
    const program = APP_CATALOG.programs.find((item) => item.id === first?.program_id);

    render(<DoorDetailsScreen programId={program?.id ?? ""} />);

    // The university is the page's identity — "Бакалавриат — инженерия" is what
    // seventy-five of these pages have in common, not what tells them apart.
    expect(screen.getByRole("heading", { name: program?.org ?? "" })).toBeInTheDocument();
    expect(screen.getByText("Точка невозврата")).toBeInTheDocument();
  });

  it("explains a date it cannot compute instead of inventing one", () => {
    const route = seedRoute();
    const gap = route.doors.find((door) => door.status === "needs_data");
    if (gap === undefined) return;

    render(<DoorDetailsScreen programId={gap.program_id} />);
    expect(screen.getByText(/недостаточно данных/i)).toBeInTheDocument();
  });

  it("says an unknown programme is unknown", () => {
    seedRoute();
    render(<DoorDetailsScreen programId="no-such-program" />);
    expect(screen.getByText("Такого пути нет в каталоге")).toBeInTheDocument();
  });
});

describe("compare", () => {
  it("asks for a second route before comparing", () => {
    const route = seedRoute();
    useAppStore.setState({ selected_compare_ids: [route.doors[0]?.program_id ?? ""] });

    render(<CompareScreen />);
    expect(screen.getByText("Выбери ещё один путь для сравнения")).toBeInTheDocument();
  });

  it("compares exactly two and never declares a winner", () => {
    const route = seedRoute();
    const [a, b] = route.doors;
    useAppStore.setState({
      selected_compare_ids: [a?.program_id ?? "", b?.program_id ?? ""],
    });

    render(<CompareScreen />);

    expect(screen.getByText("Точка невозврата")).toBeInTheDocument();

    // The takeaway states differences and never a verdict. (The page copy does
    // contain the word "лучший" — in the sentence promising not to pick one.)
    const takeaway = screen.getByText("Коротко").parentElement;
    expect(takeaway?.textContent).not.toMatch(/лучш|рекомендуем|стоит выбрать|подходит больше/i);
  });

  it("never shows a date or a price without also showing how sure we are of it", () => {
    const route = seedRoute();
    // A door with a computed point of no return, so the badge has a date to
    // sit next to rather than "не рассчитана".
    const dated = route.doors.find((door) => door.point_of_no_return !== undefined);
    const other = route.doors.find((door) => door.program_id !== dated?.program_id);
    expect(dated).toBeDefined();
    expect(other).toBeDefined();
    useAppStore.setState({
      selected_compare_ids: [dated?.program_id ?? "", other?.program_id ?? ""],
    });

    render(<CompareScreen />);

    const confidenceWords = Object.values(CONFIDENCE_LABEL);
    const shown = confidenceWords.some((label) => screen.queryAllByText(label).length > 0);
    expect(shown).toBe(true);
  });
});

describe("roadmap", () => {
  it("groups steps into months and counts what is done", async () => {
    seedRoute();
    render(<RoadmapScreen />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toMatch(/Сделано \d+ из \d+/);

    // Month sections carry the steps, and every step names what it holds.
    expect(screen.getAllByText(/Удерживает \d+ пут/).length).toBeGreaterThan(0);
  });

  it("offers a step more states than done, and remembers the one picked", async () => {
    seedRoute();
    const user = userEvent.setup();
    render(<RoadmapScreen />);

    // A step nobody has started still has an honest control.
    const planned = screen.getAllByRole("button", { name: "Планирую" })[0];
    expect(planned).toBeDefined();
    await user.click(planned as HTMLElement);

    const firstStep = Object.keys(useAppStore.getState().action_states)[0];
    expect(firstStep).toBeDefined();
    expect(useAppStore.getState().action_states[firstStep ?? ""]?.status).toBe("planned");
    // Planning is not doing: the engine's finished list is untouched.
    expect(useAppStore.getState().completed_action_ids).toEqual([]);

    const done = screen.getAllByRole("button", { name: "Сделано" })[0];
    await user.click(done as HTMLElement);

    expect(useAppStore.getState().completed_action_ids.length).toBe(1);
    expect(useAppStore.getState().action_states[firstStep ?? ""]?.status).toBe("done");
  });

  it("flags a step whose self-planned date has already passed, and only that one", () => {
    const route = seedRoute();
    const actionsById = buildActionIndex(CATALOG.actions);
    const active = getActiveDoors(route.doors);
    const program = APP_CATALOG.programs.find((item) => item.id === active[0]?.program_id);
    const schedule = program === undefined ? null : computePointOfNoReturn(program, actionsById, TODAY);
    const overdueActionId = schedule?.chain[0]?.action_id;
    expect(overdueActionId).toBeDefined();

    useAppStore.setState({
      action_states: { [overdueActionId ?? ""]: { status: "planned", planned_date: addDays(TODAY, -5) } },
    });

    render(<RoadmapScreen />);

    // A step still on the board can never be overdue by the engine's own
    // deadline (its door would have closed first) — only by the applicant's
    // own lapsed plan, and only that one line says so.
    expect(screen.getAllByText(/Просрочено/)).toHaveLength(1);
  });

  it("never marks a step overdue for a plan date that hasn't arrived yet", () => {
    const route = seedRoute();
    const actionsById = buildActionIndex(CATALOG.actions);
    const active = getActiveDoors(route.doors);
    const program = APP_CATALOG.programs.find((item) => item.id === active[0]?.program_id);
    const schedule = program === undefined ? null : computePointOfNoReturn(program, actionsById, TODAY);
    const actionId = schedule?.chain[0]?.action_id;
    expect(actionId).toBeDefined();

    useAppStore.setState({
      action_states: { [actionId ?? ""]: { status: "planned", planned_date: addDays(TODAY, 5) } },
    });

    render(<RoadmapScreen />);
    expect(screen.queryByText(/Просрочено/)).not.toBeInTheDocument();
  });
});

describe("weakestConfidence", () => {
  it("returns undefined for an empty list rather than guessing", () => {
    expect(weakestConfidence([])).toBeUndefined();
  });

  it("picks the least certain level, regardless of input order", () => {
    expect(weakestConfidence(["verified", "derived", "last_cycle"])).toBe("last_cycle");
    expect(weakestConfidence(["last_cycle", "verified"])).toBe("last_cycle");
    expect(weakestConfidence(["demo", "verified", "derived"])).toBe("demo");
  });

  it("returns the only level given when there is exactly one", () => {
    expect(weakestConfidence(["verified"])).toBe("verified");
  });
});

describe("next action", () => {
  it("shows one step, with the routes it holds", () => {
    seedRoute();
    render(<NextActionScreen />);

    // Заголовок экрана — сам шаг. Раньше над ним стояла подпись «Твой
    // следующий шаг», повторявшая пункт навигации; теперь её нет.
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBeTruthy();
    expect(screen.getByText("Удерживает путей")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Сделано" })).toHaveLength(1);
  });

  it("says why this step and not another one", () => {
    const route = seedRoute();
    render(<NextActionScreen />);

    // The engine records which rule won the ranking. Showing the deadline and
    // hiding the reason leaves a person with a number and no argument.
    const reason = route.next_action?.reason_code;
    expect(reason).toBeDefined();
    expect(screen.getByText("Почему именно этот шаг")).toBeInTheDocument();
    expect(
      screen.getByText(NEXT_ACTION_REASON[reason ?? "nearest_deadline"]),
    ).toBeInTheDocument();
  });

  it("stops recommending a step once it is done", async () => {
    seedRoute();
    const user = userEvent.setup();
    const { rerender } = render(<NextActionScreen />);

    const first = screen.getByRole("heading", { level: 1 }).textContent;
    await user.click(screen.getByRole("button", { name: "Сделано" }));
    rerender(<NextActionScreen />);

    const second = screen.queryByRole("heading", { level: 1 })?.textContent;
    expect(second).not.toBe(first);
    expect(useAppStore.getState().completed_action_ids).toHaveLength(1);
  });

  it("says so honestly when there is nothing to do", () => {
    useAppStore.setState({ ...createDefaultAppData(), hasHydrated: true });
    render(<NextActionScreen />);
    expect(screen.getByText("Сначала собери профиль")).toBeInTheDocument();
  });
});

describe("persistence across a reload", () => {
  it("restores the profile, the board and finished steps", async () => {
    seedRoute();
    useAppStore.getState().markActionComplete("apply_form");
    await Promise.resolve();

    const stored = window.localStorage.getItem("stepwise-storage") ?? "";
    useAppStore.setState({ ...createDefaultAppData(), hasHydrated: false });
    window.localStorage.setItem("stepwise-storage", stored);
    await useAppStore.persist.rehydrate();

    render(<DoorsScreen />);

    expect(useAppStore.getState().completed_action_ids).toEqual(["apply_form"]);
    const summary = useAppStore.getState().route?.summary;
    const active = (summary?.open ?? 0) + (summary?.closing_soon ?? 0);
    // The heading is built from several spans, so it is matched by its
    // accessible name rather than by one text node. It's an h2 — `DoorsScreen`
    // owns the page's one h1 via its own `PageHeader` ("Пути").
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: `Открыто ${active} из ${summary?.total ?? 0}`,
      }),
    ).toBeInTheDocument();
  });
});
