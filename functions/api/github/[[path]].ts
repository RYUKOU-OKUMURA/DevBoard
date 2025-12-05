// GitHub API proxy - forwards requests to GitHub API with user's access token
// and enforces strict allowlists for REST/GraphQL.

import type { Env } from '../../lib/types';
import {
  getSessionIdFromCookie,
  getActiveAccountSession,
} from '../../lib/session';
import {
  applyNoCache,
} from '../../utils/security';
import {
  GRAPHQL_OPERATIONS,
  type GitHubQueryId,
} from '../../lib/githubQueries';

type RestRule = {
  pattern: RegExp;
  methods: Set<string>;
};

const REST_ALLOWLIST: RestRule[] = [
  // Issues list / create
  { pattern: /^repos\/[^/]+\/[^/]+\/issues$/, methods: new Set(['GET', 'POST']) },
  // Single issue update
  { pattern: /^repos\/[^/]+\/[^/]+\/issues\/\d+$/, methods: new Set(['PATCH']) },
  // Issue comments create
  { pattern: /^repos\/[^/]+\/[^/]+\/issues\/\d+\/comments$/, methods: new Set(['POST']) },
  // Pull requests list
  { pattern: /^repos\/[^/]+\/[^/]+\/pulls$/, methods: new Set(['GET']) },
];

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

const createErrorResponse = (status: number, message: string) => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  applyNoCache(headers);
  return new Response(JSON.stringify({ error: message }), { status, headers });
};

const logRejection = (reason: string, details: Record<string, unknown>) => {
  console.warn('[GitHub Proxy] Blocked request', { reason, ...details });
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context;

  try {
    const masterSessionId = await getSessionIdFromCookie(request, env);
    if (!masterSessionId) {
      return createErrorResponse(401, 'Not authenticated');
    }

    const session = await getActiveAccountSession(masterSessionId, env);
    if (!session) {
      return createErrorResponse(401, 'No active account or session expired');
    }

    const url = new URL(request.url);
    const pathArray = (params.path as string[] | undefined) ?? [];
    const apiPath = pathArray.filter(Boolean).join('/');

    if (!apiPath) {
      logRejection('empty path', { method: request.method });
      return createErrorResponse(403, 'Forbidden');
    }

    const isGraphQLPath = apiPath.startsWith('graphql');

    if (isGraphQLPath) {
      if (request.method !== 'POST') {
        logRejection('non-POST GraphQL request', { method: request.method, path: apiPath });
        return createErrorResponse(405, 'Method Not Allowed');
      }

      let parsedBody: any;
      try {
        parsedBody = await request.json();
      } catch {
        logRejection('invalid JSON body', { path: apiPath });
        return createErrorResponse(400, 'Invalid request');
      }

      const { queryId, variables } = parsedBody ?? {};
      if (!queryId || typeof queryId !== 'string') {
        logRejection('missing queryId', { path: apiPath });
        return createErrorResponse(400, 'Invalid request');
      }

      const operation = GRAPHQL_OPERATIONS[queryId as GitHubQueryId];
      if (!operation) {
        logRejection('unknown queryId', { path: apiPath, queryId });
        return createErrorResponse(403, 'Forbidden');
      }

      if (!operation.allowedPaths.includes(apiPath)) {
        logRejection('queryId not allowed on path', { path: apiPath, queryId });
        return createErrorResponse(403, 'Forbidden');
      }

      if (variables && (typeof variables !== 'object' || Array.isArray(variables))) {
        logRejection('invalid variables payload', { path: apiPath, queryId });
        return createErrorResponse(400, 'Invalid request');
      }

      const githubResponse = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'GitHub-Dashboard',
        },
        body: JSON.stringify({
          query: operation.document,
          variables: variables ?? {},
        }),
      });

      const responseBody = await githubResponse.text();

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
    }

    const matchedRule = REST_ALLOWLIST.find((rule) => rule.pattern.test(apiPath));
    if (!matchedRule) {
      logRejection('path not whitelisted', { path: apiPath, method: request.method });
      return createErrorResponse(403, 'Forbidden');
    }

    if (!matchedRule.methods.has(request.method)) {
      logRejection('method not allowed', { path: apiPath, method: request.method });
      return createErrorResponse(405, 'Method Not Allowed');
    }

    const githubUrl = `https://api.github.com/${apiPath}${url.search}`;
    console.log(`[GitHub Proxy] Request to: ${githubUrl}`);

    const githubResponse = await fetch(githubUrl, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: request.headers.get('Accept') || 'application/vnd.github.v3+json',
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'User-Agent': 'GitHub-Dashboard',
      },
      body: METHODS_WITH_BODY.has(request.method) ? await request.text() : undefined,
    });

    const responseBody = await githubResponse.text();

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
    return createErrorResponse(500, 'Internal server error');
  }
};
