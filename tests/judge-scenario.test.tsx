import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdaptiveInterviewScreen } from "@/features/adaptive/interview-screen";
import { DemoPreviewScreen } from "@/features/adaptive/demo-preview-screen";
import { DiagnosticsScreen } from "@/features/adaptive/diagnostics-screen";
import { CompareScreen } from "@/features/route/compare-screen";
import { DoorsScreen } from "@/features/route/doors-screen";
import { NextActionScreen } from "@/features/route/next-action-screen";
import { RoadmapScreen } from "@/features/route/roadmap-screen";
import { createDefaultAppData, useAppStore } from "@/lib/state/app-store";

/**
 * The whole journey, in one test.
 *
 * Interview → breakdown → board → comparison → plan → next step → mark it done
 * → change the budget → see what changed → reload and find everything still
 * there. Unit tests prove the pieces; this proves the product, and it is the
 * test that fails first if any seam between engine, store and screen comes
 * apart.
 *
 * Nothing is stubbed but the router. No network is involved anywhere, which is
 * exactly the point: without a language model the journey is complete.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/doors",
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("not found");
  },
}));

beforeEach(() => {
  window.localStorage.clear();
  useAppStore.setState({ ...createDefaultAppData(), hasHydrated: false });
  useAppStore.setState({ hasHydrated: true });
});

describe("the full journey", () => {
  it("carries an applicant from free text to a next step and back again", async () => {
    const user = userEvent.setup();

    /* 1. The interview: free text is saved, never parsed. ------------------ */
    const interview = render(<AdaptiveInterviewScreen />);

    await user.type(
      screen.getByLabelText("О себе"),
      "11 класс, Алматы. Люблю код и дизайн.",
    );
    await user.click(screen.getByRole("button", { name: "Начать" }));

    expect(useAppStore.getState().interview.raw_text).toBe(
      "11 класс, Алматы. Люблю код и дизайн.",
    );

    // What the sentence actually says is now in the profile — and nothing else.
    // With no API key this is the rule parser's work, not a model's.
    const parsed = useAppStore.getState().profile;
    expect(parsed?.grade).toBe(11);
    expect(parsed?.interests).toContain("design");
    // "Алматы" is where they live, not where they want to study.
    expect(parsed?.countries).toEqual([]);
    // Nothing was invented about money or exams.
    expect(parsed?.budget_per_year).toBeUndefined();
    expect(parsed?.exams).toEqual([]);

    /* 2. A few adaptive questions. ---------------------------------------- */
    let answered = 0;
    while (answered < 4) {
      const heading = screen.queryByRole("heading", { level: 1 });
      if (heading === null || heading.textContent?.includes("Остальные вопросы")) break;

      // Single-choice questions render radios, multi-choice ones checkboxes;
      // the inputs are visually hidden behind their labels.
      const radios = screen.queryAllByRole("radio", { hidden: true });
      const checkboxes = screen.queryAllByRole("checkbox", { hidden: true });
      const options = radios.length > 0 ? radios : checkboxes;
      const first = options[0];
      if (first === undefined) break;

      await user.click(first);
      await user.click(screen.getByRole("button", { name: "Дальше" }));
      answered += 1;
    }
    expect(useAppStore.getState().interview.answered_question_ids.length).toBeGreaterThan(0);
    expect(useAppStore.getState().route).not.toBeNull();
    interview.unmount();

    /* 3. The breakdown shows what we know and what we do not. -------------- */
    const diagnostics = render(<DiagnosticsScreen />);
    expect(screen.getByText("Что мы про тебя знаем")).toBeInTheDocument();
    expect(screen.getByText("Чего мы про тебя не знаем")).toBeInTheDocument();
    diagnostics.unmount();

    /* 4. The board, ordered by urgency. ------------------------------------ */
    const doors = render(<DoorsScreen />);
    const summary = useAppStore.getState().route?.summary;
    const active = (summary?.open ?? 0) + (summary?.closing_soon ?? 0);
    expect(
      screen.getByRole("heading", { name: `Открыто ${active} из ${summary?.total ?? 0}` }),
    ).toBeInTheDocument();

    /* 5. Two routes selected for comparison. ------------------------------- */
    // The compare toggle is now a bookmark-style icon button on each card
    // (`DoorCard`'s `topRightSlot`), not a text button — same state, new shape.
    const compareButtons = screen.getAllByRole("button", { name: "Добавить к сравнению" });
    await user.click(compareButtons[0] as HTMLElement);
    await user.click(compareButtons[1] as HTMLElement);
    expect(useAppStore.getState().selected_compare_ids).toHaveLength(2);
    doors.unmount();

    const compare = render(<CompareScreen />);
    expect(screen.getByText("Два пути рядом")).toBeInTheDocument();
    expect(screen.getByText("Коротко")).toBeInTheDocument();
    compare.unmount();

    /* 6. The plan, and the one next step. ---------------------------------- */
    const roadmap = render(<RoadmapScreen />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Сделано \d+ из \d+/);
    roadmap.unmount();

    const next = render(<NextActionScreen />);
    expect(screen.getByText("Начать не позже")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Сделано" }));
    expect(useAppStore.getState().completed_action_ids).toHaveLength(1);
    next.unmount();

    /* 7. Change the budget from the board, and read what moved. ------------ */
    // QuickEdit now lives inside the "Сортировка и фильтр" sheet, not inline
    // in the aside — open it first, same underlying `QuickEdit`/`onAnswer`.
    const board = render(<DoorsScreen />);
    await user.click(screen.getByRole("button", { name: "Сортировка и фильтр" }));
    await user.click(await screen.findByRole("button", { name: /Бюджет на год/ }));
    const option = screen.getByRole("button", { name: "До 3 000 000 ₸" });
    await user.click(option);

    // Close the filter sheet itself (its own "X", not Escape — the diff
    // overlay below installs its own Escape handler, and Radix's Dialog
    // marks the rest of the page aria-hidden while the sheet stays open,
    // which would otherwise hide "Понятно" from a role query).
    await user.click(screen.getByRole("button", { name: "Close" }));

    // The overlay opens off the deterministic diff, with no request in sight.
    expect(await screen.findByText("Что изменилось")).toBeInTheDocument();
    expect(screen.getByText("Изменилось:")).toBeInTheDocument();
    expect(useAppStore.getState().last_edit?.field).toBe("budget_per_year");
    expect(useAppStore.getState().change_seen).toBe(false);

    await user.click(screen.getByRole("button", { name: "Понятно" }));
    expect(useAppStore.getState().change_seen).toBe(true);
    board.unmount();

    /* 8. Reload: everything survives. -------------------------------------- */
    await Promise.resolve();
    const stored = window.localStorage.getItem("stepwise-storage") ?? "";
    useAppStore.setState({ ...createDefaultAppData(), hasHydrated: false });
    window.localStorage.setItem("stepwise-storage", stored);
    await useAppStore.persist.rehydrate();

    const state = useAppStore.getState();
    expect(state.profile?.budget_per_year).toEqual({ amount: 3_000_000, currency: "KZT" });
    expect(state.completed_action_ids).toHaveLength(1);
    expect(state.route).not.toBeNull();
    expect(state.interview.raw_text).toBe("11 класс, Алматы. Люблю код и дизайн.");

    render(<DoorsScreen />);
    // The dashboard headline is an h2 now — `DoorsScreen` owns the page's one
    // h1 via its own `PageHeader` ("Пути") — and shares level 2 with the
    // leverage panel's own heading, so this needs a name match, not just level.
    expect(
      screen.getByRole("heading", { level: 2, name: /Открыто/ }).textContent,
    ).toMatch(/Открыто \d+ из \d+/);
  });
});

describe("without a network", () => {
  it("computes and shows the demo board anyway", () => {
    // The demo lives at /demo now — unauthenticated, so it runs the engine
    // directly on DEMO_PROFILE rather than through the (account-gated)
    // interview screen. Nothing above touches the network, and nothing below
    // will either.
    render(<DemoPreviewScreen />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/путей? поступления/i);
  });
});
