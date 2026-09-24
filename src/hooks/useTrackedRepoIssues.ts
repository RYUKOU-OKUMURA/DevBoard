import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchIssuesPage, type GitHubIssue } from '../api/issues';
import { resolveRepositoryMeta } from '../components/repositories/repositoryProgressModel';
import type { Repo } from '../types';
import { useRepositoryMeta } from './useRepositoryMeta';

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PAGES = 3;
const PAGE_SIZE = 100;
const MAX_CONCURRENT_REPOS = 3;

interface CachedRepoIssues {
  issues: GitHubIssue[];
  fetchedAt: number;
}

export interface TrackedRepoIssueItem {
  repo: Repo;
  issue: GitHubIssue;
}

interface HookState {
  identity: string;
  items: TrackedRepoIssueItem[];
  errorsByRepoId: Record<string, string>;
  isLoading: boolean;
  lastFetchedAt: number | null;
}

const repoIssueCache = new Map<string, CachedRepoIssues>();

function getCacheKey(accountId: string, repoId: string): string {
  return JSON.stringify([accountId, repoId]);
}

function toItems(
  repos: Repo[],
  issuesByRepoId: Map<string, GitHubIssue[]>
): TrackedRepoIssueItem[] {
  return repos.flatMap((repo) =>
    (issuesByRepoId.get(repo.id) ?? []).map((issue) => ({ repo, issue }))
  );
}

function getLatestFetchTime(repos: Repo[], accountId: string): number | null {
  const values = repos
    .map((repo) => repoIssueCache.get(getCacheKey(accountId, repo.id))?.fetchedAt ?? null)
    .filter((value): value is number => value !== null);
  return values.length > 0 ? Math.max(...values) : null;
}

export function clearTrackedRepoIssuesCache(): void {
  repoIssueCache.clear();
}

export function useTrackedRepoIssues(accountId: string, repos: Repo[]) {
  const { getMeta, metaAccountId } = useRepositoryMeta(accountId);
  const trackedRepos = useMemo(
    () =>
      metaAccountId === accountId
        ? repos.filter((repo) => resolveRepositoryMeta(repo.id, getMeta(repo.id)).tracked)
        : [],
    [accountId, getMeta, metaAccountId, repos]
  );
  const identity = JSON.stringify([
    accountId,
    trackedRepos.map((repo) => [repo.id, repo.nameWithOwner]),
  ]);
  const [state, setState] = useState<HookState>({
    identity: '',
    items: [],
    errorsByRepoId: {},
    isLoading: false,
    lastFetchedAt: null,
  });
  const accountIdRef = useRef(accountId);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (force: boolean) => {
      const requestId = ++requestIdRef.current;
      const isCurrent = () =>
        requestIdRef.current === requestId && accountIdRef.current === accountId;
      const issuesByRepoId = new Map<string, GitHubIssue[]>();
      const toFetch: Repo[] = [];
      const now = Date.now();

      trackedRepos.forEach((repo) => {
        const cached = repoIssueCache.get(getCacheKey(accountId, repo.id));
        if (cached) issuesByRepoId.set(repo.id, cached.issues);
        if (
          force ||
          !cached ||
          now - cached.fetchedAt < 0 ||
          now - cached.fetchedAt >= CACHE_TTL_MS
        ) {
          toFetch.push(repo);
        }
      });

      setState({
        identity,
        items: toItems(trackedRepos, issuesByRepoId),
        errorsByRepoId: {},
        isLoading: toFetch.length > 0,
        lastFetchedAt: getLatestFetchTime(trackedRepos, accountId),
      });

      if (toFetch.length === 0) return;

      const errorsByRepoId: Record<string, string> = {};
      let nextIndex = 0;
      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT_REPOS, toFetch.length) },
        async () => {
          while (isCurrent()) {
            const repo = toFetch[nextIndex++];
            if (!repo) return;
            const [owner, ...nameParts] = repo.nameWithOwner.split('/');
            const repoName = nameParts.join('/');

            try {
              if (!owner || !repoName) throw new Error('Invalid repository name');
              const issues: GitHubIssue[] = [];
              for (let page = 1; page <= MAX_PAGES; page += 1) {
                const result = await fetchIssuesPage(owner, repoName, {
                  state: 'all',
                  per_page: PAGE_SIZE,
                  page,
                  sort: 'updated',
                  direction: 'desc',
                });
                if (!isCurrent()) return;
                issues.push(...result.issues.filter((issue) => !issue.pull_request));
                if (result.rawCount < PAGE_SIZE) break;
              }

              const cached = { issues, fetchedAt: Date.now() };
              repoIssueCache.set(getCacheKey(accountId, repo.id), cached);
              issuesByRepoId.set(repo.id, issues);
            } catch {
              if (!isCurrent()) return;
              errorsByRepoId[repo.id] = `${repo.nameWithOwner} のIssueを読み込めませんでした。時間をおいて再試行してください。`;
            }
          }
        }
      );

      await Promise.all(workers);
      if (!isCurrent()) return;
      setState({
        identity,
        items: toItems(trackedRepos, issuesByRepoId),
        errorsByRepoId,
        isLoading: false,
        lastFetchedAt: getLatestFetchTime(trackedRepos, accountId),
      });
    },
    [accountId, identity, trackedRepos]
  );
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (metaAccountId !== accountId) {
      accountIdRef.current = accountId;
      requestIdRef.current += 1;
      setState({ identity, items: [], errorsByRepoId: {}, isLoading: false, lastFetchedAt: null });
      return;
    }

    accountIdRef.current = accountId;
    void loadRef.current(false);
    return () => {
      requestIdRef.current += 1;
    };
  }, [accountId, identity, metaAccountId]);

  const reload = useCallback(() => {
    void loadRef.current(true);
  }, []);
  const visibleState = state.identity === identity ? state : null;
  const currentReposById = new Map(trackedRepos.map((repo) => [repo.id, repo]));

  return {
    items: (visibleState?.items ?? []).map((item) => ({
      ...item,
      repo: currentReposById.get(item.repo.id) ?? item.repo,
    })),
    errorsByRepoId: visibleState?.errorsByRepoId ?? {},
    isLoading: visibleState?.isLoading ?? trackedRepos.length > 0,
    lastFetchedAt: visibleState?.lastFetchedAt ?? null,
    reload,
    trackedCount: trackedRepos.length,
  };
}
