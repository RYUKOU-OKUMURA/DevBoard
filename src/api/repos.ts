import { createGraphQLClient } from "./octokit";
import type { Repo } from "../types";
import { validateRepos, getErrorMessage } from "../utils/validators";
import { transformRepositories, type GraphQLRepository } from "../lib/transformRepository";
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
