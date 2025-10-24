// Diagnostics endpoint - reports auth configuration readiness (safe, no secrets)

import type { Env } from '../../lib/types';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  const url = new URL(request.url);
  const origin = url.origin;

  // If PUBLIC_ORIGIN is provided, prefer it for redirect_uri computation
  const publicOrigin = (env as any).PUBLIC_ORIGIN as string | undefined;
  const effectiveOrigin = publicOrigin || origin;
  const expectedCallback = `${effectiveOrigin}/api/auth/callback`;

  // Check presence of required secrets (booleans only)
  const hasClientId = Boolean(env.GITHUB_CLIENT_ID);
  const hasClientSecret = Boolean(env.GITHUB_CLIENT_SECRET);
  const hasEncryptionKey = Boolean(env.ENCRYPTION_KEY);

  // KV health check (no user data, short‑lived dummy key)
  let kvOk = false;
  let kvError: string | null = null;
  const testKey = `healthcheck:${crypto.randomUUID()}`;
  try {
    await env.SESSIONS.put(testKey, 'ok', { expirationTtl: 60 });
    const v = await env.SESSIONS.get(testKey, 'text');
    kvOk = v === 'ok';
    await env.SESSIONS.delete(testKey);
  } catch (e: any) {
    kvOk = false;
    kvError = String(e?.message || e);
  }

  // Summarize readiness
  const ready = hasClientId && hasClientSecret && hasEncryptionKey && kvOk;

  const body = {
    ok: ready,
    environment: {
      hasClientId,
      hasClientSecret,
      hasEncryptionKey,
      kvOk,
      kvError,
      publicOriginConfigured: Boolean(publicOrigin),
      computed: {
        origin,
        effectiveOrigin,
        expectedCallback,
      },
    },
    guidance: {
      secrets: [
        'Set GITHUB_CLIENT_ID (Cloudflare Pages → Settings → Environment variables)',
        'Set GITHUB_CLIENT_SECRET (same as above)',
        'Set ENCRYPTION_KEY (use: openssl rand -hex 32)',
      ],
      kv: 'Bind your KV namespace as variable name "SESSIONS" (Pages → Settings → Functions → KV bindings)',
      oauthCallback:
        'Register the Authorization callback URL on GitHub OAuth App to match "expectedCallback" exactly',
      domains:
        'Use a single domain (avoid mixing pages.dev and custom domain) so cookies are consistent',
      nextSteps:
        ready
          ? 'You look ready. Visit /api/auth/login to start the OAuth flow.'
          : 'Fix the missing items above, then retry /api/auth/login.'
    },
  } as const;

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
