import { ViewPreset, ColumnKey } from '../types';
import { nanoid } from 'nanoid';
import { getStorageItem, setStorageItem, removeStorageItem, getStorageString } from './storage';
import { devError, devLog } from './logger';

const PRESET_STORAGE_KEY_PREFIX = 'github-dashboard-presets';
const PRESET_STORAGE_KEY_LEGACY = 'github-dashboard-presets'; // Legacy key without account ID
const MIGRATION_FLAG_KEY = 'github-dashboard-presets-migrated';
const MAX_PRESETS = 5;

function generatePresetId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return nanoid();
}

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
    const migrationFlags = getStorageItem<Record<string, boolean>>(MIGRATION_FLAG_KEY, {});

    if (migrationFlags[accountId]) {
      // Already migrated for this account
      return;
    }

    const newStorageKey = getPresetStorageKey(accountId);

    // Check if new key already has data
    const existingNewData = getStorageString(newStorageKey, '');
    if (existingNewData) {
      // New storage already has data, mark as migrated and skip
      migrationFlags[accountId] = true;
      setStorageItem(MIGRATION_FLAG_KEY, migrationFlags);
      return;
    }

    // Try to load legacy presets
    const legacyData = getStorageString(PRESET_STORAGE_KEY_LEGACY, '');
    if (!legacyData) {
      // No legacy data to migrate
      migrationFlags[accountId] = true;
      setStorageItem(MIGRATION_FLAG_KEY, migrationFlags);
      return;
    }

    const legacyPresets = JSON.parse(legacyData);
    if (!Array.isArray(legacyPresets) || legacyPresets.length === 0) {
      // No valid legacy data
      migrationFlags[accountId] = true;
      setStorageItem(MIGRATION_FLAG_KEY, migrationFlags);
      return;
    }

    // Migrate: add accountId to each preset and save to new key
    const migratedPresets = legacyPresets.map((preset: ViewPreset) => ({
      ...preset,
      accountId: accountId,
    }));

    setStorageItem(newStorageKey, migratedPresets);

    // Mark migration as complete for this account
    migrationFlags[accountId] = true;
    setStorageItem(MIGRATION_FLAG_KEY, migrationFlags);

    devLog(`Successfully migrated ${migratedPresets.length} presets for account ${accountId}`);
  } catch (error) {
    devError('Failed to migrate legacy presets:', error);
  }
}

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
    return getStorageItem<ViewPreset[]>(storageKey, []);
  } catch (error) {
    devError('Failed to load presets:', error);
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
      devError('A preset with this name already exists');
      return null;
    }

    // Check max presets limit
    if (presets.length >= MAX_PRESETS) {
      devError(`Maximum of ${MAX_PRESETS} presets reached`);
      return null;
    }

    // Create new preset with accountId
    const newPreset: ViewPreset = {
      ...preset,
      id: generatePresetId(),
      accountId: accountId,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    const storageKey = getPresetStorageKey(accountId);
    const updatedPresets = [...presets, newPreset];
    if (!setStorageItem(storageKey, updatedPresets)) {
      return null;
    }

    return newPreset;
  } catch (error) {
    devError('Failed to save preset:', error);
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
      devError('Preset not found');
      return false;
    }

    const storageKey = getPresetStorageKey(accountId);
    return setStorageItem(storageKey, filteredPresets);
  } catch (error) {
    devError('Failed to delete preset:', error);
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
      devError('Preset not found');
      return null;
    }

    // Check for duplicate name if name is being updated
    if (updates.name && presets.some((preset, idx) => preset.name === updates.name && idx !== presetIndex)) {
      devError('A preset with this name already exists');
      return null;
    }

    // Update preset
    const updatedPreset = {
      ...presets[presetIndex],
      ...updates,
    };

    presets[presetIndex] = updatedPreset;
    const storageKey = getPresetStorageKey(accountId);
    if (!setStorageItem(storageKey, presets)) {
      return null;
    }

    return updatedPreset;
  } catch (error) {
    devError('Failed to update preset:', error);
    return null;
  }
}

/**
 * Clear all presets for a specific account
 * @param accountId - Optional account ID. If provided, clears presets for that account only
 */
export function clearAllPresets(accountId?: string): boolean {
  const storageKey = getPresetStorageKey(accountId);
  return removeStorageItem(storageKey);
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
  columnDisplayOrder: ColumnKey[];
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
    columnDisplayOrder: [...params.columnDisplayOrder],
    thresholds: { ...params.thresholds },
    columnAssignments: { ...params.columnAssignments },
    hiddenRepoIds: [...params.hiddenRepoIds],
  };
}
