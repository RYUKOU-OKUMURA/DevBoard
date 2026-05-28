import { describe, expect, it } from 'vitest';
import {
  generatePracticeIssueMarkdown,
  generatePracticePullRequestMarkdown,
  parseDoneCriteria,
  parsePracticeList,
} from '../practiceTemplates';

describe('practiceTemplates', () => {
  it('parses multiline done criteria into a clean list', () => {
    expect(parseDoneCriteria('ボタンの色が目立つ\n- 説明文が短い\n\n* スマホ幅で崩れない')).toEqual([
      'ボタンの色が目立つ',
      '説明文が短い',
      'スマホ幅で崩れない',
    ]);
  });

  it('parses pull request list fields into clean lists', () => {
    expect(parsePracticeList('READMEを更新\n- 環境変数を追記\n\n* リンクを確認')).toEqual([
      'READMEを更新',
      '環境変数を追記',
      'リンクを確認',
    ]);
  });

  it('generates markdown with beginner friendly sections', () => {
    const markdown = generatePracticeIssueMarkdown({
      title: 'トップページのボタンを見やすくする',
      reason: '初めて見る人に分かりやすくしたいから',
      doneCriteria: ['ボタンの色が目立つ', '説明文が短く分かりやすい'],
    });

    expect(markdown).toContain('## やりたいこと');
    expect(markdown).toContain('トップページのボタンを見やすくする');
    expect(markdown).toContain('## 理由');
    expect(markdown).toContain('初めて見る人に分かりやすくしたいから');
    expect(markdown).toContain('## 完了条件');
    expect(markdown).toContain('- ボタンの色が目立つ');
    expect(markdown).toContain('- 説明文が短く分かりやすい');
  });

  it('generates pull request practice markdown without implying GitHub creation', () => {
    const markdown = generatePracticePullRequestMarkdown({
      title: 'READMEに起動手順を追加する',
      changedItems: ['READMEに起動手順を追加した', '必要な環境変数を追記した'],
      reviewPoints: ['手順が初めての人にも分かるか'],
      relatedIssueTitle: 'READMEを書く',
    });

    expect(markdown).toContain('## 変更の確認リクエスト');
    expect(markdown).toContain('READMEに起動手順を追加する');
    expect(markdown).toContain('## 関連するやることカード');
    expect(markdown).toContain('READMEを書く');
    expect(markdown).toContain('## 変更したこと');
    expect(markdown).toContain('- READMEに起動手順を追加した');
    expect(markdown).toContain('## 見てほしいこと');
    expect(markdown).toContain('- 手順が初めての人にも分かるか');
  });
});
