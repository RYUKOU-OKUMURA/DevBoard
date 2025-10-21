import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";

/**
 * GitHub API トークンを環境変数から取得
 */
function getGitHubToken(): string {
  const token = import.meta.env.VITE_GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      "GitHub token not found. Please set VITE_GITHUB_TOKEN in .env.local file.\n" +
      "Visit https://github.com/settings/tokens to create a Personal Access Token with 'repo' and 'read:org' scopes."
    );
  }

  return token;
}

/**
 * Octokit REST API クライアントのインスタンスを作成
 */
export function createOctokit(): Octokit {
  const token = getGitHubToken();

  return new Octokit({
    auth: token,
    userAgent: "GitHub-Dashboard-MVP/0.1.0",
    baseUrl: import.meta.env.VITE_GITHUB_API_ENDPOINT || "https://api.github.com",
  });
}

/**
 * Octokit GraphQL クライアントを作成
 */
export function createGraphQLClient() {
  const token = getGitHubToken();

  return graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
    baseUrl: import.meta.env.VITE_GITHUB_API_ENDPOINT || "https://api.github.com",
  });
}

/**
 * GitHub API 接続テスト
 * 認証が正しく設定されているか確認
 */
export async function testConnection(): Promise<{
  success: boolean;
  user?: string;
  error?: string;
}> {
  try {
    const octokit = createOctokit();
    const { data } = await octokit.rest.users.getAuthenticated();

    return {
      success: true,
      user: data.login,
    };
  } catch (error) {
    console.error("GitHub API connection test failed:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
