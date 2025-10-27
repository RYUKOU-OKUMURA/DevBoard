// Switch active account

import type { Env } from '../../lib/types';
import { getSessionIdFromCookie, switchActiveAccount } from '../../lib/session';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get master session ID from cookie
    const masterSessionId = getSessionIdFromCookie(request);

    if (!masterSessionId) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body = await request.json() as { userId: string };

    if (!body.userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Switch active account
    const multiSession = await switchActiveAccount(
      masterSessionId,
      body.userId,
      env
    );

    if (!multiSession) {
      return new Response(
        JSON.stringify({ error: 'Account not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Return updated session
    return new Response(
      JSON.stringify({
        accounts: multiSession.accounts,
        activeUserId: multiSession.activeUserId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Switch account endpoint error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
