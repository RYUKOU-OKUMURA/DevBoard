import { describe, expect, it } from "vitest";
import { filterRepositories, sortRepositories, filterAndSortRepositories } from "../repoSearch";
import type { Repo } from "../../types";

type RepoInit = Partial<Repo> & { pushedAt?: string; nameWithOwner: string };

function createRepo(overrides: RepoInit): Repo {
  return {
    id: overrides.id ?? overrides.nameWithOwner,
    nameWithOwner: overrides.nameWithOwner,
    htmlUrl: overrides.htmlUrl ?? `https://github.com/${overrides.nameWithOwner}`,
    pushedAt: overrides.pushedAt ?? new Date().toISOString(),
    isArchived: overrides.isArchived ?? false,
    isPrivate: overrides.isPrivate ?? false,
    description: overrides.description,
    primaryLanguage: overrides.primaryLanguage,
    topics: overrides.topics ?? [],
  };
}

describe("filterRepositories", () => {
  const repos: Repo[] = [
    createRepo({ nameWithOwner: "user/frontend-app", description: "React dashboard", primaryLanguage: "TypeScript", topics: ["react", "dashboard"] }),
    createRepo({ nameWithOwner: "user/backend-service", description: "Node API", primaryLanguage: "JavaScript", topics: ["node", "api"] }),
    createRepo({ nameWithOwner: "user/data-tool", description: "Python utilities", primaryLanguage: "Python", topics: ["data", "analysis"] }),
  ];

  it("returns all repos when query is empty", () => {
    expect(filterRepositories(repos, "")).toEqual(repos);
  });

  it("matches on name", () => {
    const result = filterRepositories(repos, "frontend");
    expect(result).toHaveLength(1);
    expect(result[0].nameWithOwner).toBe("user/frontend-app");
  });

  it("matches on description", () => {
    const result = filterRepositories(repos, "dashboard");
    expect(result).toHaveLength(1);
    expect(result[0].nameWithOwner).toBe("user/frontend-app");
  });

  it("matches on primary language", () => {
    const result = filterRepositories(repos, "python");
    expect(result).toHaveLength(1);
    expect(result[0].nameWithOwner).toBe("user/data-tool");
  });

  it("matches on topics", () => {
    const result = filterRepositories(repos, "api");
    expect(result).toHaveLength(1);
    expect(result[0].nameWithOwner).toBe("user/backend-service");
  });

  it("performs case-insensitive matching", () => {
    const result = filterRepositories(repos, "DaShBoArD");
    expect(result).toHaveLength(1);
    expect(result[0].nameWithOwner).toBe("user/frontend-app");
  });

  it("returns empty array when no matches", () => {
    expect(filterRepositories(repos, "nonexistent")).toHaveLength(0);
  });
});

describe("sortRepositories", () => {
  const repos: Repo[] = [
    createRepo({ nameWithOwner: "user/b", pushedAt: "2024-01-01T00:00:00Z" }),
    createRepo({ nameWithOwner: "user/a", pushedAt: "2024-03-01T00:00:00Z" }),
    createRepo({ nameWithOwner: "user/c", pushedAt: "invalid" }),
  ];

  it("sorts by last updated in descending order", () => {
    const result = sortRepositories(repos, "lastUpdated");
    expect(result.map((repo) => repo.nameWithOwner)).toEqual([
      "user/a",
      "user/b",
      "user/c",
    ]);
  });

  it("sorts by name when requested", () => {
    const result = sortRepositories(repos, "name");
    expect(result.map((repo) => repo.nameWithOwner)).toEqual([
      "user/a",
      "user/b",
      "user/c",
    ]);
  });
});

describe("filterAndSortRepositories", () => {
  const repos: Repo[] = [
    createRepo({ nameWithOwner: "user/b", pushedAt: "2024-01-01T00:00:00Z", description: "API" }),
    createRepo({ nameWithOwner: "user/a", pushedAt: "2024-03-01T00:00:00Z", description: "Dashboard" }),
    createRepo({ nameWithOwner: "user/c", pushedAt: "2023-12-01T00:00:00Z", description: "CLI" }),
  ];

  it("filters and then sorts the result", () => {
    const result = filterAndSortRepositories(repos, "a", "lastUpdated");
    expect(result.map((repo) => repo.nameWithOwner)).toEqual([
      "user/a",
      "user/b",
    ]);
  });
});
