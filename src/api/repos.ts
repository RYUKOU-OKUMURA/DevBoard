import { createGraphQLClient } from "./octokit";
import type { Repo } from "../types";
import { validateRepos, getErrorMessage } from "../utils/validators";

/**
 * GitHub GraphQL API レスポンスの型定義
 */
interface GraphQLRepository {
  id: string;
  nameWithOwner: string;
  url: string;
  pushedAt: string;
  isArchived: boolean;
  isPrivate: boolean;
  description: string | null;
  primaryLanguage: {
    name: string;
  } | null;
  repositoryTopics: {
    nodes: Array<{
      topic: {
        name: string;
      };
    }>;
  };
}

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
 * GraphQL レスポンスを Repo 型に変換
 */
function transformRepository(repo: GraphQLRepository): Repo {
  return {
    id: repo.id,
    nameWithOwner: repo.nameWithOwner,
    htmlUrl: repo.url,
    pushedAt: repo.pushedAt,
    isArchived: repo.isArchived,
    isPrivate: repo.isPrivate,
    description: repo.description || undefined,
    primaryLanguage: repo.primaryLanguage?.name || undefined,
    topics: repo.repositoryTopics.nodes.map((node) => node.topic.name),
  };
}

/**
 * すべてのリポジトリを取得（ページネーション対応）
 */
export async function fetchAllRepositories(): Promise<Repo[]> {
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

      const repos = response.viewer.repositories.nodes.map(transformRepository);

      // 変換後のデータをバリデーション
      const validRepos = validateRepos(repos);
      repositories.push(...validRepos);

      hasNextPage = response.viewer.repositories.pageInfo.hasNextPage;
      cursor = response.viewer.repositories.pageInfo.endCursor;

      console.log(
        `Fetched ${repos.length} repositories (${validRepos.length} valid, total: ${repositories.length})`
      );
    }

    console.log(`Successfully fetched ${repositories.length} repositories`);
    return repositories;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("Failed to fetch repositories:", errorMessage);
    throw new Error(`Failed to fetch repositories: ${errorMessage}`);
  }
}

/**
 * モックデータを生成（開発・テスト用）
 */
export function generateMockRepositories(): Repo[] {
  const now = new Date();
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  return [
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
}
