import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedViews,
  saveView,
  deleteView,
  getViewById,
  updateView,
  clearAllViews,
} from '../../utils/storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('Storage Utils', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getSavedViews', () => {
    it('should return empty array when no views saved', () => {
      const views = getSavedViews();
      expect(views).toEqual([]);
    });

    it('should return saved views', () => {
      const testView = {
        id: '123',
        name: 'Test View',
        searchQuery: 'test',
        sortOrder: 'name' as const,
        createdAt: new Date().toISOString(),
      };

      localStorageMock.setItem('github-dashboard-saved-views', JSON.stringify([testView]));

      const views = getSavedViews();
      expect(views).toHaveLength(1);
      expect(views[0]).toEqual(testView);
    });

    it('should handle corrupted data gracefully', () => {
      localStorageMock.setItem('github-dashboard-saved-views', 'invalid json');

      const views = getSavedViews();
      expect(views).toEqual([]);
    });
  });

  describe('saveView', () => {
    it('should save a new view successfully', () => {
      const result = saveView('My View', 'typescript', 'lastUpdated');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('My View');
      expect(result?.searchQuery).toBe('typescript');
      expect(result?.sortOrder).toBe('lastUpdated');
      expect(result?.id).toBeTruthy();
      expect(result?.createdAt).toBeTruthy();
    });

    it('should not save view with duplicate name', () => {
      saveView('Duplicate', 'test', 'name');
      const result = saveView('Duplicate', 'another', 'lastUpdated');

      expect(result).toBeNull();
    });

    it('should not save more than 5 views', () => {
      saveView('View 1', 'test1', 'name');
      saveView('View 2', 'test2', 'name');
      saveView('View 3', 'test3', 'name');
      saveView('View 4', 'test4', 'name');
      saveView('View 5', 'test5', 'name');

      const result = saveView('View 6', 'test6', 'name');
      expect(result).toBeNull();

      const views = getSavedViews();
      expect(views).toHaveLength(5);
    });
  });

  describe('deleteView', () => {
    it('should delete a view successfully', () => {
      const view = saveView('Delete Me', 'test', 'name');
      expect(view).not.toBeNull();

      const result = deleteView(view!.id);
      expect(result).toBe(true);

      const views = getSavedViews();
      expect(views).toHaveLength(0);
    });

    it('should return false for non-existent view', () => {
      const result = deleteView('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getViewById', () => {
    it('should return view by id', () => {
      const saved = saveView('Find Me', 'test', 'name');
      expect(saved).not.toBeNull();

      const found = getViewById(saved!.id);
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Find Me');
    });

    it('should return null for non-existent id', () => {
      const found = getViewById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('updateView', () => {
    it('should update view successfully', () => {
      const saved = saveView('Original', 'test', 'name');
      expect(saved).not.toBeNull();

      const updated = updateView(saved!.id, {
        name: 'Updated',
        searchQuery: 'new-query',
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated');
      expect(updated?.searchQuery).toBe('new-query');
      expect(updated?.sortOrder).toBe('name'); // unchanged
    });

    it('should not update to duplicate name', () => {
      saveView('View 1', 'test1', 'name');
      const view2 = saveView('View 2', 'test2', 'name');

      const result = updateView(view2!.id, { name: 'View 1' });
      expect(result).toBeNull();
    });

    it('should return null for non-existent view', () => {
      const result = updateView('non-existent', { name: 'New Name' });
      expect(result).toBeNull();
    });
  });

  describe('clearAllViews', () => {
    it('should clear all views', () => {
      saveView('View 1', 'test1', 'name');
      saveView('View 2', 'test2', 'name');

      expect(getSavedViews()).toHaveLength(2);

      const result = clearAllViews();
      expect(result).toBe(true);
      expect(getSavedViews()).toHaveLength(0);
    });
  });
});
