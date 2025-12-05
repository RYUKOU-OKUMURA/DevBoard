export const GraphQLOperations = {
  viewerRepos: 'viewerRepos',
  singleRepository: 'singleRepository',
  recentEvents: 'recentEvents',
  recentIssues: 'recentIssues',
  recentPullRequests: 'recentPullRequests',
  repositoryIssues: 'repositoryIssues',
  createIssue: 'createIssue',
  updateIssue: 'updateIssue',
  closeIssue: 'closeIssue',
} as const;

export type GraphQLOperationId = typeof GraphQLOperations[keyof typeof GraphQLOperations];
