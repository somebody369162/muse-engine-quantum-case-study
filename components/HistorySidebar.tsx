

import React, { useCallback, useEffect, useRef } from 'react';
import type { Result } from '../types';
import { Icon } from './Icon';

interface HistorySidebarProps {
  results: Result[];
  onItemClick: (resultId: string) => void;
  onClear: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  onResize: (newWidth: number) => void;
  isMobile?: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  results,
  onItemClick,
  onClear,
  isCollapsed,
  onToggleCollapse,
  width,
  onResize,
  isMobile = false,
}) => {
  const isResizing = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 500) { // Min and max width constraints
        onResize(newWidth);
      }
    }
  }, [onResize]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (isCollapsed && !isMobile) {
    return (
      <div className="flex-shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] p-2 h-full">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="Expand History"
        >
          <Icon name="chevron-right" className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0" style={{ width: `${width}px` }}>
        <aside className="w-full h-full bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex flex-col">
            <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-[var(--border-primary)]">
                <h2 className="text-md font-semibold text-[var(--text-primary)]">History</h2>
                <div className="flex items-center">
                <button
                    onClick={onClear}
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Clear History"
                >
                    <Icon name="trash" className="w-4 h-4" />
                </button>
                <button
                    onClick={onToggleCollapse}
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    title={isMobile ? 'Close History' : 'Collapse History'}
                >
                    <Icon name={isMobile ? 'close' : 'chevron-left'} className="w-5 h-5" />
                </button>
                </div>
            </header>

            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                {results.length === 0 ? (
                <div className="text-center text-xs text-[var(--text-secondary)] p-4 h-full flex items-center justify-center">
                    <p>Your conversation history will appear here.</p>
                </div>
                ) : (
                [...results].map((result) => (
                    <button
                    key={result.id}
                    onClick={() => onItemClick(result.id)}
                    className="w-full text-left p-2 rounded-md hover:bg-[var(--bg-tertiary)] focus:outline-none focus:bg-[var(--bg-tertiary)] focus:ring-2 focus:ring-[var(--accent-primary)] transition-colors"
                    >
                    <p className="text-sm text-[var(--text-primary)] truncate" title={result.prompt}>
                        {result.prompt}
                    </p>
                    </button>
                ))
                )}
            </nav>
        </aside>
        {!isMobile && (
          <div
              onMouseDown={handleMouseDown}
              className="absolute top-0 -right-1 w-2 h-full cursor-col-resize group z-10"
          >
              <div className="w-0.5 h-full bg-transparent group-hover:bg-[var(--accent-primary)] transition-colors duration-200 mx-auto" />
          </div>
        )}
    </div>
  );
};