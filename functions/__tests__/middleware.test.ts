import { describe, expect, it } from 'vitest';
import { onRequest } from '../_middleware';

type KVValue = string | null;

const createKV = () => {
  const store = new Map<string, KVValue>();

  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
};

const makeRequest = ({
  path,
  method,
  origin,
  headers,
  body,
}: {
  path: string;
  method: string;
  origin?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
}) => {
  const requestHeaders: Record<string, string> = headers ? { ...headers } : {};
  if (origin) {
    requestHeaders.Origin = origin;
  }

  return new Request(`https://devboard.test${path}`, {
    method,
    headers: requestHeaders,
    body,
  });
};

const nextOk = async () => new Response('ok', { status: 200 });

describe('global middleware CORS/CSRF guards', () => {
  it('rejects preflight when origin is not allowed by default', async () => {
    const env = { SESSIONS: createKV() } as any;
    const request = makeRequest({
      path: '/api/auth/status',
      method: 'OPTIONS',
      origin: 'https://evil.example',
      headers: { 'Access-Control-Request-Method': 'POST' },
    });

    const response = await onRequest({ request, env, next: nextOk } as any);

    expect(response.status).toBe(403);
  });

  it('allows same-origin when ALLOWED_ORIGINS is unset', async () => {
    const env = { SESSIONS: createKV() } as any;
    const request = makeRequest({
      path: '/api/auth/status',
      method: 'GET',
      origin: 'https://devboard.test',
    });

    const response = await onRequest({ request, env, next: nextOk } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://devboard.test');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('rejects authenticated endpoints when origin is not in allow list', async () => {
    const env = {
      SESSIONS: createKV(),
      ALLOWED_ORIGINS: 'https://app.example.com',
    } as any;
    const request = makeRequest({
      path: '/api/github/repos',
      method: 'GET',
      origin: 'https://evil.example',
    });

    const response = await onRequest({ request, env, next: nextOk } as any);

    expect(response.status).toBe(403);
  });

  it('rejects mutating API requests without a valid Origin', async () => {
    const env = {
      SESSIONS: createKV(),
      ALLOWED_ORIGINS: 'https://app.example.com',
    } as any;
    const request = makeRequest({
      path: '/api/todos',
      method: 'POST',
    });

    const response = await onRequest({ request, env, next: nextOk } as any);

    expect(response.status).toBe(403);
  });

  it('allows mutating auth API requests from allowed origins and sets credentials header', async () => {
    const env = {
      SESSIONS: createKV(),
      ALLOWED_ORIGINS: 'https://app.example.com',
    } as any;
    const request = makeRequest({
      path: '/api/auth/status',
      method: 'POST',
      origin: 'https://app.example.com',
    });

    const response = await onRequest({ request, env, next: nextOk } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('does not allow credentialed responses when wildcard is used', async () => {
    const env = {
      SESSIONS: createKV(),
      ALLOWED_ORIGINS: '*',
    } as any;
    const request = makeRequest({
      path: '/api/auth/status',
      method: 'GET',
      origin: 'https://any.example',
    });

    const response = await onRequest({ request, env, next: nextOk } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://any.example');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull();
  });
});
