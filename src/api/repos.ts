import { createGraphQLClient } from "./octokit";
import type { Repo } from "../types";
import { validateRepos, getErrorMessage } from "../utils/validators";
import {
  transformRepository,
  transformRepositories,
  type GraphQLRepository,
} from "../lib/transformRepository";
import { sortRepositories } from "../lib/repoSearch";

/**
 * GitHub GraphQL API レスポンスの型定義
 */
interface GraphQLResponse {
  viewer: {
    repositories: {
      nodes: GraphQLRepository[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
}

/**
 * リポジトリ一覧を取得する GraphQL クエリ
 */
const REPOSITORIES_QUERY = `
  query GetRepositories($first: Int!, $after: String) {
    viewer {
      repositories(first: $first, after: $after, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
        nodes {
          id
          nameWithOwner
          url
          pushedAt
          isArchived
          isPrivate
          description
          primaryLanguage {
            name
          }
          repositoryTopics(first: 10) {
            nodes {
              topic {
                name
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const SINGLE_REPOSITORY_QUERY = `
  query GetRepository($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      id
      nameWithOwner
      url
      pushedAt
      isArchived
      isPrivate
      description
      primaryLanguage {
        name
      }
      repositoryTopics(first: 10) {
        nodes {
          topic {
            name
          }
        }
      }
    }
  }
`;

interface SingleRepositoryResponse {
  repository: GraphQLRepository | null;
}

/**
 * すべてのリポジトリを取得（ページネーション対応）
 */
export async function fetchAllRepositories(retryAttempt = false): Promise<Repo[]> {
  const graphqlClient = createGraphQLClient();
  const repositories: Repo[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  try {
    while (hasNextPage) {
      const response = await graphqlClient<GraphQLResponse>(REPOSITORIES_QUERY, {
        first: 100,
        after: cursor,
      });

      // レスポンスのバリデーション
      if (!response.viewer?.repositories?.nodes) {
        throw new Error("Invalid API response: missing repositories data");
      }

      const repos = transformRepositories(response.viewer.repositories.nodes);

      // 変換後のデータをバリデーション
      const validRepos = validateRepos(repos);

      if (validRepos.length === 0) {
        console.warn("Validated repository batch returned no entries.");
      }
      repositories.push(...validRepos);

      hasNextPage = response.viewer.repositories.pageInfo.hasNextPage;
      cursor = response.viewer.repositories.pageInfo.endCursor;

      console.log(
        `Fetched ${repos.length} repositories (${validRepos.length} valid, total: ${repositories.length})`
      );
    }

    if (repositories.length === 0) {
      console.warn("Repository fetch completed but returned no data.");
      if (!retryAttempt) {
        console.info("Retrying repository fetch once due to empty result...");
        return fetchAllRepositories(true);
      }
      console.warn("Retry attempt also returned an empty repository list.");
    }

    console.log(`Successfully fetched ${repositories.length} repositories`);
    return sortRepositories(repositories, "lastUpdated");
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("Failed to fetch repositories:", errorMessage);
    throw new Error(`Failed to fetch repositories: ${errorMessage}`);
  }
}

/**
 * ユーザーのリポジトリを取得（エイリアス）
 */
export const fetchUserRepos = fetchAllRepositories;

type RepositoryIdentifier = {
  owner: string;
  name: string;
  raw: string;
};

function parseRepositoryIdentifier(input: string): RepositoryIdentifier | null {
  const raw = input.trim();
  if (!raw) return null;

  let stripped = raw;

  if (stripped.startsWith("git@github.com:")) {
    stripped = stripped.replace("git@github.com:", "");
  } else if (stripped.startsWith("https://github.com/")) {
    stripped = stripped.replace("https://github.com/", "");
  } else if (stripped.startsWith("http://github.com/")) {
    stripped = stripped.replace("http://github.com/", "");
  } else if (stripped.startsWith("github.com/")) {
    stripped = stripped.replace("github.com/", "");
  }

  stripped = stripped.replace(/\.git$/i, "");

  const segments = stripped.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const [owner, name] = segments;
  if (!owner || !name) {
    return null;
  }

  return { owner, name, raw };
}

export async function fetchRepositoriesByUrls(
  inputs: string[]
): Promise<{ repos: Repo[]; failed: string[] }> {
  const graphqlClient = createGraphQLClient();
  const identifiers: RepositoryIdentifier[] = [];
  const seen = new Set<string>();
  const invalidInputs: string[] = [];

  inputs.forEach((input) => {
    const parsed = parseRepositoryIdentifier(input);
    if (!parsed) {
      if (input.trim().length > 0) {
        invalidInputs.push(input);
      }
      return;
    }
    const slug = `${parsed.owner}/${parsed.name}`;
    if (seen.has(slug)) {
      return;
    }
    seen.add(slug);
    identifiers.push(parsed);
  });

  if (identifiers.length === 0) {
    return {
      repos: [],
      failed: invalidInputs.length
        ? invalidInputs
        : inputs.filter((value) => value.trim().length > 0),
    };
  }

  const repos: Repo[] = [];
  const failed: string[] = [...invalidInputs];

  for (const identifier of identifiers) {
    try {
      const data = await graphqlClient<SingleRepositoryResponse>(SINGLE_REPOSITORY_QUERY, {
        owner: identifier.owner,
        name: identifier.name,
      });

      if (!data.repository) {
        failed.push(identifier.raw);
        continue;
      }

      const repo = transformRepository(data.repository);
      const validated = validateRepos([repo]);
      if (validated.length === 0) {
        failed.push(identifier.raw);
        continue;
      }
      repos.push(validated[0]);
    } catch (error) {
      console.error(
        `Failed to fetch repository ${identifier.owner}/${identifier.name}:`,
        error
      );
      failed.push(identifier.raw);
    }
  }

  return {
    repos: sortRepositories(repos, "lastUpdated"),
    failed,
  };
}

/**
 * モックデータを生成（開発・テスト用）
 */
export function generateMockRepositories(): Repo[] {
  const now = new Date();
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  const repos: Repo[] = [
    {
      id: "1",
      nameWithOwner: "user/active-project",
      htmlUrl: "https://github.com/user/active-project",
      pushedAt: daysAgo(5),
      isArchived: false,
      isPrivate: false,
      description: "An actively developed project",
      primaryLanguage: "TypeScript",
      topics: ["react", "typescript", "web"],
    },
    {
      id: "2",
      nameWithOwner: "user/stale-project",
      htmlUrl: "https://github.com/user/stale-project",
      pushedAt: daysAgo(90),
      isArchived: false,
      isPrivate: true,
      description: "A project that hasn't been updated in a while",
      primaryLanguage: "JavaScript",
      topics: ["nodejs", "api"],
    },
    {
      id: "3",
      nameWithOwner: "user/dormant-project",
      htmlUrl: "https://github.com/user/dormant-project",
      pushedAt: daysAgo(200),
      isArchived: false,
      isPrivate: false,
      description: "An old project",
      primaryLanguage: "Python",
      topics: ["python", "data-science"],
    },
    {
      id: "4",
      nameWithOwner: "user/archived-project",
      htmlUrl: "https://github.com/user/archived-project",
      pushedAt: daysAgo(365),
      isArchived: true,
      isPrivate: false,
      description: "This project is archived",
      primaryLanguage: "Go",
      topics: ["archived"],
    },
    {
      id: "5",
      nameWithOwner: "user/another-active",
      htmlUrl: "https://github.com/user/another-active",
      pushedAt: daysAgo(30),
      isArchived: false,
      isPrivate: false,
      description: "Another active project",
      primaryLanguage: "Rust",
      topics: ["rust", "cli", "tools"],
    },
  ];

  return sortRepositories(repos, "lastUpdated");
}
