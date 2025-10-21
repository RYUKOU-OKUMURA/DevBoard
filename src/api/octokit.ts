const DEFAULT_PROXY_BASE_URL = "/api";

const API_PROXY_BASE_URL =
  import.meta.env.VITE_API_PROXY_BASE_URL || DEFAULT_PROXY_BASE_URL;

type GraphQLVariables = Record<string, unknown>;

type GraphQLClient = <T>(query: string, variables?: GraphQLVariables) => Promise<T>;

interface GraphQLProxyResponse<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

interface TestConnectionResponse {
  login: string;
}

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
  return async function graphQLRequest<T>(
    query: string,
    variables: GraphQLVariables = {}
  ): Promise<T> {
    const payload = {
      query,
      variables,
    };

    const result = await callGitHubProxy<GraphQLProxyResponse<T>>(
      "/github/graphql",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (result.errors && result.errors.length > 0) {
      const message = result.errors.map((error) => error.message).join(", ") ||
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
    const result = await callGitHubProxy<TestConnectionResponse>(
      "/github/me",
      {
        method: "GET",
      }
    );

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
