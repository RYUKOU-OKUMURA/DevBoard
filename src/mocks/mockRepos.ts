import { Repo } from '../types';

/**
 * Mock repository data for testing the UI
 */
export const mockRepos: Repo[] = [
  // Active repositories (< 60 days)
  {
    id: '1',
    nameWithOwner: 'octocat/Hello-World',
    htmlUrl: 'https://github.com/octocat/Hello-World',
    pushedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    isArchived: false,
    isPrivate: false,
    description: 'My first repository on GitHub!',
    primaryLanguage: 'JavaScript',
    topics: ['javascript', 'tutorial', 'github'],
  },
  {
    id: '2',
    nameWithOwner: 'user/react-app',
    htmlUrl: 'https://github.com/user/react-app',
    pushedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    isArchived: false,
    isPrivate: true,
    description: 'A modern React application with TypeScript and Tailwind CSS',
    primaryLanguage: 'TypeScript',
    topics: ['react', 'typescript', 'tailwindcss', 'frontend'],
  },
  {
    id: '3',
    nameWithOwner: 'company/api-service',
    htmlUrl: 'https://github.com/company/api-service',
    pushedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    isArchived: false,
    isPrivate: true,
    description: 'RESTful API service built with Node.js and Express',
    primaryLanguage: 'JavaScript',
    topics: ['nodejs', 'express', 'api', 'backend'],
  },
  
  // Stale repositories (60-180 days)
  {
    id: '4',
    nameWithOwner: 'developer/python-scripts',
    htmlUrl: 'https://github.com/developer/python-scripts',
    pushedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
    isArchived: false,
    isPrivate: false,
    description: 'Collection of useful Python scripts for automation',
    primaryLanguage: 'Python',
    topics: ['python', 'automation', 'scripts'],
  },
  {
    id: '5',
    nameWithOwner: 'team/mobile-app',
    htmlUrl: 'https://github.com/team/mobile-app',
    pushedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days ago
    isArchived: false,
    isPrivate: true,
    description: 'Cross-platform mobile application built with React Native',
    primaryLanguage: 'TypeScript',
    topics: ['react-native', 'mobile', 'ios', 'android'],
  },
  {
    id: '6',
    nameWithOwner: 'org/documentation',
    htmlUrl: 'https://github.com/org/documentation',
    pushedAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(), // 150 days ago
    isArchived: false,
    isPrivate: false,
    description: 'Technical documentation and guides',
    primaryLanguage: undefined,
    topics: ['documentation', 'guides', 'markdown'],
  },

  // Dormant repositories (> 180 days)
  {
    id: '7',
    nameWithOwner: 'legacy/old-website',
    htmlUrl: 'https://github.com/legacy/old-website',
    pushedAt: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000).toISOString(), // 250 days ago
    isArchived: false,
    isPrivate: false,
    description: 'Legacy website built with jQuery',
    primaryLanguage: 'HTML',
    topics: ['jquery', 'legacy', 'website'],
  },
  {
    id: '8',
    nameWithOwner: 'archive/prototype',
    htmlUrl: 'https://github.com/archive/prototype',
    pushedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
    isArchived: false,
    isPrivate: true,
    description: 'Early prototype for product concept',
    primaryLanguage: 'Python',
    topics: ['prototype', 'concept'],
  },

  // Archived repositories
  {
    id: '9',
    nameWithOwner: 'old/deprecated-lib',
    htmlUrl: 'https://github.com/old/deprecated-lib',
    pushedAt: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString(), // 500 days ago
    isArchived: true,
    isPrivate: false,
    description: 'Deprecated library - no longer maintained',
    primaryLanguage: 'JavaScript',
    topics: ['deprecated', 'archived'],
  },
  {
    id: '10',
    nameWithOwner: 'historical/university-project',
    htmlUrl: 'https://github.com/historical/university-project',
    pushedAt: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(), // 2 years ago
    isArchived: true,
    isPrivate: false,
    description: 'University course project from 2022',
    primaryLanguage: 'Java',
    topics: ['university', 'education', 'project'],
  },
];
