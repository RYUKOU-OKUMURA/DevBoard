/**
 * SplitPanel - VSCode-style resizable split panel component
 * Provides a vertical split with draggable divider
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface SplitPanelProps {
  /** Top panel content */
  topPanel: React.ReactNode;
  /** Bottom panel content */
  bottomPanel: React.ReactNode;
  /** Initial height of bottom panel in pixels */
  initialBottomHeight?: number;
  /** Minimum height of bottom panel */
  minBottomHeight?: number;
  /** Maximum height of bottom panel (as percentage of container) */
  maxBottomHeightPercent?: number;
  /** Whether bottom panel is collapsed */
  isBottomCollapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
  /** Callback when height changes */
  onHeightChange?: (height: number) => void;
  /** Class name for the container */
  className?: string;
}

export const SplitPanel: React.FC<SplitPanelProps> = ({
  topPanel,
  bottomPanel,
  initialBottomHeight = 300,
  minBottomHeight = 150,
  maxBottomHeightPercent = 70,
  isBottomCollapsed = false,
  onCollapseChange,
  onHeightChange,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bottomHeight, setBottomHeight] = useState(initialBottomHeight);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isBottomCollapsed);

  // Sync external collapse state
  useEffect(() => {
    setIsCollapsed(isBottomCollapsed);
  }, [isBottomCollapsed]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Handle drag move
  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRect.height;
      const maxHeight = containerHeight * (maxBottomHeightPercent / 100);

      // Calculate new height from bottom
      const newHeight = containerRect.bottom - clientY;
      const clampedHeight = Math.max(minBottomHeight, Math.min(maxHeight, newHeight));

      setBottomHeight(clampedHeight);
      onHeightChange?.(clampedHeight);
    },
    [isDragging, minBottomHeight, maxBottomHeightPercent, onHeightChange]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Touch event handlers
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragMove(e.touches[0].clientY);
      }
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Toggle collapse
  const toggleCollapse = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  }, [isCollapsed, onCollapseChange]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full overflow-hidden ${className}`}
    >
      {/* Top Panel */}
      <div
        className="flex-1 min-h-0 overflow-hidden transition-all duration-200"
        style={{
          height: isCollapsed ? '100%' : `calc(100% - ${bottomHeight}px)`,
        }}
      >
        {topPanel}
      </div>

      {/* Divider */}
      <div
        className={`
          relative flex-shrink-0
          ${isCollapsed ? 'h-8' : 'h-2'}
          bg-[var(--bg-tertiary)]
          border-t border-b border-[var(--border-subtle)]
          transition-all duration-200
          ${isDragging ? 'bg-[var(--accent-blue-muted)]' : 'hover:bg-[var(--bg-hover)]'}
        `}
      >
        {/* Drag handle */}
        {!isCollapsed && (
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className={`
              absolute inset-x-0 -top-1 -bottom-1
              cursor-ns-resize
              flex items-center justify-center
              group
            `}
          >
            {/* Grip indicator */}
            <div className="flex gap-0.5">
              <div className="w-8 h-1 rounded-full bg-[var(--border-strong)] group-hover:bg-[var(--accent-blue)] transition-colors" />
            </div>
          </div>
        )}

        {/* Collapse/Expand button */}
        <button
          onClick={toggleCollapse}
          className={`
            absolute right-4 top-1/2 -translate-y-1/2
            flex items-center gap-2 px-3 py-1
            text-caption font-medium
            text-[var(--text-muted)] hover:text-[var(--text-primary)]
            bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]
            border border-[var(--border-subtle)]
            rounded-md
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:ring-opacity-50
          `}
          aria-label={isCollapsed ? 'ワークスペースを展開' : 'ワークスペースを折りたたむ'}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="hidden sm:inline">
            {isCollapsed ? 'ワークスペース' : '折りたたむ'}
          </span>
        </button>

        {/* Panel info when collapsed */}
        {isCollapsed && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-caption text-[var(--text-muted)]">
            ワークスペースを表示するにはクリック
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div
        className={`
          flex-shrink-0 overflow-hidden
          transition-all duration-200 ease-out
          ${isDragging ? '' : 'transition-height'}
        `}
        style={{
          height: isCollapsed ? 0 : bottomHeight,
          opacity: isCollapsed ? 0 : 1,
        }}
      >
        {bottomPanel}
      </div>
    </div>
  );
};

export default SplitPanel;

