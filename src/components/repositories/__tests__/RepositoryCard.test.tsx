// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Repo } from '../../../types';
import { RepositoryCard } from '../RepositoryCard';
import { RepositoryDetailPanel } from '../RepositoryDetailPanel';

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
  afterEach(() => {
    cleanup();
  });

  it('limits GitHub navigation to the explicit link', () => {
    const markup = renderToStaticMarkup(
      <RepositoryCard repo={createRepo()} autoHealth="Active" onOpenDetail={() => undefined} />
    );

    expect(markup).toContain('<article');
    expect(markup).toContain('GitHubで開く');
    expect(markup).toContain('href="https://github.com/alice/frontend-app"');
    expect(markup).not.toContain('role="button"');
  });

  it('opens details from the card detail button', () => {
    const repo = createRepo();
    const onOpenDetail = vi.fn();

    render(<RepositoryCard repo={repo} autoHealth="Active" onOpenDetail={onOpenDetail} />);

    fireEvent.click(screen.getByRole('button', { name: 'alice/frontend-app の詳細を開く' }));

    expect(onOpenDetail).toHaveBeenCalledWith(repo);
  });

  it('does not open details from the explicit GitHub link', () => {
    const onOpenDetail = vi.fn();

    render(<RepositoryCard repo={createRepo()} autoHealth="Active" onOpenDetail={onOpenDetail} />);

    fireEvent.click(screen.getByRole('link', { name: 'alice/frontend-app をGitHubで開く' }));

    expect(onOpenDetail).not.toHaveBeenCalled();
  });
});

describe('RepositoryDetailPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows repository details and the explicit GitHub actions', () => {
    render(<RepositoryDetailPanel repo={createRepo()} autoHealth="Active" onClose={() => undefined} />);

    expect(screen.getByRole('dialog', { name: /frontend-app/ })).toBeTruthy();
    expect(screen.getByText('React dashboard')).toBeTruthy();
    expect(screen.getByText('https://github.com/alice/frontend-app')).toBeTruthy();
    expect(screen.getByText('TypeScript')).toBeTruthy();
    expect(screen.getAllByText('Public / 公開').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'alice/frontend-app をGitHubで開く' })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'https://github.com/alice/frontend-app' })).toBeNull();
  });

  it('shows private and archived states', () => {
    render(
      <RepositoryDetailPanel
        repo={{ ...createRepo(), isArchived: true, isPrivate: true }}
        autoHealth="Archived"
        onClose={() => undefined}
      />
    );

    expect(screen.getAllByText('Private / 非公開').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Archived / アーカイブ').length).toBeGreaterThan(0);
    expect(screen.getByText('Archived / アーカイブ済み')).toBeTruthy();
  });

  it('closes with the close button and Escape key', () => {
    const onClose = vi.fn();
    render(<RepositoryDetailPanel repo={createRepo()} autoHealth="Active" onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'リポジトリ詳細を閉じる' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
