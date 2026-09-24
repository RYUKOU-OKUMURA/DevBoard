import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequest as onCallback } from '../api/auth/callback';
import { onRequest as onLogin } from '../api/auth/login';
import { onRequest as onMiddleware } from '../_middleware';

const validSessionSecret = 'ab'.repeat(32);
const validEncryptionKey = 'cd'.repeat(32);
const invalidSecrets = [
  ['short SESSION_SECRET', { SESSION_SECRET: 'ab'.repeat(31) }],
  ['non-hex SESSION_SECRET', { SESSION_SECRET: 'zz'.repeat(32) }],
  ['missing SESSION_SECRET', { SESSION_SECRET: undefined }],
  ['31-byte ENCRYPTION_KEY', { ENCRYPTION_KEY: 'ab'.repeat(31) }],
  ['33-byte ENCRYPTION_KEY', { ENCRYPTION_KEY: 'ab'.repeat(33) }],
  ['non-hex ENCRYPTION_KEY', { ENCRYPTION_KEY: 'zz'.repeat(32) }],
  ['missing ENCRYPTION_KEY', { ENCRYPTION_KEY: undefined }],
] as const;

const createKV = (initialData: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initialData));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
  };
};

const callEndpoint = async (
  endpoint: (context: any) => Promise<Response>,
  path: string,
  {
    headers,
    initialKV,
    env: envOverrides = {},
  }: {
    headers?: Record<string, string>;
    initialKV?: Record<string, string>;
    env?: Record<string, unknown>;
  } = {},
) => {
  const SESSIONS = createKV(initialKV);
  const env = {
    GITHUB_CLIENT_ID: 'client-id',
    GITHUB_CLIENT_SECRET: 'client-secret',
    SESSION_SECRET: validSessionSecret,
    ENCRYPTION_KEY: validEncryptionKey,
    SESSIONS,
    LOCAL_DEV: 'true',
    ...envOverrides,
  };
  const request = new Request(`https://devboard.test${path}`, { headers });
  const response = await onMiddleware({
    request,
    env,
    next: () => endpoint({ request, env }),
  } as any);

  return { response, env, SESSIONS };
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('auth endpoints fail closed for invalid secrets', () => {
  it.each(invalidSecrets)('rejects login when %s', async (_name, env) => {
    const { response, SESSIONS } = await callEndpoint(onLogin, '/api/auth/login', { env });

    expect(response.status).toBe(503);
    expect(await response.text()).toBe(
      'サーバーの認証設定が不完全です。管理者は /api/auth/status を確認してください。',
    );
    expect(response.headers.get('Location')).toBeNull();
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(SESSIONS.put).not.toHaveBeenCalled();
    expect(SESSIONS.get).not.toHaveBeenCalled();
    expect(SESSIONS.delete).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(invalidSecrets)('rejects callback when %s', async (_name, env) => {
    const { response, SESSIONS } = await callEndpoint(
      onCallback,
      '/api/auth/callback?code=oauth-code&state=oauth-session.nonce',
      { headers: { Cookie: 'oauth_session=oauth-session' }, env },
    );

    expect(response.status).toBe(503);
    expect(await response.text()).toBe(
      'サーバーの認証設定が不完全です。管理者は /api/auth/status を確認してください。',
    );
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(SESSIONS.put).not.toHaveBeenCalled();
    expect(SESSIONS.get).not.toHaveBeenCalled();
    expect(SESSIONS.delete).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('auth endpoints preserve valid-secret behavior', () => {
  it('starts the GitHub login redirect', async () => {
    const { response, SESSIONS } = await callEndpoint(onLogin, '/api/auth/login');

    expect(response.status).toBe(302);
    expect(new URL(response.headers.get('Location')!).origin).toBe('https://github.com');
    expect(new URL(response.headers.get('Location')!).pathname).toBe('/login/oauth/authorize');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(SESSIONS.put).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('completes the callback and creates the session', async () => {
    const state = 'oauth-session.nonce';
    const session = JSON.stringify({
      state,
      codeVerifier: 'code-verifier',
      sessionId: 'oauth-session',
      createdAt: Date.now(),
    });
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'github-token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 123, login: 'alice' })));

    const { response, SESSIONS } = await callEndpoint(
      onCallback,
      `/api/auth/callback?code=oauth-code&state=${encodeURIComponent(state)}`,
      {
        headers: { Cookie: 'oauth_session=oauth-session' },
        initialKV: { 'oauth_session:oauth-session': session },
      },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://devboard.test');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(SESSIONS.delete).toHaveBeenCalledWith('oauth_session:oauth-session');
    expect(SESSIONS.put).toHaveBeenCalledWith(expect.stringMatching(/^session:/), expect.any(String), expect.any(Object));
  });
});
