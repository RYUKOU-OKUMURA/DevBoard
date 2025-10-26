import type { Repo } from "../types";

export interface GraphQLRepository {
  id: string;
  nameWithOwner: string;
  url: string;
  pushedAt: string;
  isArchived: boolean;
  isPrivate: boolean;
  description: string | null;
  stargazerCount?: number | null;
  primaryLanguage: {
    name: string;
  } | null;
  repositoryTopics?: {
    nodes?: Array<{
      topic?: {
        name?: string | null;
      } | null;
    } | null> | null;
  } | null;
}

function extractTopics(repository: GraphQLRepository): string[] {
  const nodes = repository.repositoryTopics?.nodes ?? [];
  return nodes
    .filter((node): node is { topic?: { name?: string | null } | null } => node != null)
    .map((node) => node?.topic?.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

/**
 * GitHub GraphQL レスポンスをアプリ内で利用する Repo 型へ変換する。
 */
export function transformRepository(repository: GraphQLRepository): Repo {
  return {
    id: repository.id,
    nameWithOwner: repository.nameWithOwner,
    htmlUrl: repository.url,
    pushedAt: repository.pushedAt,
    isArchived: repository.isArchived,
    isPrivate: repository.isPrivate,
    description: repository.description ?? undefined,
    primaryLanguage: repository.primaryLanguage?.name ?? undefined,
    topics: extractTopics(repository),
    stargazers_count: repository.stargazerCount ?? undefined,
  };
}

export function transformRepositories(
  repositories: Array<GraphQLRepository | null | undefined>
): Repo[] {
  return (repositories ?? [])
    .filter((repo): repo is GraphQLRepository => repo != null)
    .map(transformRepository);
}
