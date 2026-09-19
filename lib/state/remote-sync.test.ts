import { describe, expect, it } from "vitest";

import { APP_SCHEMA_VERSION, createDefaultAppData, partializeAppData, type AppData } from "./app-store";
import { resolveStudentState, type RemoteRow } from "./remote-sync";
import { DEMO_PROFILE } from "@/data/demo-profile";

function withProfile(at?: string): AppData {
  const data = createDefaultAppData();
  data.profile = DEMO_PROFILE;
  data.interview.started = true;
  if (at !== undefined) data.metadata.last_calculated_at = at;
  return data;
}

function rowFrom(data: AppData, updatedAt: string): RemoteRow {
  return { schemaVersion: APP_SCHEMA_VERSION, state: partializeAppData(data), updatedAt };
}

describe("resolveStudentState", () => {
  it("pushes local answers up when there is no remote row yet", () => {
    const local = withProfile();
    const result = resolveStudentState(local, true, null);
    expect(result.data).toBe(local);
    expect(result.pushToRemote).toBe(true);
  });

  it("does nothing when neither side has answers", () => {
    const empty = createDefaultAppData();
    const result = resolveStudentState(empty, false, null);
    expect(result.pushToRemote).toBe(false);
  });

  it("takes the remote row when the local box is empty", () => {
    const remoteData = withProfile("2026-01-01T00:00:00.000Z");
    const remote = rowFrom(remoteData, "2026-01-01T00:00:05.000Z");
    const result = resolveStudentState(createDefaultAppData(), false, remote);
    expect(result.data.profile).toEqual(DEMO_PROFILE);
    expect(result.pushToRemote).toBe(false);
  });

  it("prefers the locally computed board when it is newer than the row", () => {
    const local = withProfile("2026-03-01T12:00:00.000Z");
    const remote = rowFrom(withProfile("2026-02-01T00:00:00.000Z"), "2026-02-01T00:00:05.000Z");
    const result = resolveStudentState(local, true, remote);
    expect(result.data).toBe(local);
    expect(result.pushToRemote).toBe(true);
  });

  it("prefers the remote row when the row was updated more recently", () => {
    const local = withProfile("2026-01-01T00:00:00.000Z");
    const remote = rowFrom(withProfile("2026-03-01T00:00:00.000Z"), "2026-03-01T00:00:05.000Z");
    const result = resolveStudentState(local, true, remote);
    expect(result.data.metadata.last_calculated_at).toBe("2026-03-01T00:00:00.000Z");
    expect(result.pushToRemote).toBe(false);
  });

  it("prefers the remote row when the local side never computed a board at all", () => {
    // Interview started but no route computed yet — no last_calculated_at to
    // compare against, so an existing remote row should not be discarded.
    const local = withProfile(undefined);
    const remote = rowFrom(withProfile("2026-01-01T00:00:00.000Z"), "2026-01-01T00:00:05.000Z");
    const result = resolveStudentState(local, true, remote);
    expect(result.pushToRemote).toBe(false);
  });
});
