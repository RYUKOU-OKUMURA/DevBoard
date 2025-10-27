import { ViewPreset, ColumnKey, SavedView } from '../types';
import { DEFAULT_CONFIG } from './classify';

const PRESET_STORAGE_KEY_PREFIX = 'github-dashboard-presets';
const PRESET_STORAGE_KEY_LEGACY = 'github-dashboard-presets'; // Legacy key without account ID
const MIGRATION_FLAG_KEY = 'github-dashboard-presets-migrated';
const MAX_PRESETS = 5;

/**
 * Get storage key for presets based on account ID
 */
function getPresetStorageKey(accountId?: string): string {
  if (accountId) {
    return `${PRESET_STORAGE_KEY_PREFIX}:${accountId}`;
  }
  // Fallback to global key for backward compatibility
  return PRESET_STORAGE_KEY_PREFIX;
}

/**
 * Migrate legacy presets to account-specific storage
 * This runs once per account and preserves existing user data
 */
function migrateLegacyPresets(accountId: string): void {
  try {
    // Check if migration has already been done for this account
    const migrationFlags = JSON.parse(
      localStorage.getItem(MIGRATION_FLAG_KEY) || '{}'
    ) as Record<string, boolean>;

    if (migrationFlags[accountId]) {
      // Already migrated for this account
      return;
    }

    const newStorageKey = getPresetStorageKey(accountId);

    // Check if new key already has data
    const existingNewData = localStorage.getItem(newStorageKey);
    if (existingNewData) {
      // New storage already has data, mark as migrated and skip
      migrationFlags[accountId] = true;
      localStorage.setItem(MIGRATION_FLAG_KEY, JSON.stringify(migrationFlags));
      return;
    }

    // Try to load legacy presets
    const legacyData = localStorage.getItem(PRESET_STORAGE_KEY_LEGACY);
    if (!legacyData) {
      // No legacy data to migrate
      migrationFlags[accountId] = true;
      localStorage.setItem(MIGRATION_FLAG_KEY, JSON.stringify(migrationFlags));
      return;
    }

    const legacyPresets = JSON.parse(legacyData);
    if (!Array.isArray(legacyPresets) || legacyPresets.length === 0) {
      // No valid legacy data
      migrationFlags[accountId] = true;
      localStorage.setItem(MIGRATION_FLAG_KEY, JSON.stringify(migrationFlags));
      return;
    }

    // Migrate: add accountId to each preset and save to new key
    const migratedPresets = legacyPresets.map((preset: ViewPreset) => ({
      ...preset,
      accountId: accountId,
    }));

    localStorage.setItem(newStorageKey, JSON.stringify(migratedPresets));

    // Mark migration as complete for this account
    migrationFlags[accountId] = true;
    localStorage.setItem(MIGRATION_FLAG_KEY, JSON.stringify(migrationFlags));

    console.log(`Successfully migrated ${migratedPresets.length} presets for account ${accountId}`);
  } catch (error) {
    console.error('Failed to migrate legacy presets:', error);
  }
}

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
 * Get all presets from localStorage for a specific account
 * Automatically migrates legacy presets on first access
 * @param accountId - Optional account ID. If provided, returns presets for that account only
 */
export function getPresets(accountId?: string): ViewPreset[] {
  try {
    // Attempt migration if accountId is provided
    if (accountId) {
      migrateLegacyPresets(accountId);
    }

    const storageKey = getPresetStorageKey(accountId);
    const data = localStorage.getItem(storageKey);
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
 * Save a new preset to localStorage for a specific account
 * Returns the saved preset with generated ID if successful, or null if failed
 * @param preset - Preset data without id and createdAt
 * @param accountId - Optional account ID. If provided, saves preset for that account
 */
export function savePreset(preset: Omit<ViewPreset, 'id' | 'createdAt'>, accountId?: string): ViewPreset | null {
  try {
    const presets = getPresets(accountId);

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

    // Create new preset with accountId
    const newPreset: ViewPreset = {
      ...preset,
      id: crypto.randomUUID(),
      accountId: accountId,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    const storageKey = getPresetStorageKey(accountId);
    const updatedPresets = [...presets, newPreset];
    localStorage.setItem(storageKey, JSON.stringify(updatedPresets));

    return newPreset;
  } catch (error) {
    console.error('Failed to save preset:', error);
    return null;
  }
}

/**
 * Load a preset by ID for a specific account
 * @param id - Preset ID
 * @param accountId - Optional account ID
 */
export function getPresetById(id: string, accountId?: string): ViewPreset | null {
  const presets = getPresets(accountId);
  return presets.find((preset) => preset.id === id) || null;
}

/**
 * Delete a preset by ID for a specific account
 * Returns true if successful, false otherwise
 * @param id - Preset ID
 * @param accountId - Optional account ID
 */
export function deletePreset(id: string, accountId?: string): boolean {
  try {
    const presets = getPresets(accountId);
    const filteredPresets = presets.filter((preset) => preset.id !== id);

    // Check if preset was found
    if (filteredPresets.length === presets.length) {
      console.error('Preset not found');
      return false;
    }

    const storageKey = getPresetStorageKey(accountId);
    localStorage.setItem(storageKey, JSON.stringify(filteredPresets));
    return true;
  } catch (error) {
    console.error('Failed to delete preset:', error);
    return false;
  }
}

/**
 * Update an existing preset for a specific account
 * Returns the updated preset if successful, or null if failed
 * @param id - Preset ID
 * @param updates - Partial preset updates
 * @param accountId - Optional account ID
 */
export function updatePreset(
  id: string,
  updates: Partial<Omit<ViewPreset, 'id' | 'createdAt'>>,
  accountId?: string
): ViewPreset | null {
  try {
    const presets = getPresets(accountId);
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
    const storageKey = getPresetStorageKey(accountId);
    localStorage.setItem(storageKey, JSON.stringify(presets));

    return updatedPreset;
  } catch (error) {
    console.error('Failed to update preset:', error);
    return null;
  }
}

/**
 * Clear all presets for a specific account
 * @param accountId - Optional account ID. If provided, clears presets for that account only
 */
export function clearAllPresets(accountId?: string): boolean {
  try {
    const storageKey = getPresetStorageKey(accountId);
    localStorage.removeItem(storageKey);
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
