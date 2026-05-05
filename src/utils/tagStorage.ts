/**
 * Tag storage utilities for localStorage management
 */

import type { Tag, RepoTagsMap } from '../types/tag';

// Tag scope types
export type TagScope = 'kanban' | 'manual';

// Storage keys
const TAGS_STORAGE_KEY = 'github-dashboard-tags';
const REPO_TAGS_STORAGE_KEY = 'github-dashboard-repo-tags';

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get storage key with account ID and scope
 */
function getStorageKey(baseKey: string, accountId: string, scope: TagScope): string {
  return `${baseKey}:${scope}:${accountId}`;
}

// ==================== Tag CRUD Operations ====================

/**
 * Get all tags for an account and scope
 */
export function getTags(accountId: string, scope: TagScope): Tag[] {
  try {
    const key = getStorageKey(TAGS_STORAGE_KEY, accountId, scope);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get tags:', error);
    return [];
  }
}

/**
 * Save tags for an account and scope
 */
export function saveTags(accountId: string, scope: TagScope, tags: Tag[]): void {
  try {
    const key = getStorageKey(TAGS_STORAGE_KEY, accountId, scope);
    localStorage.setItem(key, JSON.stringify(tags));
  } catch (error) {
    console.error('Failed to save tags:', error);
    throw error;
  }
}

/**
 * Create a new tag
 */
export function createTag(
  accountId: string,
  scope: TagScope,
  name: string,
  color: string
): Tag {
  const tags = getTags(accountId, scope);

  // Check for duplicate names
  const normalizedName = name.trim().toLowerCase();
  const isDuplicate = tags.some(
    (tag) => tag.name.trim().toLowerCase() === normalizedName
  );

  if (isDuplicate) {
    throw new Error('Tag with this name already exists');
  }

  // Validate name length
  if (name.trim().length === 0) {
    throw new Error('Tag name cannot be empty');
  }

  if (name.length > 20) {
    throw new Error('Tag name must be 20 characters or less');
  }

  // Create new tag
  const newTag: Tag = {
    id: generateUUID(),
    name: name.trim(),
    color,
    createdAt: new Date().toISOString(),
  };

  // Save
  const updatedTags = [...tags, newTag];
  saveTags(accountId, scope, updatedTags);

  return newTag;
}

/**
 * Update an existing tag
 */
export function updateTag(
  accountId: string,
  scope: TagScope,
  tagId: string,
  updates: Partial<Omit<Tag, 'id' | 'createdAt'>>
): Tag {
  const tags = getTags(accountId, scope);
  const tagIndex = tags.findIndex((t) => t.id === tagId);

  if (tagIndex === -1) {
    throw new Error('Tag not found');
  }
  const existingTag = tags[tagIndex];
  if (!existingTag) {
    throw new Error('Tag not found');
  }

  // Check for duplicate names if name is being updated
  if (updates.name) {
    const normalizedName = updates.name.trim().toLowerCase();
    const isDuplicate = tags.some(
      (tag, idx) =>
        idx !== tagIndex && tag.name.trim().toLowerCase() === normalizedName
    );

    if (isDuplicate) {
      throw new Error('Tag with this name already exists');
    }

    if (updates.name.length > 20) {
      throw new Error('Tag name must be 20 characters or less');
    }
  }

  // Update tag
  const updatedTag = {
    ...existingTag,
    ...updates,
    name: updates.name ? updates.name.trim() : existingTag.name,
  };

  const updatedTags = [...tags];
  updatedTags[tagIndex] = updatedTag;
  saveTags(accountId, scope, updatedTags);

  return updatedTag;
}

/**
 * Delete a tag
 */
export function deleteTag(accountId: string, scope: TagScope, tagId: string): void {
  const tags = getTags(accountId, scope);
  const updatedTags = tags.filter((tag) => tag.id !== tagId);
  saveTags(accountId, scope, updatedTags);

  // Also remove this tag from all repositories
  const repoTags = getRepoTags(accountId, scope);
  const updatedRepoTags: RepoTagsMap = {};

  for (const [repoId, tagIds] of Object.entries(repoTags)) {
    const filteredTagIds = tagIds.filter((id) => id !== tagId);
    if (filteredTagIds.length > 0) {
      updatedRepoTags[repoId] = filteredTagIds;
    }
  }

  saveRepoTags(accountId, scope, updatedRepoTags);
}

// ==================== Repo Tag Mapping Operations ====================

/**
 * Get all repo-tag mappings for an account and scope
 */
export function getRepoTags(accountId: string, scope: TagScope): RepoTagsMap {
  try {
    const key = getStorageKey(REPO_TAGS_STORAGE_KEY, accountId, scope);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to get repo tags:', error);
    return {};
  }
}

/**
 * Save repo-tag mappings for an account and scope
 */
export function saveRepoTags(
  accountId: string,
  scope: TagScope,
  repoTags: RepoTagsMap
): void {
  try {
    const key = getStorageKey(REPO_TAGS_STORAGE_KEY, accountId, scope);
    localStorage.setItem(key, JSON.stringify(repoTags));
  } catch (error) {
    console.error('Failed to save repo tags:', error);
    throw error;
  }
}

/**
 * Assign a tag to a repository
 */
export function assignTagToRepo(
  accountId: string,
  scope: TagScope,
  repoId: string,
  tagId: string
): void {
  const repoTags = getRepoTags(accountId, scope);
  const currentTags = repoTags[repoId] || [];

  // Avoid duplicates
  if (!currentTags.includes(tagId)) {
    const updatedRepoTags = {
      ...repoTags,
      [repoId]: [...currentTags, tagId],
    };
    saveRepoTags(accountId, scope, updatedRepoTags);
  }
}

/**
 * Remove a tag from a repository
 */
export function removeTagFromRepo(
  accountId: string,
  scope: TagScope,
  repoId: string,
  tagId: string
): void {
  const repoTags = getRepoTags(accountId, scope);
  const currentTags = repoTags[repoId] || [];

  const updatedTags = currentTags.filter((id) => id !== tagId);

  if (updatedTags.length > 0) {
    const updatedRepoTags = {
      ...repoTags,
      [repoId]: updatedTags,
    };
    saveRepoTags(accountId, scope, updatedRepoTags);
  } else {
    // Remove repo entry if no tags remain
    const updatedRepoTags = { ...repoTags };
    delete updatedRepoTags[repoId];
    saveRepoTags(accountId, scope, updatedRepoTags);
  }
}

/**
 * Get all tag IDs for a specific repository
 */
export function getTagsForRepo(accountId: string, scope: TagScope, repoId: string): string[] {
  const repoTags = getRepoTags(accountId, scope);
  return repoTags[repoId] || [];
}

/**
 * Set tags for a repository (replaces existing tags)
 */
export function setTagsForRepo(
  accountId: string,
  scope: TagScope,
  repoId: string,
  tagIds: string[]
): void {
  const repoTags = getRepoTags(accountId, scope);

  if (tagIds.length > 0) {
    const updatedRepoTags = {
      ...repoTags,
      [repoId]: tagIds,
    };
    saveRepoTags(accountId, scope, updatedRepoTags);
  } else {
    // Remove repo entry if no tags
    const updatedRepoTags = { ...repoTags };
    delete updatedRepoTags[repoId];
    saveRepoTags(accountId, scope, updatedRepoTags);
  }
}

/**
 * Get count of repositories using a specific tag
 */
export function getTagUsageCount(accountId: string, scope: TagScope, tagId: string): number {
  const repoTags = getRepoTags(accountId, scope);
  let count = 0;

  for (const tagIds of Object.values(repoTags)) {
    if (tagIds.includes(tagId)) {
      count++;
    }
  }

  return count;
}
