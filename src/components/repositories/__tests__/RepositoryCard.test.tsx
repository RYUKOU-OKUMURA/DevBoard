import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Repo } from '../../../types';
import { RepositoryCard } from '../RepositoryCard';

function createRepo(): Repo {
  return {
    id: 'repo-1',
    nameWithOwner: 'alice/frontend-app',
    htmlUrl: 'https://github.com/alice/frontend-app',
    pushedAt: '2025-01-01T00:00:00.000Z',
    isArchived: false,
    isPrivate: false,
    description: 'React dashboard',
    primaryLanguage: 'TypeScript',
    topics: ['react'],
  };
}

describe('RepositoryCard', () => {
  it('limits GitHub navigation to the explicit link', () => {
    const markup = renderToStaticMarkup(<RepositoryCard repo={createRepo()} autoHealth="Active" />);

    expect(markup).toContain('<article');
    expect(markup).toContain('GitHubで開く');
    expect(markup).toContain('href="https://github.com/alice/frontend-app"');
    expect(markup).not.toContain('role="button"');
  });
});
