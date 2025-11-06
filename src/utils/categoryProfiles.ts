import { CategoryProfile, CustomCategory } from '../types';

const CATEGORY_PROFILES_STORAGE_KEY = 'github-dashboard-category-profiles';
const MAX_PROFILES = 5;

// Default profile (Active/Stale/Dormant/Archived)
export const DEFAULT_PROFILE: CategoryProfile = {
  id: 'default',
  name: 'デフォルト (Active/Stale/Dormant/Archived)',
  categories: [
    {
      key: 'Active',
      title: 'アクティブ',
      filter: { type: 'threshold', activeThreshold: 60, staleThreshold: 180 },
    },
    {
      key: 'Stale',
      title: '停滞',
      filter: { type: 'threshold', activeThreshold: 60, staleThreshold: 180 },
    },
    {
      key: 'Dormant',
      title: '休眠',
      filter: { type: 'threshold', activeThreshold: 60, staleThreshold: 180 },
    },
    {
      key: 'Archived',
      title: 'アーカイブ',
      filter: { type: 'archived' },
    },
  ],
  createdAt: new Date().toISOString(),
  isDefault: true,
};

/**
 * Get all saved category profiles
 */
export function getCategoryProfiles(): CategoryProfile[] {
  try {
    const raw = localStorage.getItem(CATEGORY_PROFILES_STORAGE_KEY);
    if (raw) {
      const profiles = JSON.parse(raw) as CategoryProfile[];
      return [DEFAULT_PROFILE, ...profiles];
    }
  } catch (error) {
    console.error('Failed to load category profiles:', error);
  }
  return [DEFAULT_PROFILE];
}

/**
 * Save a new category profile
 */
export function saveCategoryProfile(
  name: string,
  categories: CustomCategory[]
): CategoryProfile | null {
  const profiles = getCategoryProfiles().filter((p) => !p.isDefault);

  if (profiles.length >= MAX_PROFILES) {
    return null;
  }

  const newProfile: CategoryProfile = {
    id: `profile-${Date.now()}`,
    name,
    categories,
    createdAt: new Date().toISOString(),
  };

  const updatedProfiles = [...profiles, newProfile];

  try {
    localStorage.setItem(CATEGORY_PROFILES_STORAGE_KEY, JSON.stringify(updatedProfiles));
    return newProfile;
  } catch (error) {
    console.error('Failed to save category profile:', error);
    return null;
  }
}

/**
 * Delete a category profile
 */
export function deleteCategoryProfile(profileId: string): boolean {
  if (profileId === 'default') {
    return false; // Cannot delete default profile
  }

  const profiles = getCategoryProfiles().filter((p) => !p.isDefault);
  const updatedProfiles = profiles.filter((p) => p.id !== profileId);

  try {
    localStorage.setItem(CATEGORY_PROFILES_STORAGE_KEY, JSON.stringify(updatedProfiles));
    return true;
  } catch (error) {
    console.error('Failed to delete category profile:', error);
    return false;
  }
}

/**
 * Get a category profile by ID
 */
export function getCategoryProfileById(profileId: string): CategoryProfile | undefined {
  const profiles = getCategoryProfiles();
  return profiles.find((p) => p.id === profileId);
}
