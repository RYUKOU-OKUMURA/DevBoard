// Get all logged-in accounts

import type { Env } from '../../lib/types';
import { getSessionIdFromCookie, getMultiAccountSession } from '../../lib/session';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    // Get master session ID from cookie
    const masterSessionId = await getSessionIdFromCookie(request, env);

    if (!masterSessionId) {
      return new Response(
        JSON.stringify({ accounts: [], activeUserId: null }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        }
      );
    }

    // Get multi-account session from KV
    const multiSession = await getMultiAccountSession(masterSessionId, env);

    if (!multiSession) {
      return new Response(
        JSON.stringify({ accounts: [], activeUserId: null }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        }
      );
    }

    // Return accounts and active user ID
    return new Response(
      JSON.stringify({
        accounts: multiSession.accounts,
        activeUserId: multiSession.activeUserId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Accounts endpoint error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
