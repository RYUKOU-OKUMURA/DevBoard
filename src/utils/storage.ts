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
    const views = JSON.parse(data);
    return Array.isArray(views) ? views : [];
  } catch (error) {
    console.error('Failed to load saved views:', error);
    return [];
  }
}

/**
 * Save a new view to localStorage
 * Returns the saved view with generated ID if successful, or null if failed
 */
export function saveView(
  name: string,
  searchQuery: string,
  sortOrder: SavedView['sortOrder']
): SavedView | null {
  try {
    const views = getSavedViews();

    // Check for duplicate name
    if (views.some((view) => view.name === name)) {
      console.error('A view with this name already exists');
      return null;
    }

    // Check max views limit
    if (views.length >= MAX_SAVED_VIEWS) {
      console.error(`Maximum of ${MAX_SAVED_VIEWS} saved views reached`);
      return null;
    }

    // Create new view
    const newView: SavedView = {
      id: crypto.randomUUID(),
      name,
      searchQuery,
      sortOrder,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    const updatedViews = [...views, newView];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedViews));

    return newView;
  } catch (error) {
    console.error('Failed to save view:', error);
    return null;
  }
}

/**
 * Delete a saved view by ID
 * Returns true if successful, false otherwise
 */
export function deleteView(id: string): boolean {
  try {
    const views = getSavedViews();
    const filteredViews = views.filter((view) => view.id !== id);

    // Check if view was found
    if (filteredViews.length === views.length) {
      console.error('View not found');
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
 * Get a saved view by ID
 */
export function getViewById(id: string): SavedView | null {
  const views = getSavedViews();
  return views.find((view) => view.id === id) || null;
}

/**
 * Update an existing saved view
 * Returns the updated view if successful, or null if failed
 */
export function updateView(
  id: string,
  updates: Partial<Omit<SavedView, 'id' | 'createdAt'>>
): SavedView | null {
  try {
    const views = getSavedViews();
    const viewIndex = views.findIndex((view) => view.id === id);

    if (viewIndex === -1) {
      console.error('View not found');
      return null;
    }

    // Check for duplicate name if name is being updated
    if (updates.name && views.some((view, idx) => view.name === updates.name && idx !== viewIndex)) {
      console.error('A view with this name already exists');
      return null;
    }

    // Update view
    const updatedView = {
      ...views[viewIndex],
      ...updates,
    };

    views[viewIndex] = updatedView;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));

    return updatedView;
  } catch (error) {
    console.error('Failed to update view:', error);
    return null;
  }
}

/**
 * Clear all saved views
 */
export function clearAllViews(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear views:', error);
    return false;
  }
}
