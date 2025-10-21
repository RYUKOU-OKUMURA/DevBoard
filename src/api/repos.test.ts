import { describe, expect, it } from "vitest";

import { transformRepository } from "./repos";

const baseRepository = {
  id: "repo-id",
  nameWithOwner: "owner/repo",
  url: "https://github.com/owner/repo",
  pushedAt: "2024-01-01T00:00:00Z",
  isArchived: false,
  isPrivate: false,
  description: "Repository description",
  primaryLanguage: { name: "TypeScript" },
  repositoryTopics: {
    nodes: [
      {
        topic: {
          name: "topic-1",
        },
      },
    ],
  },
} as const;

describe("transformRepository", () => {
  it("maps repository topics when available", () => {
    const result = transformRepository({ ...baseRepository });

    expect(result.topics).toEqual(["topic-1"]);
  });

  it("returns an empty array when repositoryTopics is null", () => {
    const result = transformRepository({
      ...baseRepository,
      repositoryTopics: null,
    });

    expect(result.topics).toEqual([]);
  });

  it("returns an empty array when repositoryTopics.nodes is null", () => {
    const result = transformRepository({
      ...baseRepository,
      repositoryTopics: {
        nodes: null,
      },
    });

    expect(result.topics).toEqual([]);
  });
});
