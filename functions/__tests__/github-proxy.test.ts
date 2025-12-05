import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from '../api/github/[[path]]';
import { GRAPHQL_OPERATIONS } from '../lib/githubQueries';

const mockGetSessionIdFromCookie = vi.fn();
const mockGetActiveAccountSession = vi.fn();

vi.mock('../lib/session', () => ({
  getSessionIdFromCookie: (...args: any[]) => mockGetSessionIdFromCookie(...args),
  getActiveAccountSession: (...args: any[]) => mockGetActiveAccountSession(...args),
}));

const defaultSession = {
  userId: '123',
  username: 'tester',
  accessToken: 'token',
  createdAt: Date.now(),
};

const makeRequest = (url: string, init: RequestInit) =>
  new Request(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
    },
  });

describe('GitHub proxy allowlist', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetSessionIdFromCookie.mockReset();
    mockGetActiveAccountSession.mockReset();
    mockGetSessionIdFromCookie.mockResolvedValue('master-session');
    mockGetActiveAccountSession.mockResolvedValue(defaultSession);
    fetchMock = vi.fn(async () => new Response('{}', {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('blocks mutations on read-only GraphQL paths', async () => {
    const request = makeRequest(
      'https://devboard.test/api/github/graphql/repos/viewer',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId: 'createIssue', variables: {} }),
      }
    );

    const response = await onRequest({
      request,
      env: {} as any,
      params: { path: ['graphql', 'repos', 'viewer'] },
    } as any);

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unknown GraphQL operation ids', async () => {
    const request = makeRequest(
      'https://devboard.test/api/github/graphql',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId: 'unknown-op', variables: {} }),
      }
    );

    const response = await onRequest({
      request,
      env: {} as any,
      params: { path: ['graphql'] },
    } as any);

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects REST methods that are not whitelisted', async () => {
    const request = makeRequest(
      'https://devboard.test/api/github/repos/octocat/hello-world/pulls',
      { method: 'POST' }
    );

    const response = await onRequest({
      request,
      env: {} as any,
      params: { path: ['repos', 'octocat', 'hello-world', 'pulls'] },
    } as any);

    expect(response.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards whitelisted GraphQL queries with server-side templates', async () => {
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ data: {} }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '60',
        },
      }
    ));

    const request = makeRequest(
      'https://devboard.test/api/github/graphql/repos/viewer',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryId: 'viewerRepos',
          variables: { first: 10, after: null },
        }),
      }
    );

    const response = await onRequest({
      request,
      env: {} as any,
      params: { path: ['graphql', 'repos', 'viewer'] },
    } as any);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);

    expect(body.query).toBe(GRAPHQL_OPERATIONS.viewerRepos.document);
    expect(body.variables).toEqual({ first: 10, after: null });
    expect(body.queryId).toBeUndefined();
  });

  it('allows whitelisted REST GET requests to GitHub', async () => {
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify([]),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    ));

    const request = makeRequest(
      'https://devboard.test/api/github/repos/octocat/hello-world/issues?state=open',
      { method: 'GET' }
    );

    const response = await onRequest({
      request,
      env: {} as any,
      params: { path: ['repos', 'octocat', 'hello-world', 'issues'] },
    } as any);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/octocat/hello-world/issues?state=open');
    expect((init as RequestInit).method).toBe('GET');
    expect((init as RequestInit).body).toBeUndefined();
  });
});
