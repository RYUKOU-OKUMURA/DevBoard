import { SavedView } from '../types';

const STORAGE_KEY = 'github-dashboard-saved-views';
const MAX_SAVED_VIEWS = 5;

/**
 * Get all saved views from localStorage
 */
export function getSavedViews(): SavedView[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    const views = JSON.parse(data) as SavedView[];
    return Array.isArray(views) ? views : [];
  } catch (error) {
    console.error('Failed to load saved views:', error);
    return [];
  }
}

/**
 * Save a new view to localStorage
 * Returns the created view or null if failed
 */
export function saveView(
  name: string,
  searchQuery: string,
  sortOrder: SavedView['sortOrder']
): SavedView | null {
  try {
    const views = getSavedViews();

    // Check for duplicate names (case-insensitive)
    const normalizedName = name.trim().toLowerCase();
    if (views.some((v) => v.name.toLowerCase() === normalizedName)) {
      throw new Error(`A view with the name "${name}" already exists`);
    }

    // Check max limit
    if (views.length >= MAX_SAVED_VIEWS) {
      throw new Error(`Maximum of ${MAX_SAVED_VIEWS} saved views reached`);
    }

    const newView: SavedView = {
      id: crypto.randomUUID(),
      name: name.trim(),
      searchQuery: searchQuery.trim(),
      sortOrder,
      createdAt: new Date().toISOString(),
    };

    const updatedViews = [...views, newView];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedViews));
    return newView;
  } catch (error) {
    console.error('Failed to save view:', error);
    if (error instanceof Error) {
      throw error;
    }
    return null;
  }
}

/**
 * Delete a saved view by ID
 */
export function deleteView(id: string): boolean {
  try {
    const views = getSavedViews();
    const filteredViews = views.filter((v) => v.id !== id);
    
    if (filteredViews.length === views.length) {
      // No view was deleted
      return false;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredViews));
    return true;
  } catch (error) {
    console.error('Failed to delete view:', error);
    return false;
  }
}

/**
 * Update an existing saved view
 */
export function updateView(
  id: string,
  updates: Partial<Pick<SavedView, 'name' | 'searchQuery' | 'sortOrder'>>
): SavedView | null {
  try {
    const views = getSavedViews();
    const index = views.findIndex((v) => v.id === id);

    if (index === -1) {
      return null;
    }

    // Check for duplicate names if name is being updated
    if (updates.name) {
      const normalizedName = updates.name.trim().toLowerCase();
      const isDuplicate = views.some(
        (v, i) => i !== index && v.name.toLowerCase() === normalizedName
      );
      if (isDuplicate) {
        throw new Error(`A view with the name "${updates.name}" already exists`);
      }
    }

    const updatedView: SavedView = {
      ...views[index],
      ...updates,
      name: updates.name ? updates.name.trim() : views[index].name,
      searchQuery: updates.searchQuery !== undefined ? updates.searchQuery.trim() : views[index].searchQuery,
    };

    views[index] = updatedView;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
    return updatedView;
  } catch (error) {
    console.error('Failed to update view:', error);
    // Re-throw all errors
    throw error;
  }
}

/**
 * Get a saved view by ID
 */
export function getViewById(id: string): SavedView | null {
  const views = getSavedViews();
  return views.find((v) => v.id === id) || null;
}

/**
 * Clear all saved views (useful for testing or reset)
 */
export function clearAllViews(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear views:', error);
  }
}
