import { ViewPreset, ColumnKey, SavedView } from '../types';
import { DEFAULT_CONFIG } from './classify';

const PRESET_STORAGE_KEY = 'github-dashboard-presets';
const MAX_PRESETS = 5;

const DEFAULT_COLUMN_TITLES: Record<ColumnKey, string> = {
  Active: 'アクティブ',
  Stale: '停滞',
  Dormant: '休眠',
  Archived: 'アーカイブ',
};

const DEFAULT_COLUMN_VISIBILITY: Record<ColumnKey, boolean> = {
  Active: true,
  Stale: true,
  Dormant: true,
  Archived: true,
};

/**
 * Get all presets from localStorage
 */
export function getPresets(): ViewPreset[] {
  try {
    const data = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!data) {
      return [];
    }
    const presets = JSON.parse(data);
    return Array.isArray(presets) ? presets : [];
  } catch (error) {
    console.error('Failed to load presets:', error);
    return [];
  }
}

/**
 * Save a new preset to localStorage
 * Returns the saved preset with generated ID if successful, or null if failed
 */
export function savePreset(preset: Omit<ViewPreset, 'id' | 'createdAt'>): ViewPreset | null {
  try {
    const presets = getPresets();

    // Check for duplicate name
    if (presets.some((p) => p.name === preset.name)) {
      console.error('A preset with this name already exists');
      return null;
    }

    // Check max presets limit
    if (presets.length >= MAX_PRESETS) {
      console.error(`Maximum of ${MAX_PRESETS} presets reached`);
      return null;
    }

    // Create new preset
    const newPreset: ViewPreset = {
      ...preset,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    const updatedPresets = [...presets, newPreset];
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(updatedPresets));

    return newPreset;
  } catch (error) {
    console.error('Failed to save preset:', error);
    return null;
  }
}

/**
 * Load a preset by ID
 */
export function getPresetById(id: string): ViewPreset | null {
  const presets = getPresets();
  return presets.find((preset) => preset.id === id) || null;
}

/**
 * Delete a preset by ID
 * Returns true if successful, false otherwise
 */
export function deletePreset(id: string): boolean {
  try {
    const presets = getPresets();
    const filteredPresets = presets.filter((preset) => preset.id !== id);

    // Check if preset was found
    if (filteredPresets.length === presets.length) {
      console.error('Preset not found');
      return false;
    }

    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(filteredPresets));
    return true;
  } catch (error) {
    console.error('Failed to delete preset:', error);
    return false;
  }
}

/**
 * Update an existing preset
 * Returns the updated preset if successful, or null if failed
 */
export function updatePreset(
  id: string,
  updates: Partial<Omit<ViewPreset, 'id' | 'createdAt'>>
): ViewPreset | null {
  try {
    const presets = getPresets();
    const presetIndex = presets.findIndex((preset) => preset.id === id);

    if (presetIndex === -1) {
      console.error('Preset not found');
      return null;
    }

    // Check for duplicate name if name is being updated
    if (updates.name && presets.some((preset, idx) => preset.name === updates.name && idx !== presetIndex)) {
      console.error('A preset with this name already exists');
      return null;
    }

    // Update preset
    const updatedPreset = {
      ...presets[presetIndex],
      ...updates,
    };

    presets[presetIndex] = updatedPreset;
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));

    return updatedPreset;
  } catch (error) {
    console.error('Failed to update preset:', error);
    return null;
  }
}

/**
 * Clear all presets
 */
export function clearAllPresets(): boolean {
  try {
    localStorage.removeItem(PRESET_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear presets:', error);
    return false;
  }
}

/**
 * Migrate old SavedView to ViewPreset format
 * This is a helper for backward compatibility
 */
export function migrateFromSavedView(savedView: SavedView): Omit<ViewPreset, 'id' | 'createdAt'> {
  return {
    name: savedView.name,
    searchQuery: savedView.searchQuery,
    sortOrder: savedView.sortOrder,
    columnTitles: { ...DEFAULT_COLUMN_TITLES },
    columnOrder: {
      Active: [],
      Stale: [],
      Dormant: [],
      Archived: [],
    },
    columnVisibility: { ...DEFAULT_COLUMN_VISIBILITY },
    thresholds: {
      activeThreshold: DEFAULT_CONFIG.activeThreshold,
      staleThreshold: DEFAULT_CONFIG.staleThreshold,
    },
    columnAssignments: {},
    hiddenRepoIds: [],
  };
}

/**
 * Create a preset snapshot from current dashboard state
 */
export function createPresetSnapshot(params: {
  name: string;
  searchQuery: string;
  sortOrder: ViewPreset['sortOrder'];
  columnTitles: Record<ColumnKey, string>;
  columnOrder: Record<ColumnKey, string[]>;
  columnVisibility: Record<ColumnKey, boolean>;
  thresholds: { activeThreshold: number; staleThreshold: number };
  columnAssignments: Record<string, ColumnKey>;
  hiddenRepoIds: string[];
}): Omit<ViewPreset, 'id' | 'createdAt'> {
  return {
    name: params.name,
    searchQuery: params.searchQuery,
    sortOrder: params.sortOrder,
    columnTitles: { ...params.columnTitles },
    columnOrder: { ...params.columnOrder },
    columnVisibility: { ...params.columnVisibility },
    thresholds: { ...params.thresholds },
    columnAssignments: { ...params.columnAssignments },
    hiddenRepoIds: [...params.hiddenRepoIds],
  };
}
