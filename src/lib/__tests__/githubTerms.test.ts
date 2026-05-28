import { describe, expect, it } from 'vitest';
import { GITHUB_TERM_KEYS, getGitHubTerm, getGitHubTerms } from '../githubTerms';

describe('githubTerms', () => {
  it('returns the phase 6 GitHub terms in a stable order', () => {
    expect(GITHUB_TERM_KEYS).toEqual(['issue', 'pullRequest', 'branch', 'merge']);
    expect(getGitHubTerms().map((term) => term.label)).toEqual(['Issue', 'Pull Request', 'Branch', 'Merge']);
  });

  it('pairs each GitHub term with beginner friendly Japanese copy', () => {
    const terms = getGitHubTerms();

    expect(terms).toHaveLength(4);
    terms.forEach((term) => {
      expect(term.beginnerLabel).toMatch(/[ぁ-んァ-ン一-龥]/);
      expect(term.description).toMatch(/[ぁ-んァ-ン一-龥]/);
      expect(term.description.length).toBeLessThanOrEqual(50);
    });
  });

  it('explains Issue as a task card', () => {
    expect(getGitHubTerm('issue')).toMatchObject({
      label: 'Issue',
      beginnerLabel: 'やること・困りごとのカード',
      description: expect.stringContaining('カード'),
    });
  });

  it('explains Pull Request as a change review request', () => {
    expect(getGitHubTerm('pullRequest')).toMatchObject({
      label: 'Pull Request',
      beginnerLabel: '変更の確認リクエスト',
      description: expect.stringContaining('見てもらう'),
    });
  });

  it('explains Branch and Merge as connected beginner concepts', () => {
    expect(getGitHubTerm('branch')).toMatchObject({
      label: 'Branch',
      beginnerLabel: '作業用の分かれ道',
      description: expect.stringContaining('作業場所'),
    });
    expect(getGitHubTerm('merge')).toMatchObject({
      label: 'Merge',
      beginnerLabel: '変更を合流すること',
      description: expect.stringContaining('取り込む'),
    });
  });

  it('can return a focused subset for compact UI hints', () => {
    expect(getGitHubTerms(['branch', 'merge']).map((term) => term.key)).toEqual(['branch', 'merge']);
  });
});
