import { NetworkError, RateLimitError } from '@/utils/errorHandling';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface JsonRequestOptions extends RequestInit {
  /**
   * API のベースパス。`/api` を前提にしているが、用途に応じて上書き可能。
   */
  basePath?: string;
  /**
   * JSON としてシリアライズするペイロード。
   * 既に `body` が設定されている場合は `json` は無視される。
   */
  json?: unknown;
  /**
   * レスポンスを JSON としてパースしない場合に指定。
   */
  skipJsonParse?: boolean;
  /**
   * 期待する HTTP メソッド。デフォルトは GET。
   */
  method?: HttpMethod;
}

export interface ApiClient {
  get<T>(path: string, options?: Omit<JsonRequestOptions, 'method' | 'json'>): Promise<T>;
  post<T>(path: string, json?: unknown, options?: Omit<JsonRequestOptions, 'method' | 'json'>): Promise<T>;
  patch<T>(path: string, json?: unknown, options?: Omit<JsonRequestOptions, 'method' | 'json'>): Promise<T>;
  del<T>(path: string, options?: Omit<JsonRequestOptions, 'method' | 'json'>): Promise<T>;
}

function buildUrl(path: string, basePath: string) {
  if (path.startsWith('http')) return path;
  return `${basePath}${path}`;
}

function ensureHeaders(base?: HeadersInit): Record<string, string> {
  if (!base) return {};
  if (base instanceof Headers) {
    const headers: Record<string, string> = {};
    base.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }
  return { ...base } as Record<string, string>;
}

/**
 * 共通の JSON フェッチャー。GitHub API に合わせ、レートリミット情報も処理する。
 */
export async function requestJson<T>(path: string, options: JsonRequestOptions = {}): Promise<T> {
  const {
    basePath = '/api',
    method = 'GET',
    json,
    skipJsonParse = false,
    headers: headerInit,
    credentials = 'include',
    ...rest
  } = options;

  const headers = ensureHeaders(headerInit);
  const hasJsonBody = json !== undefined;
  if (hasJsonBody && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = buildUrl(path, basePath);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      method,
      credentials,
      headers,
      body: rest.body ?? (hasJsonBody ? JSON.stringify(json) : undefined),
    });
  } catch (error) {
    throw new NetworkError('Failed to reach API server', error);
  }

  const resetHeader = response.headers.get('x-ratelimit-reset');
  const remainingHeader = response.headers.get('x-ratelimit-remaining');
  const resetAt =
    resetHeader && Number.isFinite(Number(resetHeader))
      ? new Date(Number(resetHeader) * 1000)
      : undefined;

  if (response.status === 429 || (response.status === 403 && remainingHeader === '0')) {
    throw new RateLimitError('API rate limit exceeded.', resetAt);
  }

  if (response.status === 401) {
    throw new Error('Authentication required. Please log in again.');
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `API request failed with status ${response.status}${errorBody ? `: ${errorBody}` : ''}`
    );
  }

  if (skipJsonParse) {
    // @ts-expect-error 明示的に JSON をパースしない場合、呼び出し側の責務で型を保証する
    return undefined;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error('Failed to parse API response as JSON');
  }
}

/**
 * ベースパスを固定したシンプルなクライアント。
 */
export function createApiClient(basePath = '/api'): ApiClient {
  return {
    get: (path, options) => requestJson(path, { ...options, basePath, method: 'GET' }),
    post: (path, json, options) =>
      requestJson(path, { ...options, basePath, method: 'POST', json }),
    patch: (path, json, options) =>
      requestJson(path, { ...options, basePath, method: 'PATCH', json }),
    del: (path, options) => requestJson(path, { ...options, basePath, method: 'DELETE' }),
  };
}
