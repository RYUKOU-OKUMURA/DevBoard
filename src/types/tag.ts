/**
 * Tag data types for DevBoard tag feature
 */

/**
 * Tag definition
 */
export type Tag = {
  id: string; // UUID
  name: string; // Display name (e.g., "Priority", "Experimental")
  color: string; // HEX color code (e.g., "#FF5733")
  createdAt: string; // ISO 8601 format
};

/**
 * Repository tag mapping
 * Key: Repository ID (repo.id)
 * Value: Array of tag IDs
 */
export type RepoTagsMap = Record<string, string[]>;

/**
 * Tag filter settings (for preset)
 */
export type TagFilter = {
  tagIds: string[]; // Selected tag IDs
  mode: 'AND' | 'OR'; // Multiple tag join mode (default: AND)
};

/**
 * Tag color presets
 */
export const TAG_COLOR_PRESETS = [
  { name: 'Red', value: '#EF4444' }, // Tailwind red-500
  { name: 'Orange', value: '#F97316' }, // orange-500
  { name: 'Yellow', value: '#EAB308' }, // yellow-500
  { name: 'Green', value: '#22C55E' }, // green-500
  { name: 'Blue', value: '#3B82F6' }, // blue-500
  { name: 'Purple', value: '#A855F7' }, // purple-500
  { name: 'Pink', value: '#EC4899' }, // pink-500
  { name: 'Gray', value: '#6B7280' }, // gray-500
] as const;
