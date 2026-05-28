import { describe, expect, it } from 'vitest';
import { generatePracticeIssueMarkdown, parseDoneCriteria } from '../practiceTemplates';

describe('practiceTemplates', () => {
  it('parses multiline done criteria into a clean list', () => {
    expect(parseDoneCriteria('ボタンの色が目立つ\n- 説明文が短い\n\n* スマホ幅で崩れない')).toEqual([
      'ボタンの色が目立つ',
      '説明文が短い',
      'スマホ幅で崩れない',
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
});
