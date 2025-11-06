// GitHub API proxy - forwards requests to GitHub API with user's access token

import type { Env } from '../../lib/types';
import { getSessionIdFromCookie, getActiveAccountSession } from '../../lib/session';
import { applyNoCache } from '../../utils/security';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context;

  try {
    // Get master session ID from cookie
    const masterSessionId = await getSessionIdFromCookie(request, env);

    if (!masterSessionId) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          status: 401,
          headers,
        }
      );
    }

    // Get active account session from multi-account session
    const session = await getActiveAccountSession(masterSessionId, env);

    if (!session) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyNoCache(headers);
      return new Response(
        JSON.stringify({ error: 'No active account or session expired' }),
        {
          status: 401,
          headers,
        }
      );
    }

    // Build GitHub API URL from the path
    const url = new URL(request.url);
    const pathArray = params.path as string[];
    const apiPath = pathArray ? pathArray.join('/') : '';

    // Map our custom endpoints to GitHub API paths
    // All our custom GraphQL endpoints map to GitHub's /graphql
    let githubApiPath = apiPath;
    let isGraphQL = false;

    if (apiPath.startsWith('graphql')) {
      // Any path starting with 'graphql' (including graphql/repos/viewer, graphql/activities/issues, etc.)
      // should be routed to GitHub's /graphql endpoint
      githubApiPath = 'graphql';
      isGraphQL = true;
      console.log(`[GitHub Proxy] Mapped custom endpoint: ${apiPath} -> graphql`);
    }

    // Build the full GitHub API URL
    const githubUrl = `https://api.github.com/${githubApiPath}${url.search}`;
    console.log(`[GitHub Proxy] Request to: ${githubUrl}`);

    // Forward the request to GitHub API
    const githubResponse = await fetch(githubUrl, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: isGraphQL
          ? 'application/vnd.github.v3+json'
          : request.headers.get('Accept') || 'application/vnd.github.v3+json',
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'User-Agent': 'GitHub-Dashboard',
      },
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.text()
        : undefined,
    });

    // Get response body
    const responseBody = await githubResponse.text();

    // Forward the response back to the client
    const headers = new Headers({
      'Content-Type': githubResponse.headers.get('Content-Type') || 'application/json',
      'X-RateLimit-Limit': githubResponse.headers.get('X-RateLimit-Limit') || '',
      'X-RateLimit-Remaining': githubResponse.headers.get('X-RateLimit-Remaining') || '',
      'X-RateLimit-Reset': githubResponse.headers.get('X-RateLimit-Reset') || '',
    });
    applyNoCache(headers);

    return new Response(responseBody, {
      status: githubResponse.status,
      headers,
    });
  } catch (error) {
    console.error('GitHub API proxy error:', error);
    const headers = new Headers({ 'Content-Type': 'application/json' });
    applyNoCache(headers);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers,
      }
    );
  }
};
