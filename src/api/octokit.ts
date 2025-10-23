const API_PROXY_BASE_URL = "/api";

type GraphQLVariables = Record<string, unknown>;

type GraphQLClient = <T>(query: string, variables?: GraphQLVariables) => Promise<T>;

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

/**
 * Call GitHub API via proxy server with authentication
 */
async function callGitHubProxy<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_PROXY_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Send cookies for authentication
  });

  // Handle authentication errors
  if (response.status === 401) {
    throw new Error(
      'Authentication required. Please log in again.'
    );
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GitHub API request failed with status ${response.status}: ${errorBody}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Creates a GraphQL client that uses the proxy server with OAuth authentication
 */
export function createGraphQLClient(): GraphQLClient {
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
      throw new Error(`GitHub GraphQL error: ${message}`);
    }

    if (!result.data) {
      throw new Error("GitHub GraphQL response is missing data");
    }

    return result.data;
  };
}
