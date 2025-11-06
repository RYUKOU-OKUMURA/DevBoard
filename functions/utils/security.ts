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

/** オリジン検証 */
export const validateOrigin = (
  origin: string | null,
  allowed: string | undefined
): string | null => {
  if (!origin) return null;
  
  // 環境変数が未設定の場合は全オリジンを許可（後方互換性）
  if (!allowed || allowed.trim() === '') {
    return origin;
  }
  
  const list = allowed.split(',').map(o => o.trim());
  if (list.includes(origin)) return origin;
  
  // ワイルドカード対応: *.example.com
  return list.some(pattern => 
    pattern.startsWith('*.') && origin.endsWith(pattern.slice(1))
  ) ? origin : null;
};

/** セッションクッキーの型定義 */
export interface SessionCookie {
  name: string;
  value: string;
  maxAge: number;
}

/** 複数クッキーを設定（正しい実装） */
export const setCookies = (headers: Headers, cookies: SessionCookie[]): void => {
  cookies.forEach(({ name, value, maxAge }) => {
    headers.append(
      'Set-Cookie',
      `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
    );
  });
};

/** クッキー削除 */
export const clearCookie = (headers: Headers, name: string): void => {
  headers.append(
    'Set-Cookie',
    `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
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

