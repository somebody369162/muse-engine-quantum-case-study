



import React, { useState } from 'react';
import { Icon } from './Icon';
import { ProjectSelector } from './ProjectSelector';
import { Mode, Focus, type Project, type Tab, type User, type Profile } from '../types';
import { TabsBar } from './TabsBar';
import { UserAuthentication } from './UserAuthentication';
import { MODES } from '../constants';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { FOCUSES } from '../constants';
import { ProfileSelector } from './ProfileSelector';


interface HeaderProps {
  onClear: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  projects: Project[];
  activeProject: Project;
  onSelectProject: (projectId: string) => void;
  onAddProject: () => void;
  onRenameProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onReorderProjects: (draggedId: string, targetId: string) => void;
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  onRenameTab: (tabId: string, newName: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onReorderTabs: (draggedId: string, targetId: string) => void;
  saveStatus: 'idle' | 'saving' | 'saved';
  onToggleMenu: () => void;
  currentUser: User | null;
  onSignInClick: () => void;
  onSignOut: () => void;
  selectedMode: Mode;
  onSelectMode: (mode: Mode) => void;
  selectedFocuses: Focus[];
  onSelectFocuses: (focuses: Focus[]) => void;
  isWebSearchEnabled: boolean;
  onWebSearchChange: (enabled: boolean) => void;
  onToggleMobileSidebar: () => void;
  profiles: Profile[];
  onSelectProfile: (profileId: string | null) => void;
  onOpenSettings: () => void;
}

const ModeSelector: React.FC<{selectedMode: Mode, onSelectMode: (mode: Mode) => void}> = ({ selectedMode, onSelectMode }) => (
     <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg" data-tour-id="modes">
        {MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            className={`w-full px-2 py-1.5 md:px-3 text-xs md:text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${
              selectedMode === mode.id
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title={mode.description}
          >
            <Icon name={mode.icon} className="w-4 h-4" />
            <span className="hidden sm:inline">{mode.name}</span>
          </button>
        ))}
    </div>
);

export const Header: React.FC<HeaderProps> = ({ 
  onClear, 
  searchTerm, 
  onSearchChange, 
  projects, 
  activeProject, 
  onSelectProject, 
  onAddProject, 
  onRenameProject, 
  onDeleteProject,
  onReorderProjects,
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onCloseTab,
  onRenameTab,
  onDuplicateTab,
  onReorderTabs,
  saveStatus,
  onToggleMenu,
  currentUser,
  onSignInClick,
  onSignOut,
  selectedMode,
  onSelectMode,
  selectedFocuses,
  onSelectFocuses,
  isWebSearchEnabled,
  onWebSearchChange,
  onToggleMobileSidebar,
  profiles,
  onSelectProfile,
  onOpenSettings,
}) => {
  const focusOptions = FOCUSES.map(f => ({ id: f.id, name: f.name }));
  const isWebSearchDisabled = [Mode.CHAT, Mode.THINKER].includes(selectedMode);
  const isWebSearchActive = isWebSearchEnabled || isWebSearchDisabled;
  
  return (
    <header className="sticky top-0 z-20 bg-[var(--bg-primary)]/80 backdrop-blur-md" data-tour-id="projects-and-tabs">
      <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 md:gap-x-4 header-padding border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-1 order-1 flex-shrink-0">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors md:hidden"
            title="Open History"
            aria-label="Open conversation history sidebar"
          >
            <Icon name="menu" className="w-5 h-5" />
          </button>
          <ProjectSelector
            projects={projects}
            activeProject={activeProject}
            onSelectProject={onSelectProject}
            onAddProject={onAddProject}
            onRenameProject={onRenameProject}
            onDeleteProject={onDeleteProject}
            onReorderProjects={onReorderProjects}
          />
          {currentUser && (
            <ProfileSelector 
              profiles={profiles}
              activeProfileId={activeProject.activeProfileId}
              onSelectProfile={onSelectProfile}
              onManageProfiles={onOpenSettings}
            />
          )}
        </div>
        
        <div className="flex items-center gap-1 md:gap-2 order-2 md:order-3 flex-shrink-0">
          <div className="hidden md:flex items-center justify-end w-[100px] text-sm text-[var(--text-secondary)] transition-opacity duration-300">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-2 animate-fade-in">
                <Icon name="sync" className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-2 animate-fade-in">
                <Icon name="check" className="w-4 h-4 text-green-400" />
                <span>Saved</span>
              </div>
            )}
          </div>
          <UserAuthentication user={currentUser} onSignInClick={onSignInClick} onSignOut={onSignOut} />
          <button
            id="menu-button"
            onClick={onToggleMenu}
            className="p-2.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            title="Open Menu"
            aria-label="Open main menu"
          >
            <Icon name="menu" className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full flex-grow-0 order-3 md:order-2 min-w-0">
          <TabsBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={onSelectTab}
            onAddTab={onAddTab}
            onCloseTab={onCloseTab}
            onRenameTab={onRenameTab}
            onDuplicateTab={onDuplicateTab}
            onReorderTabs={onReorderTabs}
          />
        </div>

        <div className="w-full flex items-center justify-between gap-4 order-4 md:hidden header-padding border-t border-[var(--border-primary)]">
            <ModeSelector selectedMode={selectedMode} onSelectMode={onSelectMode} />
        </div>
      </div>
      
      {/* Desktop Controls */}
      <div className="hidden md:flex items-center justify-between gap-4 header-padding border-b border-[var(--border-primary)] tabs-controls-padding">
        <ModeSelector selectedMode={selectedMode} onSelectMode={onSelectMode} />
        
        <div className="flex items-center gap-2">
            <MultiSelectDropdown 
              options={focusOptions}
              selectedIds={selectedFocuses}
              onSelectionChange={onSelectFocuses}
              label="Focus"
              icon="sparkles"
            />

            <button
                type="button"
                onClick={() => onWebSearchChange(!isWebSearchActive)}
                disabled={isWebSearchDisabled}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 ${
                isWebSearchActive
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'bg-[var(--bg-tertiary)] hover:bg-opacity-80 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                } ${isWebSearchDisabled ? 'opacity-60 cursor-not-allowed' : 'transform hover:scale-105 active:scale-95'}`}
                title={isWebSearchActive ? "Web search is active" : "Enable web search"}
            >
                <Icon name="search" className="w-4 h-4" />
                Web Search
            </button>
        </div>
      </div>
    </header>
  );
};
