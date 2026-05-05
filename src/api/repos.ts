import { createGraphQLClient } from "./octokit";
import { GraphQLOperations } from "./githubQueryIds";
import type { Repo, RecentItem, IssueState, PullRequestState } from "../types";
import { validateRepos, ensureArray } from "../utils/validators";
import {
  transformRepository,
  transformRepositories,
  type GraphQLRepository,
} from "../lib/transformRepository";
import { sortRepositories } from "../lib/repoSearch";
import { timeAgo } from "../lib/timeAgo";
import {
  loadViewerRepos,
  saveViewerRepos,
  loadCustomRepos,
  saveCustomRepos,
} from "../utils/repoStorage";
import {
  checkRateLimit,
  recordRequest,
  getRateLimitErrorMessage,
} from "../utils/rateLimiter";
import { getUserFriendlyErrorMessage, parseGraphQLError } from "../utils/errorHandling";
import { devError } from "../utils/logger";

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

interface SingleRepositoryResponse {
  repository: GraphQLRepository | null;
}

function ensureRepositoryConnection(response: GraphQLResponse) {
  if (!response.viewer || !response.viewer.repositories) {
    throw new Error("Invalid API response: missing repository connection");
  }
  const { nodes, pageInfo } = response.viewer.repositories;
  if (!Array.isArray(nodes) || !pageInfo) {
    throw new Error("Invalid API response: malformed repositories connection");
  }
  return { nodes, pageInfo };
}

/**
 * すべてのリポジトリを取得（ページネーション対応）
 * @param accountId - アカウント（username）
 * @param options - キャッシュ無視やリトライの指定
 */
export async function fetchAllRepositories(
  accountId: string,
  options: { retryAttempt?: boolean; forceRefresh?: boolean; signal?: AbortSignal } = {}
): Promise<Repo[]> {
  const { retryAttempt = false, forceRefresh = false, signal } = options;
  if (!accountId) {
    throw new Error('accountId is required to fetch viewer repositories.');
  }

  // ローカルストレージをチェック（forceRefreshがfalseの場合のみ）
  if (!forceRefresh) {
    const cached = loadViewerRepos(accountId);
    if (cached) {
      console.log(
        `Using cached viewer repositories (${cached.length} repos)`
      );
      return cached;
    }
  }

  // レート制限をチェック
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    const errorMessage = getRateLimitErrorMessage(rateLimit.resetTime!);
    console.warn(errorMessage);

    // キャッシュがあればそれを返す
    const cached = loadViewerRepos(accountId);
    if (cached) {
      console.log("Using cached data due to rate limit");
      return cached;
    }

    throw new Error(errorMessage);
  }

  // カンバンボード用のエンドポイントを使用
  const graphqlClient = createGraphQLClient("/github/graphql/repos/viewer");
  const repositories: Repo[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  try {
    // リクエストを記録
    recordRequest();

    while (hasNextPage) {
      const response = await graphqlClient<GraphQLResponse>(
        GraphQLOperations.viewerRepos,
        {
          first: 100,
          after: cursor,
        },
        { signal }
      );

      const { nodes, pageInfo } = ensureRepositoryConnection(response);
      const repos = transformRepositories(nodes);

      // 変換後のデータをバリデーション
      const validRepos = validateRepos(repos);

      if (validRepos.length === 0) {
        console.warn("Validated repository batch returned no entries.");
      }
      repositories.push(...validRepos);

      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;

      console.log(
        `Fetched ${repos.length} repositories (${validRepos.length} valid, total: ${repositories.length})`
      );
    }

    if (repositories.length === 0) {
      console.warn("Repository fetch completed but returned no data.");
      if (!retryAttempt) {
        console.info("Retrying repository fetch once due to empty result...");
        return fetchAllRepositories(accountId, { retryAttempt: true, forceRefresh, signal });
      }
      console.warn("Retry attempt also returned an empty repository list.");
    }

    console.log(`Successfully fetched ${repositories.length} repositories`);
    const sortedRepos = sortRepositories(repositories, "lastUpdated");

    // ローカルストレージに保存
    saveViewerRepos(accountId, sortedRepos);

    return sortedRepos;
  } catch (error) {
    const parsed = parseGraphQLError(error);
    const errorMessage = getUserFriendlyErrorMessage(parsed);
    devError("Failed to fetch repositories:", parsed);

    // エラー時にキャッシュがあればそれを返す
    const cached = loadViewerRepos(accountId);
    if (cached) {
      console.log("Using cached data due to API error");
      return cached;
    }

    if (parsed instanceof Error) {
      throw parsed;
    }
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
  accountId: string,
  inputs: string[],
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {}
): Promise<{ repos: Repo[]; failed: string[] }> {
  const { forceRefresh = false, signal } = options;
  if (!accountId) {
    throw new Error('accountId is required to fetch custom repositories.');
  }
  // ローカルストレージをチェック（forceRefreshがfalseの場合のみ）
  if (!forceRefresh) {
    const cached = loadCustomRepos(accountId);
    if (cached) {
      console.log(
        `Using cached custom repositories (${cached.length} repos)`
      );
      return { repos: cached, failed: [] };
    }
  }

  // レート制限をチェック
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    const errorMessage = getRateLimitErrorMessage(rateLimit.resetTime!);
    console.warn(errorMessage);

    // キャッシュがあればそれを返す
    const cached = loadCustomRepos(accountId);
    if (cached) {
      console.log("Using cached custom data due to rate limit");
      return { repos: cached, failed: [] };
    }

    throw new Error(errorMessage);
  }

  // カスタムリポジトリ取得用のエンドポイントを使用
  const graphqlClient = createGraphQLClient("/github/graphql/repos/custom");
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

  // リクエストを記録
  recordRequest();

  const repos: Repo[] = [];
  const failed: string[] = [...invalidInputs];

  for (const identifier of identifiers) {
    try {
      const data = await graphqlClient<SingleRepositoryResponse>(
        GraphQLOperations.singleRepository,
        {
          owner: identifier.owner,
          name: identifier.name,
        },
        { signal }
      );

      if (!data.repository) {
        failed.push(identifier.raw);
        continue;
      }

      const repo = transformRepository(data.repository);
      const validated = validateRepos([repo]);
      const validatedRepo = validated[0];
      if (!validatedRepo) {
        failed.push(identifier.raw);
        continue;
      }
      repos.push(validatedRepo);
    } catch (error) {
      const parsed = parseGraphQLError(error);
      devError(
        `Failed to fetch repository ${identifier.owner}/${identifier.name}:`,
        parsed
      );
      failed.push(identifier.raw);
    }
  }

  const sortedRepos = sortRepositories(repos, "lastUpdated");

  // ローカルストレージに保存
  if (sortedRepos.length > 0) {
    saveCustomRepos(accountId, sortedRepos);
  }

  return {
    repos: sortedRepos,
    failed,
  };
}

/**
 * Recent activity type
 */
export interface RecentActivity {
  repo: {
    nameWithOwner: string;
    htmlUrl: string;
  };
  lastActivity: string;
}

/**
 * Fetch recent repository activities (last 7 days) from GitHub events
 */
export async function fetchRecentActivities(options: { signal?: AbortSignal } = {}): Promise<RecentActivity[]> {
  // Recent activities用のエンドポイントを使用
  const graphqlClient = createGraphQLClient("/github/graphql/activities/recent");
  const FROM = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const response = await graphqlClient<{
      viewer: {
        contributionsCollection: {
          commitContributionsByRepository: Array<{
            repository: {
              nameWithOwner: string;
              url: string;
            };
            contributions: {
              nodes: Array<{
                occurredAt: string;
              }>;
            };
          }>;
        };
      };
    }>(GraphQLOperations.recentEvents, { from: FROM }, { signal: options.signal });

    const contributionRepos = ensureArray<{
      repository: {
        nameWithOwner: string;
        url: string;
      };
      contributions: {
        nodes: Array<{
          occurredAt: string;
        }>;
      };
    }>(
      response.viewer?.contributionsCollection?.commitContributionsByRepository,
      "recent activities contributions"
    );

    const activities: RecentActivity[] = contributionRepos
      .map((item) => {
        const nodes = ensureArray<{ occurredAt: string }>(
          item.contributions?.nodes ?? [],
          "recent activity nodes"
        );
        const latestContribution = nodes[0];
        if (!latestContribution?.occurredAt) return null;

        return {
          repo: {
            nameWithOwner: item.repository.nameWithOwner,
            htmlUrl: item.repository.url,
          },
          lastActivity: timeAgo(latestContribution.occurredAt),
        };
      })
      .filter((activity): activity is RecentActivity => activity !== null);

    return activities;
  } catch (error) {
    const parsed = parseGraphQLError(error);
    devError("Failed to fetch recent activities:", parsed);
    return [];
  }
}

/**
 * Fetch latest Issues contributed by the viewer within last 7 days
 */
export async function fetchLatestIssues(options: { signal?: AbortSignal } = {}): Promise<RecentItem[]> {
  // Issues用のエンドポイントを使用
  const graphqlClient = createGraphQLClient("/github/graphql/activities/issues");
  const FROM = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const data = await graphqlClient<{
      viewer: {
        contributionsCollection: {
          issueContributionsByRepository: Array<{
            repository: { nameWithOwner: string; url: string };
            contributions: { nodes: Array<{ occurredAt: string; issue: { title: string; number: number; url: string; state: IssueState; repository: { nameWithOwner: string; url: string } } }> };
          }>;
        };
      };
    }>(GraphQLOperations.recentIssues, { from: FROM }, { signal: options.signal });

    const repoBlocks = ensureArray<{
      repository: { nameWithOwner: string; url: string };
      contributions: {
        nodes: Array<{
          occurredAt: string;
          issue: {
            title: string;
            number: number;
            url: string;
            state: IssueState;
            repository: { nameWithOwner: string; url: string };
          };
        }>;
      };
    }>(
      data.viewer?.contributionsCollection?.issueContributionsByRepository,
      "recent issues contributions"
    );

    const items: RecentItem[] = repoBlocks
      .flatMap((repoBlock) => {
        const contributionNodes = ensureArray<{
          occurredAt: string;
          issue?: {
            title: string;
            number: number;
            url: string;
            state: IssueState;
            repository: { nameWithOwner: string; url: string };
          };
        }>(repoBlock.contributions?.nodes ?? [], "recent issues nodes");
        return contributionNodes.flatMap((node): RecentItem[] => {
            if (!node?.issue) return [];
            const repo = node.issue.repository;
            const occurredAt = node.occurredAt;
            return [{
              type: 'Issue' as const,
              repo: { nameWithOwner: repo.nameWithOwner, htmlUrl: repo.url },
              title: node.issue.title,
              number: node.issue.number,
              url: node.issue.url,
              occurredAt,
              relativeTime: timeAgo(occurredAt),
              state: node.issue.state,
            }];
          });
      })
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
      .slice(0, 10);

    return items;
  } catch (error) {
    const parsed = parseGraphQLError(error);
    devError('Failed to fetch latest issues:', parsed);
    return [];
  }
}

/**
 * Fetch latest Pull Requests contributed by the viewer within last 7 days
 */
export async function fetchLatestPullRequests(options: { signal?: AbortSignal } = {}): Promise<RecentItem[]> {
  // Pull Requests用のエンドポイントを使用
  const graphqlClient = createGraphQLClient("/github/graphql/activities/pullrequests");
  const FROM = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const data = await graphqlClient<{
      viewer: {
        contributionsCollection: {
          pullRequestContributionsByRepository: Array<{
            repository: { nameWithOwner: string; url: string };
            contributions: { nodes: Array<{ occurredAt: string; pullRequest: { title: string; number: number; url: string; state: PullRequestState; repository: { nameWithOwner: string; url: string } } }> };
          }>;
        };
      };
    }>(GraphQLOperations.recentPullRequests, { from: FROM }, { signal: options.signal });

    const repoBlocks = ensureArray<{
      repository: { nameWithOwner: string; url: string };
      contributions: {
        nodes: Array<{
          occurredAt: string;
          pullRequest: {
            title: string;
            number: number;
            url: string;
            state: PullRequestState;
            repository: { nameWithOwner: string; url: string };
          };
        }>;
      };
    }>(
      data.viewer?.contributionsCollection?.pullRequestContributionsByRepository,
      "recent pull requests contributions"
    );

    const items: RecentItem[] = repoBlocks
      .flatMap((repoBlock) => {
        const contributionNodes = ensureArray<{
          occurredAt: string;
          pullRequest?: {
            title: string;
            number: number;
            url: string;
            state: PullRequestState;
            repository: { nameWithOwner: string; url: string };
          };
        }>(repoBlock.contributions?.nodes ?? [], "recent pull request nodes");
        return contributionNodes.flatMap((node): RecentItem[] => {
            if (!node?.pullRequest) return [];
            const repo = node.pullRequest.repository;
            const occurredAt = node.occurredAt;
            return [{
              type: 'PullRequest' as const,
              repo: { nameWithOwner: repo.nameWithOwner, htmlUrl: repo.url },
              title: node.pullRequest.title,
              number: node.pullRequest.number,
              url: node.pullRequest.url,
              occurredAt,
              relativeTime: timeAgo(occurredAt),
              state: node.pullRequest.state,
            }];
          });
      })
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
      .slice(0, 10);

    return items;
  } catch (error) {
    const parsed = parseGraphQLError(error);
    devError('Failed to fetch latest pull requests:', parsed);
    return [];
  }
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
