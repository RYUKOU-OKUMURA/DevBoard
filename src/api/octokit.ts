import type { GraphQLOperationId } from './githubQueryIds';
import { NetworkError, RateLimitError, parseGraphQLError } from '../utils/errorHandling';

const API_PROXY_BASE_URL = "/api";

type GraphQLVariables = Record<string, unknown>;

type GraphQLClient = <T>(
  operationId: GraphQLOperationId,
  variables?: GraphQLVariables,
  options?: { signal?: AbortSignal }
) => Promise<T>;

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

  let response: Response;

  try {
    response = await fetch(`${API_PROXY_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include', // Send cookies for authentication
    });
  } catch (error) {
    throw new NetworkError('Failed to reach GitHub API proxy', error);
  }

  // Handle authentication errors
  if (response.status === 401) {
    throw new Error(
      'Authentication required. Please log in again.'
    );
  }

  const resetHeader = response.headers.get('x-ratelimit-reset');
  const remainingHeader = response.headers.get('x-ratelimit-remaining');
  const resetAt =
    resetHeader && Number.isFinite(Number(resetHeader))
      ? new Date(Number(resetHeader) * 1000)
      : undefined;

  if (response.status === 429 || (response.status === 403 && remainingHeader === '0')) {
    throw new RateLimitError('GitHub API rate limit exceeded.', resetAt);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GitHub API request failed with status ${response.status}: ${errorBody}`
    );
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new Error('Failed to parse GitHub API response as JSON');
  }
}

/**
 * Creates a GraphQL client that uses the proxy server with OAuth authentication
 * @param endpoint - API endpoint path (e.g., "/github/graphql/repos", "/github/graphql/activities")
 */
export function createGraphQLClient(endpoint = "/github/graphql"): GraphQLClient {
  return async function graphQLRequest<T>(
    operationId: GraphQLOperationId,
    variables: GraphQLVariables = {},
    options: { signal?: AbortSignal } = {}
  ): Promise<T> {
    const payload = {
      queryId: operationId,
      variables,
    };

    const result = await callGitHubProxy<GraphQLResponse<T>>(
      endpoint,
      {
        method: "POST",
        body: JSON.stringify(payload),
        signal: options.signal,
      }
    );

    const errors = Array.isArray(result.errors) ? result.errors : [];
    if (errors.length > 0) {
      const message =
        errors.map((error) => error?.message).filter(Boolean).join(", ") ||
        "Unknown GraphQL error";
      throw parseGraphQLError(new Error(`GitHub GraphQL error: ${message}`));
    }

    if (!result.data) {
      throw new Error("GitHub GraphQL response is missing data");
    }

    return result.data;
  };
}
