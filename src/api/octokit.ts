const DEFAULT_PROXY_BASE_URL = "/api";

const API_PROXY_BASE_URL =
  import.meta.env.VITE_API_PROXY_BASE_URL || DEFAULT_PROXY_BASE_URL;

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const USE_DIRECT_API = Boolean(GITHUB_TOKEN);

type GraphQLVariables = Record<string, unknown>;

type GraphQLClient = <T>(query: string, variables?: GraphQLVariables) => Promise<T>;

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

interface TestConnectionResponse {
  login: string;
}

/**
 * Call GitHub API directly using Personal Access Token
 */
async function callGitHubDirect<T>(
  query: string,
  variables: GraphQLVariables = {}
): Promise<T> {
  if (!GITHUB_TOKEN) {
    throw new Error(
      "GitHub token not configured. Please set VITE_GITHUB_TOKEN in .env file."
    );
  }

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GitHub API request failed with status ${response.status}: ${errorBody}`
    );
  }

  const result = (await response.json()) as GraphQLResponse<T>;

  if (result.errors && result.errors.length > 0) {
    const message =
      result.errors.map((error) => error.message).join(", ") ||
      "Unknown GraphQL error";
    throw new Error(`GitHub GraphQL error: ${message}`);
  }

  if (!result.data) {
    throw new Error("GitHub GraphQL response is missing data");
  }

  return result.data;
}

/**
 * Call GitHub API via proxy server
 */
async function callGitHubProxy<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  const method = options.method?.toUpperCase() ?? "GET";

  const hasContentTypeHeader = Object.keys(headers).some(
    (key) => key.toLowerCase() === "content-type"
  );

  if (!hasContentTypeHeader && method !== "GET" && options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_PROXY_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GitHub proxy request failed with status ${response.status}: ${errorBody}`
    );
  }

  return response.json() as Promise<T>;
}

export function createGraphQLClient(): GraphQLClient {
  if (USE_DIRECT_API) {
    console.log("Using direct GitHub API with Personal Access Token");
    return callGitHubDirect;
  }

  console.log("Using GitHub API via proxy server");
  return async function graphQLRequest<T>(
    query: string,
    variables: GraphQLVariables = {}
  ): Promise<T> {
    const payload = {
      query,
      variables,
    };

    const result = await callGitHubProxy<GraphQLResponse<T>>(
      "/github/graphql",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (result.errors && result.errors.length > 0) {
      const message =
        result.errors.map((error) => error.message).join(", ") ||
        "Unknown GraphQL error";
      throw new Error(`GitHub GraphQL proxy error: ${message}`);
    }

    if (!result.data) {
      throw new Error("GitHub GraphQL proxy response is missing data");
    }

    return result.data;
  };
}

export async function testConnection(): Promise<{
  success: boolean;
  user?: string;
  error?: string;
}> {
  try {
    if (USE_DIRECT_API) {
      const query = `
        query {
          viewer {
            login
          }
        }
      `;
      const result = await callGitHubDirect<{ viewer: { login: string } }>(query);
      return {
        success: true,
        user: result.viewer.login,
      };
    }

    const result = await callGitHubProxy<TestConnectionResponse>("/github/me", {
      method: "GET",
    });

    return {
      success: true,
      user: result.login,
    };
  } catch (error) {
    console.error("GitHub API connection test failed:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
