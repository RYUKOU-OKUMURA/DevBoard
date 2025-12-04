// Security utilities for OAuth, CORS, and cookie management

import { nanoid } from 'nanoid';
import type { Env } from '../lib/types';

/** PKCE code_verifier生成 */
export const generateCodeVerifier = (): string => nanoid(43);

/** PKCE code_challenge生成 */
export const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  );
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export interface OriginValidationResult {
  origin: string | null;
  matchedWildcard: boolean;
}

/** オリジン検証 */
export const validateOrigin = (
  origin: string | null,
  allowed: string | undefined,
  requestOrigin?: string
): OriginValidationResult => {
  if (!origin) {
    return { origin: null, matchedWildcard: false };
  }

  const list = (allowed ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // 環境変数未設定時はデフォルト拒否。同一オリジンは許可。
  if (list.length === 0) {
    return {
      origin: requestOrigin && origin === requestOrigin ? origin : null,
      matchedWildcard: false,
    };
  }

  if (list.includes(origin)) {
    return { origin, matchedWildcard: false };
  }

  const subdomainAllowed = list.some(
    (pattern) => pattern.startsWith('*.') && origin.endsWith(pattern.slice(1))
  );
  if (subdomainAllowed) {
    return { origin, matchedWildcard: false };
  }

  if (list.includes('*')) {
    return { origin, matchedWildcard: true };
  }

  return { origin: null, matchedWildcard: false };
};

/** セッションクッキーの型定義 */
export interface SessionCookie {
  name: string;
  value: string;
  maxAge: number;
}

export interface CookieOptions {
  secure?: boolean;
}

const buildCookieAttributes = (secure: boolean): string => {
  return `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
};

/** 複数クッキーを設定（正しい実装） */
export const setCookies = (
  headers: Headers,
  cookies: SessionCookie[],
  options: CookieOptions = {}
): void => {
  const secure = options.secure ?? true;
  const base = buildCookieAttributes(secure);
  cookies.forEach(({ name, value, maxAge }) => {
    headers.append(
      'Set-Cookie',
      `${name}=${encodeURIComponent(value)}; ${base}; Max-Age=${maxAge}`
    );
  });
};

/** クッキー削除 */
export const clearCookie = (headers: Headers, name: string, options: CookieOptions = {}): void => {
  const secure = options.secure ?? true;
  const base = buildCookieAttributes(secure);
  headers.append(
    'Set-Cookie',
    `${name}=; ${base}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
};

/** クッキーから値取得（安全） */
export const getCookie = (request: Request, name: string): string | null => {
  try {
    const cookie = request.headers.get('Cookie');
    if (!cookie) return null;
    
    const match = cookie.match(new RegExp(`${name}=([^;]+)`));
    if (!match) return null;
    
    const decoded = decodeURIComponent(match[1]);
    return decoded;
  } catch {
    return null;
  }
};

/** CORSオプション */
export interface CORSOptions {
  origin: string | null;
  credentials: boolean;
}

/** CORSヘッダー設定（統合版） */
export const applyCORS = (
  response: Response,
  { origin, credentials }: CORSOptions
): Response => {
  if (!origin) return response;
  
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Vary', 'Origin');
  
  if (credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};

/** キャッシュ抑止ヘッダー */
export const applyNoCache = (headers: Headers): void => {
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
};

/** レート制限設定 */
export const RATE_LIMIT = {
  MAX_REQUESTS: 10,      // 1分間あたりの最大リクエスト数
  WINDOW_SECONDS: 60,    // 時間窓（秒）
};

/** リクエストからIPアドレスを取得 */
export const getClientIP = (request: Request): string => {
  // Cloudflare Workersでは CF-Connecting-IP ヘッダーから取得
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) return cfIP;
  
  // フォールバック: X-Forwarded-For の最初のIP
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  // それでも取得できない場合はデフォルト値
  return 'unknown';
};

/** レート制限チェック */
export const checkRateLimit = async (
  kv: KVNamespace,
  identifier: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => {
  const now = Date.now();
  const windowMs = RATE_LIMIT.WINDOW_SECONDS * 1000;
  const key = `rate_limit:${identifier}`;
  
  // KVからリクエスト履歴を取得
  const historyJson = await kv.get(key);
  let timestamps: number[] = [];
  
  if (historyJson) {
    try {
      timestamps = JSON.parse(historyJson) as number[];
    } catch {
      timestamps = [];
    }
  }
  
  // 1分以内のリクエストのみをフィルタリング
  const recentTimestamps = timestamps.filter(
    (ts) => now - ts < windowMs
  );
  
  // リクエスト数が上限を超えているかチェック
  const count = recentTimestamps.length;
  const allowed = count < RATE_LIMIT.MAX_REQUESTS;
  
  if (allowed) {
    // 現在のリクエストを追加
    recentTimestamps.push(now);
    
    // KVに保存（TTLはウィンドウ時間 + 10秒のバッファ）
    await kv.put(
      key,
      JSON.stringify(recentTimestamps),
      { expirationTtl: RATE_LIMIT.WINDOW_SECONDS + 10 }
    );
  }
  
  // リセット時刻を計算（最も古いリクエストの時刻 + ウィンドウ時間）
  const oldestTimestamp = recentTimestamps.length > 0
    ? Math.min(...recentTimestamps)
    : now;
  const resetAt = oldestTimestamp + windowMs;
  
  return {
    allowed,
    remaining: Math.max(0, RATE_LIMIT.MAX_REQUESTS - count - (allowed ? 1 : 0)),
    resetAt: Math.ceil(resetAt / 1000), // Unix timestamp (秒)
  };
};

/** レート制限エラーレスポンスを生成 */
export const createRateLimitResponse = (
  resetAt: number,
  origin: string | null
): Response => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Retry-After': String(Math.max(1, resetAt - Math.floor(Date.now() / 1000))),
    'X-RateLimit-Limit': String(RATE_LIMIT.MAX_REQUESTS),
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': String(resetAt),
  });
  
  applyNoCache(headers);
  
  const response = new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${RATE_LIMIT.MAX_REQUESTS} requests per ${RATE_LIMIT.WINDOW_SECONDS} seconds.`,
      retryAfter: resetAt - Math.floor(Date.now() / 1000),
    }),
    {
      status: 429,
      headers,
    }
  );
  
  return applyCORS(response, {
    origin,
    credentials: false,
  });
};
