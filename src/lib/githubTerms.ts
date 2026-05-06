export type GitHubTermKey = 'issue' | 'pullRequest' | 'branch' | 'merge';

export interface GitHubTerm {
  key: GitHubTermKey;
  label: string;
  beginnerLabel: string;
  description: string;
}

export const GITHUB_TERM_KEYS = ['issue', 'pullRequest', 'branch', 'merge'] as const satisfies readonly GitHubTermKey[];

const GITHUB_TERMS: Record<GitHubTermKey, GitHubTerm> = {
  issue: {
    key: 'issue',
    label: 'Issue',
    beginnerLabel: 'やること・困りごとのカード',
    description: '直したいこと、追加したいこと、相談したいことを1つのカードとして残す場所です。',
  },
  pullRequest: {
    key: 'pullRequest',
    label: 'Pull Request',
    beginnerLabel: '変更の確認リクエスト',
    description: '自分の変更をプロジェクトに入れてよいか、内容を見てもらうための依頼です。',
  },
  branch: {
    key: 'branch',
    label: 'Branch',
    beginnerLabel: '作業用の分かれ道',
    description: '本番用の流れを壊さずに、新しい修正や実験を進めるための作業場所です。',
  },
  merge: {
    key: 'merge',
    label: 'Merge',
    beginnerLabel: '変更を合流すること',
    description: '作業用の分かれ道で作った変更を、元の流れに取り込む操作です。',
  },
};

export function getGitHubTerm(key: GitHubTermKey): GitHubTerm {
  return GITHUB_TERMS[key];
}

export function getGitHubTerms(keys: readonly GitHubTermKey[] = GITHUB_TERM_KEYS): GitHubTerm[] {
  return keys.map((key) => getGitHubTerm(key));
}
