import type { GraphQLOperationId } from '@/api/githubQueryIds';
import { parseGraphQLError } from '@/utils/errorHandling';
import { devError } from '@/utils/logger';
import { requestJson } from './apiClient';

type GraphQLVariables = Record<string, unknown>;

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

interface RequestOptions {
  signal?: AbortSignal;
}

const REST_BASE_PATH = '/api/github';
const GRAPHQL_BASE_PATH = '/api';

/**
 * GitHub REST API への共通クライアント。
 */
export async function githubRestRequest<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  return requestJson<T>(path, { ...init, basePath: REST_BASE_PATH });
}

/**
 * GitHub GraphQL 用のクライアントを生成。
 * エラーは `parseGraphQLError` で整形し、呼び出し側が扱いやすい形にする。
 */
export function createGitHubGraphQLClient(endpoint = '/github/graphql') {
  return async function graphQLRequest<T>(
    operationId: GraphQLOperationId,
    variables: GraphQLVariables = {},
    options: RequestOptions = {}
  ): Promise<T> {
    const payload = {
      queryId: operationId,
      variables,
    };

    const result = await requestJson<GraphQLResponse<T>>(endpoint, {
      method: 'POST',
      basePath: GRAPHQL_BASE_PATH,
      json: payload,
      signal: options.signal,
    });

    const errors = Array.isArray(result.errors) ? result.errors : [];
    if (errors.length > 0) {
      const message =
        errors.map((error) => error?.message).filter(Boolean).join(', ') ||
        'Unknown GraphQL error';
      throw parseGraphQLError(new Error(`GitHub GraphQL error: ${message}`));
    }

    if (!result.data) {
      devError('GitHub GraphQL response is missing data', { operationId });
      throw new Error('GitHub GraphQL response is missing data');
    }

    return result.data;
  };
}

export function createGitHubReposClient() {
  return createGitHubGraphQLClient('/github/graphql/repos/viewer');
}
