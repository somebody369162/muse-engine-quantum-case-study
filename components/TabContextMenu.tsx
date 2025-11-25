
import React, { useEffect, useRef } from 'react';

interface TabContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onCloseTab: () => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({ x, y, onClose, onRename, onDuplicate, onCloseTab }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const style = {
    top: `${y}px`,
    left: `${x}px`,
  };

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="absolute z-30 w-48 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-lg p-2 animate-fade-in-down"
    >
      <ul className="space-y-1">
        <li>
          <button
            onClick={() => handleAction(onRename)}
            className="w-full text-left px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors"
          >
            Rename Tab
          </button>
        </li>
        <li>
          <button
            onClick={() => handleAction(onDuplicate)}
            className="w-full text-left px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors"
          >
            Duplicate Tab
          </button>
        </li>
        <li>
          <button
            onClick={() => handleAction(onCloseTab)}
            className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/30 rounded-md transition-colors"
          >
            Close Tab
          </button>
        </li>
      </ul>
    </div>
  );
};
