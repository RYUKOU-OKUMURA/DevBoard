export interface PracticeIssueTemplateInput {
  title: string;
  reason: string;
  doneCriteria: string[];
}

export interface PracticePullRequestTemplateInput {
  title: string;
  changedItems: string[];
  reviewPoints: string[];
  relatedIssueTitle?: string | null;
}

function normalizeLines(lines: string[]): string[] {
  return lines
    .map((line) => line.trim().replace(/^[-*]\s+/, ''))
    .filter((line) => line.length > 0);
}

function readText(value: string, fallback: string): string {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function parseDoneCriteria(value: string): string[] {
  return normalizeLines(value.split(/\r?\n/));
}

export function parsePracticeList(value: string): string[] {
  return normalizeLines(value.split(/\r?\n/));
}

export function generatePracticeIssueMarkdown(input: PracticeIssueTemplateInput): string {
  const title = readText(input.title, '（まだ入力されていません）');
  const reason = readText(input.reason, '（理由をあとで書きます）');
  const criteria = normalizeLines(input.doneCriteria);
  const criteriaMarkdown =
    criteria.length > 0
      ? criteria.map((criterion) => `- ${criterion}`).join('\n')
      : '- （終わりの条件をあとで書きます）';

  return [`## やりたいこと`, title, ``, `## 理由`, reason, ``, `## 完了条件`, criteriaMarkdown].join('\n');
}

export function generatePracticePullRequestMarkdown(input: PracticePullRequestTemplateInput): string {
  const title = readText(input.title, '（まだ入力されていません）');
  const changedItems = normalizeLines(input.changedItems);
  const reviewPoints = normalizeLines(input.reviewPoints);
  const relatedIssueTitle = input.relatedIssueTitle?.trim();
  const changedItemsMarkdown =
    changedItems.length > 0
      ? changedItems.map((item) => `- ${item}`).join('\n')
      : '- （変更したことをあとで書きます）';
  const reviewPointsMarkdown =
    reviewPoints.length > 0
      ? reviewPoints.map((point) => `- ${point}`).join('\n')
      : '- （見てほしいことをあとで書きます）';

  return [
    `## 変更の確認リクエスト`,
    title,
    ``,
    `## 関連するやることカード`,
    relatedIssueTitle || 'なし',
    ``,
    `## 変更したこと`,
    changedItemsMarkdown,
    ``,
    `## 見てほしいこと`,
    reviewPointsMarkdown,
  ].join('\n');
}
