// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PracticeIssueDraft } from '../../../types';
import { PullRequestPracticeWizard } from '../PullRequestPracticeWizard';

function createIssueDraft(): PracticeIssueDraft {
  return {
    id: 'issue-draft-1',
    repoId: 'repo-1',
    title: 'READMEを書く',
    reason: '使い方を伝える',
    doneCriteria: ['起動手順がある'],
    generatedMarkdown: '## やりたいこと\nREADMEを書く',
    syncStatus: 'local_only',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('PullRequestPracticeWizard', () => {
  afterEach(() => {
    cleanup();
  });

  it('uses beginner friendly copy and previews generated markdown', () => {
    render(
      <PullRequestPracticeWizard
        repoNameWithOwner="alice/frontend-app"
        issueDrafts={[createIssueDraft()]}
        onCancel={() => undefined}
        onSave={() => true}
      />
    );

    fireEvent.change(screen.getByLabelText('PRタイトル'), {
      target: { value: 'READMEに起動手順を追加する' },
    });
    fireEvent.change(screen.getByLabelText('関連するやることカード'), {
      target: { value: 'issue-draft-1' },
    });
    fireEvent.change(screen.getByLabelText('変更したこと'), {
      target: { value: 'READMEに起動手順を追加した\n環境変数を追記した' },
    });
    fireEvent.change(screen.getByLabelText('見てほしいこと'), {
      target: { value: '手順が初めての人にも分かるか' },
    });

    expect(
      screen.getByText('GitHubにはPR、ブランチ、コミットを作りません。変更したことと見てほしいことをPR風のMarkdownへ整えます。')
    ).toBeTruthy();
    expect(screen.getByText('Branch')).toBeTruthy();
    expect(screen.getByText('Merge')).toBeTruthy();
    expect(screen.getByLabelText('PR説明文Markdownプレビュー').textContent).toContain('## 変更の確認リクエスト');
    expect(screen.getByLabelText('PR説明文Markdownプレビュー').textContent).toContain('READMEを書く');
    expect(screen.getByLabelText('PR説明文Markdownプレビュー').textContent).toContain('- READMEに起動手順を追加した');
    expect(screen.getByLabelText('PR説明文Markdownプレビュー').textContent).toContain('- 手順が初めての人にも分かるか');
  });

  it('saves only the pull request practice fields', () => {
    const onSave = vi.fn(() => true);
    const onCancel = vi.fn();

    render(
      <PullRequestPracticeWizard
        repoNameWithOwner="alice/frontend-app"
        issueDrafts={[createIssueDraft()]}
        onCancel={onCancel}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByLabelText('PRタイトル'), { target: { value: 'READMEに起動手順を追加する' } });
    fireEvent.change(screen.getByLabelText('関連するやることカード'), { target: { value: 'issue-draft-1' } });
    fireEvent.change(screen.getByLabelText('変更したこと'), { target: { value: 'READMEを更新した' } });
    fireEvent.change(screen.getByLabelText('見てほしいこと'), { target: { value: 'リンク切れがないか' } });
    fireEvent.click(screen.getByRole('button', { name: 'PR下書きを保存' }));

    expect(onSave).toHaveBeenCalledWith({
      title: 'READMEに起動手順を追加する',
      changedItems: ['READMEを更新した'],
      reviewPoints: ['リンク切れがないか'],
      relatedIssueDraftId: 'issue-draft-1',
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
