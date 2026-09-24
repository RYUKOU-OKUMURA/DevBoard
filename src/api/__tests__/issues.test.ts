import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitHubIssue } from '../issues';
import { fetchIssues, fetchIssuesPage, fetchRepoLabels } from '../issues';

const mockGithubRestRequest = vi.hoisted(() => vi.fn());

vi.mock('@/services/githubClient', () => ({
  githubRestRequest: (...args: unknown[]) => mockGithubRestRequest(...args),
}));

function createIssue(number: number, pullRequest = false): GitHubIssue {
  return {
    id: number,
    number,
    title: `Issue ${number}`,
    body: null,
    state: 'open',
    html_url: `https://github.com/alice/repo/issues/${number}`,
    user: { login: 'alice', avatar_url: '', html_url: 'https://github.com/alice' },
    assignees: [],
    labels: [],
    comments: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    closed_at: null,
    ...(pullRequest ? { pull_request: { url: 'api/pull/2', html_url: 'https://github.com/alice/repo/pull/2' } } : {}),
  };
}

describe('issues API', () => {
  beforeEach(() => mockGithubRestRequest.mockReset());

  it('returns the raw page size while keeping fetchIssues PR-filtered', async () => {
    const issue = createIssue(1);
    const pullRequest = createIssue(2, true);
    mockGithubRestRequest.mockResolvedValueOnce([issue, pullRequest]).mockResolvedValueOnce([issue, pullRequest]);

    await expect(fetchIssuesPage('alice', 'repo', {
      state: 'all', per_page: 100, page: 1, sort: 'updated', direction: 'desc',
    })).resolves.toEqual({ issues: [issue, pullRequest], rawCount: 2 });
    await expect(fetchIssues('alice', 'repo', { state: 'all' })).resolves.toEqual([issue]);
    expect(mockGithubRestRequest).toHaveBeenNthCalledWith(
      1,
      '/repos/alice/repo/issues?state=all&per_page=100&page=1&sort=updated&direction=desc'
    );
  });

  it('fetches up to 100 labels for a repository', async () => {
    const labels = [{ id: 1, name: 'bug', color: 'ff0000' }];
    mockGithubRestRequest.mockResolvedValueOnce(labels);

    await expect(fetchRepoLabels('alice', 'repo')).resolves.toEqual(labels);
    expect(mockGithubRestRequest).toHaveBeenCalledWith('/repos/alice/repo/labels?per_page=100');
  });
});
