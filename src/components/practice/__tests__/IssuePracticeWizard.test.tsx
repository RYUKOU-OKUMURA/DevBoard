// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IssuePracticeWizard } from '../IssuePracticeWizard';

describe('IssuePracticeWizard', () => {
  afterEach(() => {
    cleanup();
  });

  it('uses beginner friendly copy and previews generated markdown', () => {
    render(
      <IssuePracticeWizard
        repoNameWithOwner="alice/frontend-app"
        onCancel={() => undefined}
        onSave={() => true}
      />
    );

    fireEvent.change(screen.getByLabelText('やりたいこと'), {
      target: { value: 'トップページのボタンを見やすくする' },
    });
    fireEvent.change(screen.getByLabelText('なぜやる？'), {
      target: { value: '初めて見る人に分かりやすくしたいから' },
    });
    fireEvent.change(screen.getByLabelText('終わりの条件'), {
      target: { value: 'ボタンの色が目立つ\n説明文が短い' },
    });

    expect(screen.getByText('GitHubには作成しません。あとで見返せるように、やることをIssue風のMarkdownへ整えます。')).toBeTruthy();
    expect(screen.getByLabelText('生成Markdownプレビュー').textContent).toContain('## やりたいこと');
    expect(screen.getByLabelText('生成Markdownプレビュー').textContent).toContain('- ボタンの色が目立つ');
    expect(screen.getByLabelText('生成Markdownプレビュー').textContent).toContain('- 説明文が短い');
  });

  it('saves only the three practice fields', () => {
    const onSave = vi.fn(() => true);
    const onCancel = vi.fn();

    render(
      <IssuePracticeWizard
        repoNameWithOwner="alice/frontend-app"
        onCancel={onCancel}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByLabelText('やりたいこと'), { target: { value: 'READMEを書く' } });
    fireEvent.change(screen.getByLabelText('なぜやる？'), { target: { value: '使い方を伝える' } });
    fireEvent.change(screen.getByLabelText('終わりの条件'), { target: { value: '起動手順がある' } });
    fireEvent.click(screen.getByRole('button', { name: '下書きを保存' }));

    expect(onSave).toHaveBeenCalledWith({
      title: 'READMEを書く',
      reason: '使い方を伝える',
      doneCriteria: ['起動手順がある'],
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
