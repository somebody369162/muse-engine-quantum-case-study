import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export const Menu: React.FC<MenuProps> = ({ isOpen, onClose, onOpenSettings, onOpenHelp }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && !document.getElementById('menu-button')?.contains(target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40"
      aria-hidden="true" 
    >
      <div
        ref={menuRef}
        className="absolute top-[70px] right-3 w-64 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-2xl z-50 animate-fade-in-down"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="menu-button"
      >
        <div className="p-2" role="none">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">The Muse Engine</p>
            <p className="text-xs text-[var(--text-secondary)]">v1.0.0</p>
          </div>
          <div className="h-px bg-[var(--border-primary)] my-1" role="separator"></div>
          <ul className="space-y-1" role="none">
            <li>
              <button
                onClick={onOpenSettings}
                className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors flex items-center gap-3"
                role="menuitem"
                title="Open application settings"
              >
                <Icon name="cog" className="w-4 h-4 text-[var(--text-secondary)]" />
                <span>Settings</span>
              </button>
            </li>
            <li>
              <button
                onClick={onOpenHelp}
                className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors flex items-center gap-3"
                role="menuitem"
                title="View help and documentation"
              >
                <Icon name="question-mark-circle" className="w-4 h-4 text-[var(--text-secondary)]" />
                <span>Help & Documentation</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};