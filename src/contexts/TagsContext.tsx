/**
 * TagsContext - Shared state for tags management
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import type { Tag, RepoTagsMap } from '../types/tag';
import * as tagStorage from '../utils/tagStorage';

interface TagsContextType {
  // State
  tags: Tag[];
  repoTags: RepoTagsMap;
  loading: boolean;

  // Tag CRUD
  createTag: (name: string, color: string) => Tag | null;
  updateTag: (tagId: string, updates: Partial<Omit<Tag, 'id' | 'createdAt'>>) => Tag | null;
  deleteTag: (tagId: string) => void;
  getTagById: (tagId: string) => Tag | undefined;
  getTagUsageCount: (tagId: string) => number;

  // Repo tag assignment
  assignTagToRepo: (repoId: string, tagId: string) => void;
  removeTagFromRepo: (repoId: string, tagId: string) => void;
  getTagsForRepo: (repoId: string) => string[];
  getTagObjectsForRepo: (repoId: string) => Tag[];
  setTagsForRepo: (repoId: string, tagIds: string[]) => void;
}

const TagsContext = createContext<TagsContextType | undefined>(undefined);

export function TagsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [repoTags, setRepoTags] = useState<RepoTagsMap>({});
  const [loading, setLoading] = useState(true);

  // Load tags and repo-tag mappings when user changes
  useEffect(() => {
    if (!user) {
      setTags([]);
      setRepoTags({});
      setLoading(false);
      return;
    }

    const accountId = user.userId;
    const loadedTags = tagStorage.getTags(accountId);
    const loadedRepoTags = tagStorage.getRepoTags(accountId);

    setTags(loadedTags);
    setRepoTags(loadedRepoTags);
    setLoading(false);
  }, [user]);

  // ==================== Tag CRUD Operations ====================

  /**
   * Create a new tag
   */
  const createTag = useCallback(
    (name: string, color: string): Tag | null => {
      if (!user) {
        console.error('Cannot create tag: user not authenticated');
        return null;
      }

      try {
        const newTag = tagStorage.createTag(user.userId, name, color);
        setTags((prev) => [...prev, newTag]);
        return newTag;
      } catch (error) {
        console.error('Failed to create tag:', error);
        throw error;
      }
    },
    [user]
  );

  /**
   * Update an existing tag
   */
  const updateTag = useCallback(
    (
      tagId: string,
      updates: Partial<Omit<Tag, 'id' | 'createdAt'>>
    ): Tag | null => {
      if (!user) {
        console.error('Cannot update tag: user not authenticated');
        return null;
      }

      try {
        const updatedTag = tagStorage.updateTag(user.userId, tagId, updates);
        setTags((prev) =>
          prev.map((tag) => (tag.id === tagId ? updatedTag : tag))
        );
        return updatedTag;
      } catch (error) {
        console.error('Failed to update tag:', error);
        throw error;
      }
    },
    [user]
  );

  /**
   * Delete a tag
   */
  const deleteTag = useCallback(
    (tagId: string): void => {
      if (!user) {
        console.error('Cannot delete tag: user not authenticated');
        return;
      }

      try {
        tagStorage.deleteTag(user.userId, tagId);
        setTags((prev) => prev.filter((tag) => tag.id !== tagId));

        // Also update repoTags state to remove deleted tag
        setRepoTags((prev) => {
          const updated: RepoTagsMap = {};
          for (const [repoId, tagIds] of Object.entries(prev)) {
            const filtered = tagIds.filter((id) => id !== tagId);
            if (filtered.length > 0) {
              updated[repoId] = filtered;
            }
          }
          return updated;
        });
      } catch (error) {
        console.error('Failed to delete tag:', error);
        throw error;
      }
    },
    [user]
  );

  /**
   * Get a tag by ID
   */
  const getTagById = useCallback(
    (tagId: string): Tag | undefined => {
      return tags.find((tag) => tag.id === tagId);
    },
    [tags]
  );

  /**
   * Get usage count for a tag
   */
  const getTagUsageCount = useCallback(
    (tagId: string): number => {
      if (!user) return 0;
      return tagStorage.getTagUsageCount(user.userId, tagId);
    },
    [user, repoTags] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ==================== Repo Tag Assignment Operations ====================

  /**
   * Assign a tag to a repository
   */
  const assignTagToRepo = useCallback(
    (repoId: string, tagId: string): void => {
      if (!user) {
        console.error('Cannot assign tag: user not authenticated');
        return;
      }

      try {
        tagStorage.assignTagToRepo(user.userId, repoId, tagId);
        setRepoTags((prev) => {
          const currentTags = prev[repoId] || [];
          if (currentTags.includes(tagId)) {
            return prev; // Already assigned
          }
          return {
            ...prev,
            [repoId]: [...currentTags, tagId],
          };
        });
      } catch (error) {
        console.error('Failed to assign tag:', error);
        throw error;
      }
    },
    [user]
  );

  /**
   * Remove a tag from a repository
   */
  const removeTagFromRepo = useCallback(
    (repoId: string, tagId: string): void => {
      if (!user) {
        console.error('Cannot remove tag: user not authenticated');
        return;
      }

      try {
        tagStorage.removeTagFromRepo(user.userId, repoId, tagId);
        setRepoTags((prev) => {
          const currentTags = prev[repoId] || [];
          const updatedTags = currentTags.filter((id) => id !== tagId);

          if (updatedTags.length === 0) {
            const { [repoId]: _, ...rest } = prev;
            return rest;
          }

          return {
            ...prev,
            [repoId]: updatedTags,
          };
        });
      } catch (error) {
        console.error('Failed to remove tag:', error);
        throw error;
      }
    },
    [user]
  );

  /**
   * Get all tag IDs for a repository
   */
  const getTagsForRepo = useCallback(
    (repoId: string): string[] => {
      return repoTags[repoId] || [];
    },
    [repoTags]
  );

  /**
   * Get all tag objects for a repository
   */
  const getTagObjectsForRepo = useCallback(
    (repoId: string): Tag[] => {
      const tagIds = repoTags[repoId] || [];
      return tagIds
        .map((id) => tags.find((tag) => tag.id === id))
        .filter((tag): tag is Tag => tag !== undefined);
    },
    [repoTags, tags]
  );

  /**
   * Set tags for a repository (replaces existing tags)
   */
  const setTagsForRepo = useCallback(
    (repoId: string, tagIds: string[]): void => {
      if (!user) {
        console.error('Cannot set tags: user not authenticated');
        return;
      }

      try {
        tagStorage.setTagsForRepo(user.userId, repoId, tagIds);
        setRepoTags((prev) => {
          if (tagIds.length === 0) {
            const { [repoId]: _, ...rest } = prev;
            return rest;
          }
          return {
            ...prev,
            [repoId]: tagIds,
          };
        });
      } catch (error) {
        console.error('Failed to set tags:', error);
        throw error;
      }
    },
    [user]
  );

  const value: TagsContextType = {
    // State
    tags,
    repoTags,
    loading,

    // Tag CRUD
    createTag,
    updateTag,
    deleteTag,
    getTagById,
    getTagUsageCount,

    // Repo tag assignment
    assignTagToRepo,
    removeTagFromRepo,
    getTagsForRepo,
    getTagObjectsForRepo,
    setTagsForRepo,
  };

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>;
}

export function useTagsContext(): TagsContextType {
  const context = useContext(TagsContext);
  if (context === undefined) {
    throw new Error('useTagsContext must be used within a TagsProvider');
  }
  return context;
}

