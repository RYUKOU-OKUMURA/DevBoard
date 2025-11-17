/**
 * TagBadge component - displays a tag as a colored badge
 */

import React from 'react';
import type { Tag } from '../types/tag';
import { focusRing } from '../lib/focusRing';

export type TagBadgeProps = {
  tag: Tag;
  size?: 'sm' | 'md';
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
};

/**
 * Calculate relative luminance for a color
 */
function getLuminance(hexColor: string): number {
  const rgb = parseInt(hexColor.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;

  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Get readable foreground color based on background
 */
function getReadableForeground(backgroundColor: string): string {
  const lum = getLuminance(backgroundColor);
  // Use white text for dark backgrounds, black for light backgrounds
  return lum > 0.5 ? '#000000' : '#FFFFFF';
}

export function TagBadge({
  tag,
  size = 'sm',
  onRemove,
  onClick,
  className = '',
}: TagBadgeProps) {
  const foregroundColor = getReadableForeground(tag.color);
  const isClickable = !!onClick;
  const isRemovable = !!onRemove;

  const baseClasses =
    'inline-flex items-center gap-1 rounded-full font-medium transition-all motion-reduce:transition-none';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-caption', // 11px/16px
    md: 'px-3 py-1 text-body-sm', // 13px/18px
  };

  const interactiveClasses = isClickable
    ? `cursor-pointer hover:opacity-90 ${focusRing.default} ${focusRing.brand}`
    : '';

  return (
    <span
      className={`${baseClasses} ${sizeClasses[size]} ${interactiveClasses} ${className}`}
      style={{
        backgroundColor: `${tag.color}33`, // 20% opacity
        color: foregroundColor,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: `${tag.color}80`, // 50% opacity
      }}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={`Tag: ${tag.name}`}
    >
      <span>{tag.name}</span>

      {isRemovable && (
        <button
          type="button"
          className={`ml-0.5 inline-flex items-center justify-center rounded-full hover:opacity-70 transition-opacity motion-reduce:transition-none ${focusRing.default} ${focusRing.brand}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove tag ${tag.name}`}
          style={{
            width: size === 'sm' ? '12px' : '14px',
            height: size === 'sm' ? '12px' : '14px',
          }}
        >
          <svg
            width={size === 'sm' ? '8' : '10'}
            height={size === 'sm' ? '8' : '10'}
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

/**
 * TagBadgeList component - displays a list of tags with overflow handling
 */
export type TagBadgeListProps = {
  tags: Tag[];
  maxVisible?: number;
  size?: 'sm' | 'md';
  onTagClick?: (tag: Tag) => void;
  onTagRemove?: (tag: Tag) => void;
  className?: string;
};

export function TagBadgeList({
  tags,
  maxVisible = 3,
  size = 'sm',
  onTagClick,
  onTagRemove,
  className = '',
}: TagBadgeListProps) {
  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = Math.max(0, tags.length - maxVisible);

  return (
    <div className={`flex flex-wrap items-center gap-inline-sm ${className}`}>
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size={size}
          onClick={onTagClick ? () => onTagClick(tag) : undefined}
          onRemove={onTagRemove ? () => onTagRemove(tag) : undefined}
        />
      ))}

      {remainingCount > 0 && (
        <span
          className="inline-flex items-center px-2 py-0.5 text-caption font-medium text-text-secondary bg-bg-tertiary rounded-full"
          aria-label={`${remainingCount} more tags`}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
}
