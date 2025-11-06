/**
 * タイムスタンプを日本語の相対時間にフォーマット
 * @param timestamp - Unix timestamp (milliseconds)
 * @returns 相対時間の文字列 (例: "3分前", "1時間前")
 */
export function formatLastUpdateTime(timestamp: number | null): string {
  if (!timestamp) return '未更新';

  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return `${diffSeconds}秒前`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  } else if (diffHours < 24) {
    return `${diffHours}時間前`;
  } else {
    return `${diffDays}日前`;
  }
}
