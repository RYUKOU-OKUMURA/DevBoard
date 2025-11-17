/**
 * TagSelector modal - select tags for a repository
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassModal } from './ui/GlassModal';
import { useTags } from '../hooks/useTags';
import { useToast } from '../hooks/useToast';
import { TAG_COLOR_PRESETS } from '../types/tag';
import { focusRing } from '../lib/focusRing';

export type TagSelectorProps = {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
  repoName: string;
};

export function TagSelector({
  isOpen,
  onClose,
  repoId,
  repoName,
}: TagSelectorProps) {
  const { tags, getTagsForRepo, setTagsForRepo, createTag } = useTags();
  const { showToast } = useToast();

  // Local state for selected tags
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLOR_PRESETS[4].value);
  const [createError, setCreateError] = useState<string | null>(null);

  // Load current tags when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentTags = getTagsForRepo(repoId);
      setSelectedTagIds(currentTags);
    }
  }, [isOpen, repoId, getTagsForRepo]);

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = () => {
    try {
      setTagsForRepo(repoId, selectedTagIds);
      showToast({
        variant: 'success',
        title: 'Tags updated',
        description: `Tags for ${repoName} have been updated`,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update tags';
      showToast({
        variant: 'error',
        title: 'Error',
        description: message,
      });
    }
  };

  const handleQuickCreate = () => {
    try {
      const newTag = createTag(newTagName, newTagColor);
      if (newTag) {
        // Automatically select the newly created tag
        setSelectedTagIds((prev) => [...prev, newTag.id]);
        showToast({
          variant: 'success',
          title: 'Tag created',
          description: `Tag "${newTag.name}" has been created and selected`,
        });
        // Reset form
        setNewTagName('');
        setNewTagColor(TAG_COLOR_PRESETS[4].value);
        setShowCreateForm(false);
        setCreateError(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tag';
      setCreateError(message);
    }
  };

  const isCreateFormValid = newTagName.trim().length > 0 && newTagName.length <= 20;

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Select Tags - ${repoName}`}
      className="max-w-lg"
    >
      <div className="space-y-stack-lg">
        {/* Available Tags */}
        <div>
          <h3 className="text-body font-semibold text-text-primary mb-stack-md">
            Available Tags
          </h3>

          {tags.length === 0 ? (
            <div className="text-center py-6 text-body-sm text-text-muted">
              No tags available. Create one below to get started.
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              <AnimatePresence mode="popLayout">
                {tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);

                  return (
                    <motion.button
                      key={tag.id}
                      type="button"
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onClick={() => handleToggleTag(tag.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all motion-reduce:transition-none ${
                        isSelected
                          ? 'border-brand-purple bg-brand-purple/10'
                          : 'border-[var(--border-subtle)] bg-bg-secondary hover:bg-bg-tertiary'
                      } ${focusRing.default} ${focusRing.brand}`}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={`${isSelected ? 'Deselect' : 'Select'} tag ${tag.name}`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors motion-reduce:transition-none ${
                          isSelected
                            ? 'border-brand-purple bg-brand-purple'
                            : 'border-[var(--border-default)]'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2 6L5 9L10 3"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Color Circle */}
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />

                      {/* Tag Name */}
                      <div className="flex-1 text-left text-body font-medium text-text-primary">
                        {tag.name}
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Quick Create Form */}
        <div>
          {!showCreateForm ? (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className={`w-full px-4 py-2 text-body font-medium text-brand-purple border border-brand-purple rounded-lg hover:bg-brand-purple/10 transition-colors motion-reduce:transition-none ${focusRing.default} ${focusRing.brand}`}
            >
              + Create New Tag
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg border border-[var(--border-subtle)] bg-bg-secondary p-inset-md"
            >
              <h4 className="text-body-sm font-semibold text-text-primary mb-stack-sm">
                Quick Create Tag
              </h4>

              <div className="space-y-stack-sm">
                {/* Tag Name */}
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => {
                    setNewTagName(e.target.value);
                    setCreateError(null);
                  }}
                  placeholder="Tag name"
                  maxLength={20}
                  className={`w-full px-3 py-2 text-body bg-bg-primary border ${
                    createError ? 'border-accent-red' : 'border-[var(--border-subtle)]'
                  } rounded-lg text-text-primary placeholder-text-muted ${focusRing.default} ${focusRing.brand}`}
                />
                {createError && (
                  <div className="text-body-sm text-accent-red" role="alert">
                    {createError}
                  </div>
                )}

                {/* Color Selection */}
                <div className="flex flex-wrap gap-2">
                  {TAG_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setNewTagColor(preset.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all motion-reduce:transition-none ${
                        newTagColor === preset.value
                          ? 'border-[var(--brand-purple)] scale-110'
                          : 'border-transparent hover:scale-105'
                      } ${focusRing.default} ${focusRing.brand}`}
                      style={{ backgroundColor: preset.value }}
                      aria-label={`Select ${preset.name} color`}
                    />
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleQuickCreate}
                    disabled={!isCreateFormValid}
                    className={`flex-1 px-4 py-2 text-body-sm font-medium rounded-lg transition-all motion-reduce:transition-none ${
                      isCreateFormValid
                        ? 'bg-brand-purple text-white hover:opacity-90'
                        : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
                    } ${focusRing.default} ${focusRing.brand}`}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewTagName('');
                      setCreateError(null);
                    }}
                    className={`px-4 py-2 text-body-sm font-medium text-text-secondary hover:text-text-primary rounded-lg ${focusRing.default} ${focusRing.brand}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-inline-md pt-stack-sm border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-4 py-2 text-body font-medium text-text-secondary hover:text-text-primary border border-[var(--border-subtle)] rounded-lg hover:bg-bg-tertiary transition-colors motion-reduce:transition-none ${focusRing.default} ${focusRing.brand}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex-1 px-4 py-2 text-body font-medium bg-brand-purple text-white rounded-lg hover:opacity-90 transition-opacity motion-reduce:transition-none ${focusRing.default} ${focusRing.brand}`}
          >
            Save
          </button>
        </div>

        {/* Selected Count */}
        <div
          className="text-center text-body-sm text-text-muted"
          aria-live="polite"
          aria-atomic="true"
        >
          {selectedTagIds.length === 0
            ? 'No tags selected'
            : `${selectedTagIds.length} ${
                selectedTagIds.length === 1 ? 'tag' : 'tags'
              } selected`}
        </div>
      </div>
    </GlassModal>
  );
}
