

import React, { useState, useRef, useEffect } from 'react';
import type { Profile } from '../types';
import { Icon } from './Icon';

interface ProfileSelectorProps {
  profiles: Profile[];
  activeProfileId?: string | null;
  onSelectProfile: (profileId: string | null) => void;
  onManageProfiles: () => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ profiles, activeProfileId, onSelectProfile, onManageProfiles }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const handleSelect = (profileId: string | null) => {
    onSelectProfile(profileId);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
        title="Select a Profile"
      >
        <Icon name={activeProfile?.icon || 'sparkles'} className="w-5 h-5 text-[var(--accent-primary)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)] hidden md:block">
          {activeProfile?.name || 'No Profile'}
        </span>
        <Icon name="chevron-down" className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-lg z-10 animate-fade-in-down overflow-hidden">
          <ul className="py-2 max-h-60 overflow-y-auto">
            <li>
                <button
                    onClick={() => handleSelect(null)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 rounded-md my-0.5 ${
                    !activeProfileId ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                >
                    <Icon name="close" className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span>None</span>
                </button>
            </li>
            <div className="h-px bg-[var(--border-primary)] my-1" role="separator"></div>
            {profiles.map(profile => (
              <li key={profile.id}>
                 <button
                  onClick={() => handleSelect(profile.id)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 rounded-md my-0.5 ${
                    profile.id === activeProfileId ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                  title={`Switch to "${profile.name}" profile`}
                >
                  <Icon name={profile.icon} className="w-4 h-4" />
                  <span className="truncate flex-grow">{profile.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--border-primary)]">
             <button
                onClick={() => { onManageProfiles(); setIsOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-3"
                title="Create or edit profiles"
              >
                <Icon name="cog" className="w-4 h-4 text-[var(--text-secondary)]" />
                Manage Profiles
              </button>
          </div>
        </div>
      )}
    </div>
  );
};