


import React, { useState, useRef, useEffect } from 'react';
import type { Tab } from '../types';
import { Icon } from './Icon';
import { TabContextMenu } from './TabContextMenu';

interface TabsBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  onRenameTab: (tabId: string, newName: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onReorderTabs: (draggedId: string, targetId: string) => void;
}

export const TabsBar: React.FC<TabsBarProps> = ({ 
  tabs, 
  activeTabId, 
  onSelectTab, 
  onAddTab, 
  onCloseTab, 
  onRenameTab,
  onDuplicateTab,
  onReorderTabs 
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTabId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingTabId]);

  const handleStartEditing = (tab: Tab) => {
    setContextMenu(null);
    setEditingTabId(tab.id);
    setEditingTabName(tab.name);
  };

  const handleFinishEditing = () => {
    if (editingTabId && editingTabName.trim()) {
      onRenameTab(editingTabId, editingTabName);
    }
    setEditingTabId(null);
    setEditingTabName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditingTabName('');
    }
  };

  const handleCloseClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation(); 
    onCloseTab(tabId);
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, tabId: string) => {
    e.dataTransfer.setData('text/plain', tabId);
    e.currentTarget.style.opacity = '0.5';
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
      e.currentTarget.style.opacity = '1';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetTabId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    onReorderTabs(draggedId, targetTabId);
    e.currentTarget.style.borderLeft = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.borderLeft = '2px solid var(--accent-primary)';
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.currentTarget.style.borderLeft = '';
  };


  return (
    <div className="border-b border-[var(--border-primary)] flex items-center">
      <div className="flex items-center gap-2 px-4">
        {tabs.map(tab => (
          <div
            key={tab.id}
            draggable={!editingTabId}
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, tab.id)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDoubleClick={() => handleStartEditing(tab)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            onClick={() => !editingTabId && onSelectTab(tab.id)}
            className={`relative flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-medium transition-all duration-150 cursor-pointer group ${
              tab.id === activeTabId
                ? 'border-[var(--accent-primary)] text-white bg-[var(--bg-secondary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
            title={tab.name}
          >
            {editingTabId === tab.id ? (
              <input
                ref={renameInputRef}
                type="text"
                value={editingTabName}
                onChange={(e) => setEditingTabName(e.target.value)}
                onBlur={handleFinishEditing}
                onKeyDown={handleKeyDown}
                className="bg-transparent border-0 outline-none ring-1 ring-[var(--accent-primary)] rounded p-0 m-0 w-full text-white"
                style={{ minWidth: '100px' }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{tab.name}</span>
            )}
            
            {tabs.length > 1 && editingTabId !== tab.id && (
              <button
                onClick={(e) => handleCloseClick(e, tab.id)}
                className={`p-0.5 rounded-full ${ tab.id === activeTabId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' } hover:bg-white/20`}
                aria-label={`Close ${tab.name}`}
                title={`Close ${tab.name}`}
              >
                <Icon name="close" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={onAddTab}
        className="ml-2 p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        title="New Tab"
        aria-label="Create a new tab"
      >
        <Icon name="plus" className="w-4 h-4" />
      </button>

      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            const tab = tabs.find(t => t.id === contextMenu.tabId);
            if (tab) handleStartEditing(tab);
          }}
          onDuplicate={() => onDuplicateTab(contextMenu.tabId)}
          onCloseTab={() => onCloseTab(contextMenu.tabId)}
        />
      )}
    </div>
  );
};