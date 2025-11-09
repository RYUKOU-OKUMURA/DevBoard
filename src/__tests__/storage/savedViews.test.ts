import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedViews,
  saveView,
  deleteView,
  updateView,
  getViewById,
  clearAllViews,
} from '../../storage/savedViews';

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

// Mock crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${Date.now()}-${uuidCounter++}`,
  },
});

describe('savedViews storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getSavedViews', () => {
    it('should return empty array when no views are saved', () => {
      const views = getSavedViews();
      expect(views).toEqual([]);
    });

    it('should return saved views from localStorage', () => {
      const mockViews = [
        {
          id: '1',
          name: 'Test View',
          searchQuery: 'test',
          sortOrder: 'lastUpdated' as const,
          createdAt: new Date().toISOString(),
        },
      ];
      localStorageMock.setItem('github-dashboard-saved-views', JSON.stringify(mockViews));

      const views = getSavedViews();
      expect(views).toEqual(mockViews);
    });

    it('should return empty array on parse error', () => {
      localStorageMock.setItem('github-dashboard-saved-views', 'invalid-json');
      const views = getSavedViews();
      expect(views).toEqual([]);
    });
  });

  describe('saveView', () => {
    it('should save a new view', () => {
      const view = saveView('Test View', 'test query', 'lastUpdated');
      
      expect(view).toBeTruthy();
      expect(view?.name).toBe('Test View');
      expect(view?.searchQuery).toBe('test query');
      expect(view?.sortOrder).toBe('lastUpdated');
      expect(view?.id).toBeTruthy();
      expect(view?.createdAt).toBeTruthy();
    });

    it('should trim whitespace from name and query', () => {
      const view = saveView('  Test View  ', '  test query  ', 'name');
      
      expect(view?.name).toBe('Test View');
      expect(view?.searchQuery).toBe('test query');
    });

    it('should reject duplicate names (case-insensitive)', () => {
      saveView('Test View', 'query1', 'lastUpdated');
      
      expect(() => {
        saveView('test view', 'query2', 'name');
      }).toThrow('already exists');
    });

    it('should enforce max 5 saved views limit', () => {
      // Save 5 views
      for (let i = 1; i <= 5; i++) {
        saveView(`View ${i}`, `query${i}`, 'lastUpdated');
      }

      // Try to save 6th view
      expect(() => {
        saveView('View 6', 'query6', 'lastUpdated');
      }).toThrow('Maximum of 5 saved views reached');
    });
  });

  describe('deleteView', () => {
    it('should delete a view by id', () => {
      const view = saveView('Test View', 'test', 'lastUpdated');
      expect(getSavedViews()).toHaveLength(1);

      const deleted = deleteView(view!.id);
      expect(deleted).toBe(true);
      expect(getSavedViews()).toHaveLength(0);
    });

    it('should return false when view not found', () => {
      const deleted = deleteView('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('updateView', () => {
    beforeEach(() => {
      localStorageMock.clear();
    });

    it('should update view name', () => {
      const view = saveView('Old Name', 'query', 'lastUpdated');
      const updated = updateView(view!.id, { name: 'New Name' });

      expect(updated?.name).toBe('New Name');
      expect(updated?.searchQuery).toBe('query');
    });

    it('should update search query', () => {
      const view = saveView('Name', 'old query', 'lastUpdated');
      const updated = updateView(view!.id, { searchQuery: 'new query' });

      expect(updated?.searchQuery).toBe('new query');
    });

    it('should update sort order', () => {
      const view = saveView('Name', 'query', 'lastUpdated');
      const updated = updateView(view!.id, { sortOrder: 'name' });

      expect(updated?.sortOrder).toBe('name');
    });

    it('should reject duplicate names when updating', () => {
      const view1 = saveView('View 1', 'query1', 'lastUpdated');
      const view2 = saveView('View 2', 'query2', 'lastUpdated');

      expect(view1).toBeTruthy();
      expect(view2).toBeTruthy();

      let errorThrown = false;
      let errorMessage = '';
      
      try {
        updateView(view2!.id, { name: 'View 1' });
      } catch (error) {
        errorThrown = true;
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      expect(errorThrown).toBe(true);
      expect(errorMessage).toContain('already exists');
    });

    it('should return null for non-existent view', () => {
      const result = updateView('non-existent-id', { name: 'New Name' });
      expect(result).toBeNull();
    });
  });

  describe('getViewById', () => {
    it('should return view by id', () => {
      const view = saveView('Test View', 'query', 'lastUpdated');
      const found = getViewById(view!.id);

      expect(found).toEqual(view);
    });

    it('should return null when view not found', () => {
      const found = getViewById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('clearAllViews', () => {
    it('should clear all saved views', () => {
      saveView('View 1', 'query1', 'lastUpdated');
      saveView('View 2', 'query2', 'name');
      expect(getSavedViews()).toHaveLength(2);

      clearAllViews();
      expect(getSavedViews()).toHaveLength(0);
    });
  });
});
