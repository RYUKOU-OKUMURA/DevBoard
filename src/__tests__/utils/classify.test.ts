import { describe, it, expect } from 'vitest';
import { classifyRepo, classifyRepos, daysSince, DEFAULT_CONFIG } from '../../utils/classify';
import { Repo } from '../../types';

describe('daysSince', () => {
  it('should calculate days between dates correctly', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const days = daysSince(yesterday.toISOString());
    expect(days).toBe(1);
  });

  it('should handle dates in the past', () => {
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const days = daysSince(tenDaysAgo.toISOString());
    expect(days).toBe(10);
  });
});

describe('classifyRepo', () => {
  const createMockRepo = (pushedAt: string, isArchived = false): Repo => ({
    id: '1',
    nameWithOwner: 'test/repo',
    htmlUrl: 'https://github.com/test/repo',
    pushedAt,
    isArchived,
    isPrivate: false,
    description: 'Test repo',
    primaryLanguage: 'TypeScript',
    topics: [],
  });

  it('should classify archived repositories as Archived', () => {
    const now = new Date();
    const repo = createMockRepo(now.toISOString(), true);
    expect(classifyRepo(repo)).toBe('Archived');
  });

  it('should classify recent repositories as Active', () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const repo = createMockRepo(thirtyDaysAgo.toISOString(), false);
    expect(classifyRepo(repo)).toBe('Active');
  });

  it('should classify stale repositories as Stale', () => {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const repo = createMockRepo(ninetyDaysAgo.toISOString(), false);
    expect(classifyRepo(repo)).toBe('Stale');
  });

  it('should classify dormant repositories as Dormant', () => {
    const now = new Date();
    const twoHundredDaysAgo = new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000);
    const repo = createMockRepo(twoHundredDaysAgo.toISOString(), false);
    expect(classifyRepo(repo)).toBe('Dormant');
  });

  it('should use custom thresholds', () => {
    const now = new Date();
    const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
    const repo = createMockRepo(fortyDaysAgo.toISOString(), false);
    
    const customConfig = {
      activeThreshold: 30,
      staleThreshold: 90,
    };
    
    expect(classifyRepo(repo, customConfig)).toBe('Stale');
    expect(classifyRepo(repo, DEFAULT_CONFIG)).toBe('Active');
  });

  it('should handle edge case at threshold boundary', () => {
    const now = new Date();
    const exactlyStaleThreshold = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const repo = createMockRepo(exactlyStaleThreshold.toISOString(), false);
    expect(classifyRepo(repo)).toBe('Stale');
  });
});

describe('classifyRepos', () => {
  const createMockRepo = (id: string, pushedAt: string, isArchived = false): Repo => ({
    id,
    nameWithOwner: `test/repo${id}`,
    htmlUrl: `https://github.com/test/repo${id}`,
    pushedAt,
    isArchived,
    isPrivate: false,
    description: 'Test repo',
    primaryLanguage: 'TypeScript',
    topics: [],
  });

  it('should classify multiple repositories correctly', () => {
    const now = new Date();
    const repos: Repo[] = [
      createMockRepo('1', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),  // Active
      createMockRepo('2', new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()),  // Stale
      createMockRepo('3', new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000).toISOString()), // Dormant
      createMockRepo('4', new Date().toISOString(), true),                                     // Archived
    ];

    const classified = classifyRepos(repos);

    expect(classified.Active).toHaveLength(1);
    expect(classified.Stale).toHaveLength(1);
    expect(classified.Dormant).toHaveLength(1);
    expect(classified.Archived).toHaveLength(1);
  });

  it('should return empty columns when no repos match', () => {
    const classified = classifyRepos([]);

    expect(classified.Active).toHaveLength(0);
    expect(classified.Stale).toHaveLength(0);
    expect(classified.Dormant).toHaveLength(0);
    expect(classified.Archived).toHaveLength(0);
  });
});
