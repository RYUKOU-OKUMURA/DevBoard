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

  it.each([
    { path: ['repos', 'o', '..', 'issues'] },
    { path: ['repos', 'o', '%2E%2E', 'issues'] },
    { path: ['repos', '.', 'r', 'issues'] },
    { path: ['repos', 'o', '%2e.', 'issues'] },
  ])('rejects dot segments before forwarding: $path', async ({ path }) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const request = makeRequest(
      `https://devboard.test/api/github/${path.join('/')}`,
      { method: 'GET' }
    );

    const response = await onRequest({
      request,
      env: {} as any,
      params: { path },
    } as any);

    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      '[GitHub Proxy] Blocked request',
      expect.objectContaining({ reason: 'dot segment in path' })
    );
  });

  it('checks dot segments before the GraphQL operation allowlist', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const request = makeRequest(
      'https://devboard.test/api/github/graphql/%2e%2e/repos/viewer',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId: 'viewerRepos', variables: {} }),
      }
    );

    const response = await onRequest({
      request,
      env: {} as any,
      params: { path: ['graphql', '%2e%2e', 'repos', 'viewer'] },
    } as any);

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      '[GitHub Proxy] Blocked request',
      expect.objectContaining({ reason: 'dot segment in path' })
    );
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
    expect(response.headers.get('Cache-Control')).toContain('no-store');
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

  it('allows whitelisted REST POST requests to create GitHub issues', async () => {
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ number: 42, html_url: 'https://github.com/octocat/hello-world/issues/42' }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    ));

    const request = makeRequest(
      'https://devboard.test/api/github/repos/octocat/hello-world/issues',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'READMEを書く', body: '## やりたいこと' }),
      }
    );

    const response = await onRequest({
      request,
      env: {} as any,
      params: { path: ['repos', 'octocat', 'hello-world', 'issues'] },
    } as any);

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/octocat/hello-world/issues');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      title: 'READMEを書く',
      body: '## やりたいこと',
    });
  });

  it('allows only GET on repository labels', async () => {
    const request = makeRequest(
      'https://devboard.test/api/github/repos/o/r/labels',
      { method: 'GET' }
    );

    const response = await onRequest({
      request,
      env: {} as any,
      params: { path: ['repos', 'o', 'r', 'labels'] },
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/o/r/labels',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('does not allow POST on repository labels', async () => {
    const request = makeRequest(
      'https://devboard.test/api/github/repos/o/r/labels',
      { method: 'POST' }
    );

    const response = await onRequest({
      request,
      env: {} as any,
      params: { path: ['repos', 'o', 'r', 'labels'] },
    } as any);

    expect(response.status).toBe(405);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows dots inside a repository name and disables caching on GitHub errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 422 }));
    const request = makeRequest(
      'https://devboard.test/api/github/repos/o/r.js/issues',
      { method: 'GET' }
    );

    const response = await onRequest({
      request,
      env: {} as any,
      params: { path: ['repos', 'o', 'r.js', 'issues'] },
    } as any);

    expect(response.status).toBe(422);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
