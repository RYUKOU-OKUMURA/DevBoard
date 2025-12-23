export type FeedbackCategory = 'bug' | 'feature' | 'other';

export interface FeedbackPayload {
  category: FeedbackCategory;
  content: string;
  email?: string;
  timestamp: string;
  userAgent: string;
}

const DEFAULT_ENDPOINT = '/api/feedback';

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  const endpoint = import.meta.env.VITE_FEEDBACK_ENDPOINT || DEFAULT_ENDPOINT;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const suffix = detail ? `: ${detail}` : '';
    throw new Error(`フィードバックの送信に失敗しました${suffix}`);
  }
}
