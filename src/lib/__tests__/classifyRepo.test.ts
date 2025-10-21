import { describe, expect, it } from "vitest";
import { classifyRepo } from "../classifyRepo";
import type { Repo } from "../../types";

type RepoFactoryOptions = Partial<Repo> & { pushedAt?: string };

const baseRepo: Repo = {
  id: "1",
  nameWithOwner: "user/example",
  htmlUrl: "https://github.com/user/example",
  pushedAt: new Date("2024-01-01T00:00:00Z").toISOString(),
  isArchived: false,
  isPrivate: false,
  topics: [],
};

function createRepo(overrides: RepoFactoryOptions = {}): Repo {
  return {
    ...baseRepo,
    ...overrides,
    pushedAt: overrides.pushedAt ?? baseRepo.pushedAt,
  };
}

describe("classifyRepo", () => {
  const referenceDate = new Date("2024-04-01T00:00:00Z");

  it("returns Archived for archived repositories", () => {
    const repo = createRepo({ isArchived: true });
    expect(classifyRepo(repo, { now: referenceDate })).toBe("Archived");
  });

  it("classifies repositories pushed within active threshold as Active", () => {
    const repo = createRepo({ pushedAt: new Date("2024-03-15T00:00:00Z").toISOString() });
    expect(classifyRepo(repo, { now: referenceDate })).toBe("Active");
  });

  it("classifies repositories pushed within stale threshold as Stale", () => {
    const repo = createRepo({ pushedAt: new Date("2023-12-15T00:00:00Z").toISOString() });
    expect(classifyRepo(repo, { now: referenceDate })).toBe("Stale");
  });

  it("classifies older repositories as Dormant", () => {
    const repo = createRepo({ pushedAt: new Date("2023-05-01T00:00:00Z").toISOString() });
    expect(classifyRepo(repo, { now: referenceDate })).toBe("Dormant");
  });

  it("supports custom thresholds", () => {
    const repo = createRepo({ pushedAt: new Date("2023-11-01T00:00:00Z").toISOString() });
    expect(
      classifyRepo(repo, {
        now: referenceDate,
        activeThreshold: 30,
        staleThreshold: 120,
      })
    ).toBe("Dormant");
  });

  it("treats future push dates as Active", () => {
    const repo = createRepo({ pushedAt: new Date("2024-05-01T00:00:00Z").toISOString() });
    expect(classifyRepo(repo, { now: referenceDate })).toBe("Active");
  });

  it("returns Dormant when pushedAt is invalid", () => {
    const repo = createRepo({ pushedAt: "invalid-date" });
    expect(classifyRepo(repo, { now: referenceDate })).toBe("Dormant");
  });

  it("throws when stale threshold is lower than active threshold", () => {
    const repo = createRepo();
    expect(() =>
      classifyRepo(repo, {
        now: referenceDate,
        activeThreshold: 100,
        staleThreshold: 90,
      })
    ).toThrow(/staleThreshold/i);
  });
});
