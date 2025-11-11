/**
 * 開発環境のみログ出力するユーティリティ
 */

const isDevelopment = import.meta.env.DEV;

/**
 * 開発環境でのみconsole.logを実行
 */
export function devLog(...args: unknown[]): void {
  if (isDevelopment) {
    console.log(...args);
  }
}

/**
 * 開発環境でのみconsole.errorを実行
 * 本番環境でもエラーは記録すべき場合があるため、必要に応じてエラートラッキングサービスに送信
 */
export function devError(...args: unknown[]): void {
  if (isDevelopment) {
    console.error(...args);
  }
  // 本番環境では、必要に応じてエラートラッキングサービスに送信
  // 例: Sentry.captureException(new Error(args.join(' ')));
}

/**
 * 開発環境でのみconsole.warnを実行
 */
export function devWarn(...args: unknown[]): void {
  if (isDevelopment) {
    console.warn(...args);
  }
}

/**
 * 開発環境でのみconsole.infoを実行
 */
export function devInfo(...args: unknown[]): void {
  if (isDevelopment) {
    console.info(...args);
  }
}

/**
 * 本番環境でも実行されるエラーログ（重要なエラーのみ）
 */
export function logError(...args: unknown[]): void {
  console.error(...args);
  // 本番環境では、必要に応じてエラートラッキングサービスに送信
}

