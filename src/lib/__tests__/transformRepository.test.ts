import { describe, it, expect } from 'vitest';
import { transformRepository, transformRepositories, type GraphQLRepository } from '../transformRepository';

function makeRepo(overrides: Partial<GraphQLRepository> = {}): GraphQLRepository {
  return {
    id: '1',
    nameWithOwner: 'user/repo',
    url: 'https://github.com/user/repo',
    pushedAt: new Date().toISOString(),
    isArchived: false,
    isPrivate: false,
    description: 'desc',
    primaryLanguage: { name: 'TypeScript' },
    repositoryTopics: {
      nodes: [
        { topic: { name: 'react' } },
        { topic: { name: 'web' } },
      ],
    },
    ...overrides,
  } as GraphQLRepository;
}

describe('transformRepository topics fallback', () => {
  it('handles null repositoryTopics', () => {
    const repo = makeRepo({ repositoryTopics: null });
    const result = transformRepository(repo);
    expect(result.topics).toEqual([]);
  });

  it('handles missing nodes array', () => {
    const repo = makeRepo({ repositoryTopics: { nodes: null } });
    const result = transformRepository(repo);
    expect(result.topics).toEqual([]);
  });

  it('handles null nodes entries', () => {
    const repo = makeRepo({
      repositoryTopics: {
        nodes: [null, { topic: { name: 'valid' } }, null],
      },
    });
    const result = transformRepository(repo);
    expect(result.topics).toEqual(['valid']);
  });

  it('handles null topic or topic.name', () => {
    const repo = makeRepo({
      repositoryTopics: {
        nodes: [
          { topic: null },
          { topic: { name: null } },
          { topic: { name: 'ok' } },
        ],
      },
    });
    const result = transformRepository(repo);
    expect(result.topics).toEqual(['ok']);
  });

  it('transformRepositories filters out null repository nodes', () => {
    const repo1 = makeRepo({ id: '1' });
    const repo2 = makeRepo({ id: '2', repositoryTopics: { nodes: [null] } });
    const result = transformRepositories([repo1, null, repo2, undefined]);
    expect(result.map((r) => r.id)).toEqual(['1', '2']);
  });
});
