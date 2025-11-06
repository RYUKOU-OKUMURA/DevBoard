const RATE_LIMIT_KEY = "devboard_api_rate_limit";
const MAX_REQUESTS = 3; // 最大リクエスト数
const TIME_WINDOW_MS = 60 * 1000; // 1分

type RateLimitData = {
  requestTimestamps: number[];
};

/**
 * レート制限をチェックし、リクエスト可能かどうかを判定
 * @returns {allowed: boolean, remainingRequests: number, resetTime: number | null}
 */
export function checkRateLimit(): {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number | null;
} {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    let timestamps: number[] = [];

    if (stored) {
      const data: RateLimitData = JSON.parse(stored);
      // 1分以内のタイムスタンプのみを保持
      timestamps = data.requestTimestamps.filter(
        (ts) => now - ts < TIME_WINDOW_MS
      );
    }

    // リクエスト数が制限以下かチェック
    if (timestamps.length < MAX_REQUESTS) {
      return {
        allowed: true,
        remainingRequests: MAX_REQUESTS - timestamps.length - 1,
        resetTime: null,
      };
    }

    // 制限に達している場合、最も古いリクエストから1分後にリセット
    const oldestTimestamp = Math.min(...timestamps);
    const resetTime = oldestTimestamp + TIME_WINDOW_MS;

    return {
      allowed: false,
      remainingRequests: 0,
      resetTime,
    };
  } catch (error) {
    console.error("Failed to check rate limit:", error);
    // エラー時は許可する（フェイルオープン）
    return {
      allowed: true,
      remainingRequests: MAX_REQUESTS - 1,
      resetTime: null,
    };
  }
}

/**
 * リクエストを記録
 */
export function recordRequest(): void {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    let timestamps: number[] = [];

    if (stored) {
      const data: RateLimitData = JSON.parse(stored);
      // 1分以内のタイムスタンプのみを保持
      timestamps = data.requestTimestamps.filter(
        (ts) => now - ts < TIME_WINDOW_MS
      );
    }

    // 新しいリクエストを追加
    timestamps.push(now);

    const data: RateLimitData = {
      requestTimestamps: timestamps,
    };

    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to record request:", error);
  }
}

/**
 * レート制限をリセット（デバッグ用）
 */
export function resetRateLimit(): void {
  try {
    localStorage.removeItem(RATE_LIMIT_KEY);
  } catch (error) {
    console.error("Failed to reset rate limit:", error);
  }
}

/**
 * レート制限エラーメッセージを生成
 */
export function getRateLimitErrorMessage(resetTime: number): string {
  const waitSeconds = Math.ceil((resetTime - Date.now()) / 1000);
  return `APIリクエスト制限に達しました。あと${waitSeconds}秒後に再試行できます。`;
}
