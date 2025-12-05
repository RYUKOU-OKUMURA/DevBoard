// Canonical list of GitHub GraphQL operations that the proxy permits.
// Keep the operation IDs in sync with the client-side constants in
// src/api/githubQueryIds.ts.

export type GitHubQueryId =
  | 'viewerRepos'
  | 'singleRepository'
  | 'recentEvents'
  | 'recentIssues'
  | 'recentPullRequests'
  | 'repositoryIssues'
  | 'createIssue'
  | 'updateIssue'
  | 'closeIssue';

type OperationType = 'query' | 'mutation';

export interface GraphQLOperationTemplate {
  id: GitHubQueryId;
  type: OperationType;
  allowedPaths: string[];
  document: string;
}

export const GRAPHQL_OPERATIONS: Record<GitHubQueryId, GraphQLOperationTemplate> = {
  viewerRepos: {
    id: 'viewerRepos',
    type: 'query',
    allowedPaths: ['graphql/repos/viewer'],
    document: `
      query GetRepositories($first: Int!, $after: String) {
        viewer {
          repositories(first: $first, after: $after, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
            nodes {
              id
              nameWithOwner
              url
              pushedAt
              isArchived
              isPrivate
              description
              stargazerCount
              primaryLanguage {
                name
              }
              repositoryTopics(first: 10) {
                nodes {
                  topic {
                    name
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `,
  },
  singleRepository: {
    id: 'singleRepository',
    type: 'query',
    allowedPaths: ['graphql/repos/custom'],
    document: `
      query GetRepository($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
          nameWithOwner
          url
          pushedAt
          isArchived
          isPrivate
          description
          stargazerCount
          primaryLanguage {
            name
          }
          repositoryTopics(first: 10) {
            nodes {
              topic {
                name
              }
            }
          }
        }
      }
    `,
  },
  recentEvents: {
    id: 'recentEvents',
    type: 'query',
    allowedPaths: ['graphql/activities/recent'],
    document: `
      query GetRecentEvents($from: DateTime!) {
        viewer {
          contributionsCollection(from: $from) {
            commitContributionsByRepository(maxRepositories: 3) {
              repository {
                nameWithOwner
                url
              }
              contributions(first: 1, orderBy: {direction: DESC}) {
                nodes {
                  occurredAt
                }
              }
            }
          }
        }
      }
    `,
  },
  recentIssues: {
    id: 'recentIssues',
    type: 'query',
    allowedPaths: ['graphql/activities/issues'],
    document: `
      query GetRecentIssues($from: DateTime!) {
        viewer {
          contributionsCollection(from: $from) {
            issueContributionsByRepository(maxRepositories: 10) {
              repository { nameWithOwner url }
              contributions(first: 5, orderBy: { direction: DESC }) {
                nodes {
                  occurredAt
                  issue { title number url state repository { nameWithOwner url } }
                }
              }
            }
          }
        }
      }
    `,
  },
  recentPullRequests: {
    id: 'recentPullRequests',
    type: 'query',
    allowedPaths: ['graphql/activities/pullrequests'],
    document: `
      query GetRecentPRs($from: DateTime!) {
        viewer {
          contributionsCollection(from: $from) {
            pullRequestContributionsByRepository(maxRepositories: 10) {
              repository { nameWithOwner url }
              contributions(first: 5, orderBy: { direction: DESC }) {
                nodes {
                  occurredAt
                  pullRequest { title number url state repository { nameWithOwner url } }
                }
              }
            }
          }
        }
      }
    `,
  },
  repositoryIssues: {
    id: 'repositoryIssues',
    type: 'query',
    allowedPaths: ['graphql'],
    document: `
      query GetRepositoryIssues($owner: String!, $name: String!, $cursor: String) {
        repository(owner: $owner, name: $name) {
          issues(first: 100, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
            nodes {
              id
              number
              title
              body
              state
              createdAt
              updatedAt
              closedAt
              url
              labels(first: 10) {
                nodes {
                  name
                }
              }
              assignees(first: 5) {
                nodes {
                  login
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `,
  },
  createIssue: {
    id: 'createIssue',
    type: 'mutation',
    allowedPaths: ['graphql'],
    document: `
      mutation CreateIssue($repositoryId: ID!, $title: String!, $body: String, $assigneeIds: [ID!], $labelIds: [ID!]) {
        createIssue(input: {
          repositoryId: $repositoryId
          title: $title
          body: $body
          assigneeIds: $assigneeIds
          labelIds: $labelIds
        }) {
          issue {
            id
            number
            url
          }
        }
      }
    `,
  },
  updateIssue: {
    id: 'updateIssue',
    type: 'mutation',
    allowedPaths: ['graphql'],
    document: `
      mutation UpdateIssue($issueId: ID!, $title: String, $body: String, $state: IssueState) {
        updateIssue(input: {
          id: $issueId
          title: $title
          body: $body
          state: $state
        }) {
          issue {
            id
            number
            state
            updatedAt
          }
        }
      }
    `,
  },
  closeIssue: {
    id: 'closeIssue',
    type: 'mutation',
    allowedPaths: ['graphql'],
    document: `
      mutation CloseIssue($issueId: ID!) {
        closeIssue(input: { issueId: $issueId }) {
          issue {
            id
            state
            closedAt
          }
        }
      }
    `,
  },
};
