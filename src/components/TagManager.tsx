/**
 * TagManager modal - manage tags (create, edit, delete)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassModal } from './ui/GlassModal';
import { useTags } from '../hooks/useTags';
import { useToast } from '../hooks/useToast';
import { TAG_COLOR_PRESETS } from '../types/tag';
import { focusRing } from '../lib/focusRing';

export type TagManagerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function TagManager({ isOpen, onClose }: TagManagerProps) {
  const { tags, createTag, updateTag, deleteTag, getTagUsageCount } =
    useTags();
  const { showToast } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLOR_PRESETS[4].value); // Default to blue
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    try {
      const newTag = createTag(name, color);
      if (newTag) {
        showToast({
          variant: 'success',
          title: 'Tag created',
          description: `Tag "${newTag.name}" has been created`,
        });
        // Reset form
        setName('');
        setColor(TAG_COLOR_PRESETS[4].value);
        setError(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tag';
      setError(message);
      showToast({
        variant: 'error',
        title: 'Error',
        description: message,
      });
    }
  };

  const handleUpdate = (tagId: string, updates: { name?: string; color?: string }) => {
    try {
      const updatedTag = updateTag(tagId, updates);
      if (updatedTag) {
        showToast({
          variant: 'success',
          title: 'Tag updated',
          description: `Tag "${updatedTag.name}" has been updated`,
        });
        setEditingId(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update tag';
      showToast({
        variant: 'error',
        title: 'Error',
        description: message,
      });
    }
  };

  const handleDelete = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return;

    const usageCount = getTagUsageCount(tagId);

    // Confirm deletion if tag is in use
    if (usageCount > 0) {
      const confirmed = window.confirm(
        `Tag "${tag.name}" is used by ${usageCount} ${
          usageCount === 1 ? 'repository' : 'repositories'
        }. Are you sure you want to delete it?`
      );
      if (!confirmed) return;
    }

    try {
      deleteTag(tagId);
      showToast({
        variant: 'success',
        title: 'Tag deleted',
        description: `Tag "${tag.name}" has been deleted`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete tag';
      showToast({
        variant: 'error',
        title: 'Error',
        description: message,
      });
    }
  };

  const handleColorSelect = (selectedColor: string) => {
    setColor(selectedColor);
  };

  const isFormValid = name.trim().length > 0 && name.length <= 20;

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tag Management"
      className="max-w-2xl"
      tone="light"
    >
      <div className="space-y-stack-lg">
        {/* Create New Tag Form */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-bg-secondary p-inset-md">
          <h3 className="text-body font-semibold text-text-primary mb-stack-md">
            Create New Tag
          </h3>

          <div className="space-y-stack-md">
            {/* Tag Name Input */}
            <div>
              <label
                htmlFor="tag-name"
                className="block text-body-sm font-medium text-text-secondary mb-1"
              >
                Tag Name
              </label>
              <input
                id="tag-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., Priority, Experimental"
                maxLength={20}
                className={`w-full px-3 py-2 text-body bg-bg-primary border ${
                  error ? 'border-accent-red' : 'border-[var(--border-subtle)]'
                } rounded-lg text-text-primary placeholder-text-muted ${focusRing.default} ${focusRing.brand} transition-colors motion-reduce:transition-none`}
                aria-invalid={!!error}
                aria-describedby={error ? 'tag-name-error' : undefined}
              />
              <div className="mt-1 text-caption text-text-muted">
                {name.length}/20 characters
              </div>
              {error && (
                <div
                  id="tag-name-error"
                  role="alert"
                  className="mt-1 text-body-sm text-accent-red"
                >
                  {error}
                </div>
              )}
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-body-sm font-medium text-text-secondary mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleColorSelect(preset.value)}
                    className={`w-10 h-10 rounded-full border-2 transition-all motion-reduce:transition-none ${
                      color === preset.value
                        ? 'border-[var(--brand-purple)] scale-110'
                        : 'border-transparent hover:scale-105'
                    } ${focusRing.default} ${focusRing.brand}`}
                    style={{ backgroundColor: preset.value }}
                    aria-label={`Select ${preset.name} color`}
                    aria-pressed={color === preset.value}
                  />
                ))}
              </div>
              <div
                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-bg-primary"
                aria-live="polite"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-body-sm text-text-secondary">
                  Selected color: {color}
                </span>
              </div>
            </div>

            {/* Create Button */}
            <button
              type="button"
              onClick={handleCreate}
              disabled={!isFormValid}
              className={`w-full px-4 py-2 text-body font-medium rounded-lg transition-all motion-reduce:transition-none ${
                isFormValid
                  ? 'bg-brand-purple text-white hover:opacity-90'
                  : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
              } ${focusRing.default} ${focusRing.brand}`}
            >
              Create Tag
            </button>
          </div>
        </div>

        {/* Existing Tags List */}
        <div>
          <h3 className="text-body font-semibold text-text-primary mb-stack-md">
            Existing Tags ({tags.length})
          </h3>

          {tags.length === 0 ? (
            <div className="text-center py-8 text-body-sm text-text-muted">
              No tags yet. Create your first tag above.
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {tags.map((tag) => {
                  const usageCount = getTagUsageCount(tag.id);
                  const isEditing = editingId === tag.id;

                  return (
                    <motion.div
                      key={tag.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-bg-secondary hover:bg-bg-tertiary transition-colors motion-reduce:transition-none"
                    >
                      {/* Color Circle */}
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                        aria-label={`Tag color: ${tag.color}`}
                      />

                      {/* Tag Name */}
                      {isEditing ? (
                        <input
                          type="text"
                          defaultValue={tag.name}
                          onBlur={(e) => {
                            if (e.target.value !== tag.name) {
                              handleUpdate(tag.id, { name: e.target.value });
                            } else {
                              setEditingId(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          autoFocus
                          className={`flex-1 px-2 py-1 text-body bg-bg-primary border border-[var(--border-subtle)] rounded ${focusRing.default} ${focusRing.brand}`}
                        />
                      ) : (
                        <div className="flex-1">
                          <div className="text-body font-medium text-text-primary">
                            {tag.name}
                          </div>
                          <div className="text-caption text-text-muted">
                            {usageCount} {usageCount === 1 ? 'repository' : 'repositories'}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className={`px-3 py-1 text-body-sm text-text-secondary hover:text-text-primary rounded ${focusRing.default} ${focusRing.brand}`}
                          >
                            Cancel
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingId(tag.id)}
                              className={`px-3 py-1 text-body-sm text-text-secondary hover:text-brand-purple rounded ${focusRing.default} ${focusRing.brand}`}
                              aria-label={`Edit tag ${tag.name}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tag.id)}
                              className={`px-3 py-1 text-body-sm text-text-secondary hover:text-accent-red rounded ${focusRing.default} ${focusRing.danger}`}
                              aria-label={`Delete tag ${tag.name}`}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Warning for approaching limits */}
        {tags.length >= 150 && (
          <div
            className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-body-sm text-yellow-600 dark:text-yellow-400"
            role="alert"
          >
            ⚠️ You have {tags.length} tags. Consider removing unused tags to maintain
            performance.
          </div>
        )}
      </div>
    </GlassModal>
  );
}
