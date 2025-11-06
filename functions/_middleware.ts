// Global middleware for CORS and security headers

import type { Env } from './lib/types';
import {
  validateOrigin,
  applyCORS,
  applyNoCache,
  getClientIP,
  checkRateLimit,
  createRateLimitResponse,
} from './utils/security';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const { pathname } = new URL(request.url);
  const origin = request.headers.get('Origin');

  // 1. オリジン検証
  const validOrigin = validateOrigin(origin, env.ALLOWED_ORIGINS);

  // 2. preflight処理（レート制限の対象外）
  if (request.method === 'OPTIONS') {
    if (validOrigin) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': validOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin'
        }
      });
    } else {
      return new Response(null, { status: 403 });
    }
  }

  // 2.5. レート制限チェック（APIエンドポイントのみ）
  let rateLimitResult: { allowed: boolean; remaining: number; resetAt: number } | null = null;
  if (pathname.startsWith('/api/')) {
    const clientIP = getClientIP(request);
    rateLimitResult = await checkRateLimit(env.SESSIONS, clientIP);
    
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.resetAt, validOrigin);
    }
  }

  // 3. 認証パスの判定
  const isAuthPath = pathname.startsWith('/api/auth/') && 
                     !pathname.includes('/login') && 
                     !pathname.includes('/callback');
  const isGithubPath = pathname.startsWith('/api/github/');
  const requiresAuth = isAuthPath || isGithubPath;

  // 4. 認証が必要なパスでオリジン検証
  // 同一オリジンリクエスト（Originヘッダーがない場合）は許可
  // クロスオリジンリクエストの場合のみ検証
  if (requiresAuth && origin && !validOrigin) {
    return new Response('Forbidden', { status: 403 });
  }

  // 5. リクエスト処理
  const response = await next();

  // 6. レスポンスヘッダー設定
  const headers = new Headers(response.headers);

  // セキュリティヘッダー
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-XSS-Protection', '1; mode=block');

  // レート制限情報ヘッダー（APIエンドポイントの場合、既にチェック済みの結果を使用）
  if (pathname.startsWith('/api/') && rateLimitResult) {
    headers.set('X-RateLimit-Limit', '10');
    headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    headers.set('X-RateLimit-Reset', String(rateLimitResult.resetAt));
  }

  // キャッシュ制御（認証エンドポイント）
  if (requiresAuth || pathname.startsWith('/api/auth/')) {
    applyNoCache(headers);
  }

  // レスポンス作成
  const modifiedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });

  // CORS適用
  return applyCORS(modifiedResponse, {
    origin: validOrigin,
    credentials: requiresAuth || pathname.startsWith('/api/auth/')
  });
};
