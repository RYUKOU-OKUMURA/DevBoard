import type { GraphQLOperationId } from './githubQueryIds';
import { createGitHubGraphQLClient } from '@/services/githubClient';

type GraphQLClient = <T>(
  operationId: GraphQLOperationId,
  variables?: Record<string, unknown>,
  options?: { signal?: AbortSignal }
) => Promise<T>;

/**
 * 既存のエクスポート互換性を維持しつつ、サービスレイヤー経由で GraphQL クライアントを提供する。
 */
export function createGraphQLClient(endpoint = "/github/graphql"): GraphQLClient {
  return createGitHubGraphQLClient(endpoint);
}
