export interface PracticeIssueTemplateInput {
  title: string;
  reason: string;
  doneCriteria: string[];
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
