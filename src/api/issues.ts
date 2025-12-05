/**
 * GitHub Issues API client
 * Uses the proxy server for authenticated requests
 */

import { githubRestRequest } from '@/services/githubClient';

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  user: GitHubUser;
  assignees: GitHubUser[];
  labels: GitHubLabel[];
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  pull_request?: {
    url: string;
    html_url: string;
  };
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  user: GitHubUser;
  assignees: GitHubUser[];
  labels: GitHubLabel[];
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  draft: boolean;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  review_comments?: number;
  mergeable_state?: string;
}

interface FetchOptions {
  state?: 'open' | 'closed' | 'all';
  per_page?: number;
  page?: number;
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
}

/**
 * Fetch issues for a repository
 */
export async function fetchIssues(
  owner: string,
  repo: string,
  options: FetchOptions = {}
): Promise<GitHubIssue[]> {
  const params = new URLSearchParams();
  if (options.state) params.set('state', options.state);
  if (options.per_page) params.set('per_page', String(options.per_page));
  if (options.page) params.set('page', String(options.page));
  if (options.sort) params.set('sort', options.sort);
  if (options.direction) params.set('direction', options.direction);

  const queryString = params.toString();
  const path = `/repos/${owner}/${repo}/issues${queryString ? `?${queryString}` : ''}`;

  const issues = await githubRestRequest<GitHubIssue[]>(path);
  
  // Filter out pull requests (they appear in issues endpoint)
  return issues.filter(issue => !issue.pull_request);
}

/**
 * Fetch pull requests for a repository
 */
export async function fetchPullRequests(
  owner: string,
  repo: string,
  options: FetchOptions = {}
): Promise<GitHubPullRequest[]> {
  const params = new URLSearchParams();
  if (options.state) params.set('state', options.state);
  if (options.per_page) params.set('per_page', String(options.per_page));
  if (options.page) params.set('page', String(options.page));
  if (options.sort) params.set('sort', options.sort);
  if (options.direction) params.set('direction', options.direction);

  const queryString = params.toString();
  const path = `/repos/${owner}/${repo}/pulls${queryString ? `?${queryString}` : ''}`;

  return githubRestRequest<GitHubPullRequest[]>(path);
}

/**
 * Create a new issue
 */
export async function createIssue(
  owner: string,
  repo: string,
  data: {
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }
): Promise<GitHubIssue> {
  return githubRestRequest<GitHubIssue>(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    json: data,
  });
}

/**
 * Update an existing issue
 */
export async function updateIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  data: {
    title?: string;
    body?: string;
    state?: 'open' | 'closed';
    labels?: string[];
    assignees?: string[];
  }
): Promise<GitHubIssue> {
  return githubRestRequest<GitHubIssue>(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    json: data,
  });
}

/**
 * Add a comment to an issue
 */
export async function addIssueComment(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<{ id: number; body: string; created_at: string }> {
  return githubRestRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    json: { body },
  });
}

