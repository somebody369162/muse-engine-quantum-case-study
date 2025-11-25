




import React, { useState, useEffect } from 'react';
import { Mode, Focus } from '../types';
import type { Profile, IconName, InterfaceSettings } from '../types';
import { MODES, FOCUSES, PROFILE_ICONS } from '../constants';
import { Icon } from './Icon';

interface ProfileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Profile) => void;
  existingProfile?: Profile | null;
}

const Switch: React.FC<{ checked: boolean; onToggle: () => void; label: string }> = ({ checked, onToggle, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onToggle}
    className={`relative inline-flex items-center h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)] ${checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'}`}
  >
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

export const ProfileEditorModal: React.FC<ProfileEditorModalProps> = ({ isOpen, onClose, onSave, existingProfile }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('sparkles');
  const [defaultMode, setDefaultMode] = useState<Mode>(Mode.MUSE);
  const [defaultFocuses, setDefaultFocuses] = useState<Focus[]>([]);
  const [defaultIsWebSearchEnabled, setDefaultIsWebSearchEnabled] = useState(true);
  const [defaultIsPredictiveTextEnabled, setDefaultIsPredictiveTextEnabled] = useState(true);
  const [defaultWritingStyle, setDefaultWritingStyle] = useState('');
  const [defaultInterfaceSettings, setDefaultInterfaceSettings] = useState<Partial<InterfaceSettings>>({});

  useEffect(() => {
    if (isOpen) {
      if (existingProfile) {
        setName(existingProfile.name);
        setIcon(existingProfile.icon);
        setDefaultMode(existingProfile.defaultMode);
        setDefaultFocuses(existingProfile.defaultFocuses);
        setDefaultIsWebSearchEnabled(existingProfile.defaultIsWebSearchEnabled ?? true);
        setDefaultIsPredictiveTextEnabled(existingProfile.defaultIsPredictiveTextEnabled ?? true);
        setDefaultWritingStyle(existingProfile.defaultWritingStyle || '');
        setDefaultInterfaceSettings(existingProfile.defaultInterfaceSettings || {});
      } else {
        setName('');
        setIcon('sparkles');
        setDefaultMode(Mode.MUSE);
        setDefaultFocuses([]);
        setDefaultIsWebSearchEnabled(true);
        setDefaultIsPredictiveTextEnabled(true);
        setDefaultWritingStyle('');
        setDefaultInterfaceSettings({});
      }
    }
  }, [isOpen, existingProfile]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: existingProfile?.id || '', // ID is handled by App.tsx for new profiles
      name: name.trim(),
      icon,
      defaultMode,
      defaultFocuses,
      defaultIsWebSearchEnabled,
      defaultIsPredictiveTextEnabled,
      defaultWritingStyle,
      defaultInterfaceSettings,
    });
  };
  
  const handleInterfaceSettingChange = (key: keyof InterfaceSettings, value: any) => {
    setDefaultInterfaceSettings(prev => ({...prev, [key]: value}));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[51] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-auto max-h-[90vh]">
          <header className="flex-shrink-0 p-6 border-b border-[var(--border-primary)]">
            <h2 className="text-xl font-bold text-white">{existingProfile ? 'Edit Profile' : 'Create New Profile'}</h2>
          </header>
          
          <main className="flex-1 p-6 space-y-6 overflow-y-auto">
            <section>
                <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3 border-b border-[var(--border-primary)] pb-2">Core Settings</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="profile-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Profile Name</label>
                        <input
                            id="profile-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                            placeholder="e.g., Developer Workflow"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {PROFILE_ICONS.map(iconName => (
                            <button
                                key={iconName}
                                type="button"
                                onClick={() => setIcon(iconName)}
                                className={`p-2 rounded-lg border-2 transition-colors ${icon === iconName ? 'border-[var(--accent-primary)] bg-[var(--bg-tertiary)]' : 'border-transparent hover:bg-[var(--bg-tertiary)]'}`}
                            >
                                <Icon name={iconName} className="w-5 h-5 text-[var(--text-primary)]" />
                            </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            
            <section>
                <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3 border-b border-[var(--border-primary)] pb-2">AI Behavior Defaults</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Default Mode</label>
                        <div className="flex flex-wrap gap-2">
                            {MODES.map(mode => (
                            <button
                                key={mode.id}
                                type="button"
                                onClick={() => setDefaultMode(mode.id)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 ${
                                defaultMode === mode.id ? 'bg-[var(--accent-primary)] text-white shadow-md' : 'bg-[var(--bg-tertiary)] hover:bg-opacity-80 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                                title={mode.description}
                            >
                                <Icon name={mode.icon} className="w-4 h-4" />
                                {mode.name}
                            </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Default Focuses</label>
                        <div className="flex flex-wrap gap-2">
                            {FOCUSES.map(focus => (
                                <button
                                    key={focus.id}
                                    type="button"
                                    onClick={() => setDefaultFocuses(prev => prev.includes(focus.id) ? prev.filter(f => f !== focus.id) : [...prev, focus.id])}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                                        defaultFocuses.includes(focus.id) ? 'bg-slate-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                    title={focus.description}
                                >
                                {focus.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Web Search</label>
                            <Switch checked={defaultIsWebSearchEnabled} onToggle={() => setDefaultIsWebSearchEnabled(p => !p)} label="" />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Predictive Text</label>
                            <Switch checked={defaultIsPredictiveTextEnabled} onToggle={() => setDefaultIsPredictiveTextEnabled(p => !p)} label="" />
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="writing-style" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Writing Style</label>
                        <input
                            id="writing-style"
                            type="text"
                            value={defaultWritingStyle}
                            onChange={(e) => setDefaultWritingStyle(e.target.value)}
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                            placeholder="e.g., concise and professional"
                        />
                    </div>
                </div>
            </section>

             <section>
                <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3 border-b border-[var(--border-primary)] pb-2">Interface Defaults</h3>
                <div className="space-y-4 p-3 rounded-lg bg-[var(--bg-tertiary)]">
                    <div>
                        <label className="text-sm font-semibold text-[var(--text-primary)]">UI Density</label>
                        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg mt-1">
                            <button type="button" onClick={() => handleInterfaceSettingChange('density', 'comfortable')} className={`w-full px-2 py-1 text-sm font-semibold rounded-md transition-colors ${defaultInterfaceSettings.density === 'comfortable' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Comfortable</button>
                            <button type="button" onClick={() => handleInterfaceSettingChange('density', 'compact')} className={`w-full px-2 py-1 text-sm font-semibold rounded-md transition-colors ${defaultInterfaceSettings.density === 'compact' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Compact</button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-[var(--text-primary)]">Animations</label>
                        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg mt-1">
                            <button type="button" onClick={() => handleInterfaceSettingChange('animations', 'full')} className={`w-full px-2 py-1 text-sm font-semibold rounded-md transition-colors ${defaultInterfaceSettings.animations === 'full' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Full</button>
                            <button type="button" onClick={() => handleInterfaceSettingChange('animations', 'minimal')} className={`w-full px-2 py-1 text-sm font-semibold rounded-md transition-colors ${defaultInterfaceSettings.animations === 'minimal' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Minimal</button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-[var(--text-primary)]">Font Size</label>
                        <div className="grid grid-cols-3 items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg mt-1">
                            <button type="button" onClick={() => handleInterfaceSettingChange('fontSize', 'small')} className={`w-full px-2 py-1 text-sm font-semibold rounded-md transition-colors capitalize ${defaultInterfaceSettings.fontSize === 'small' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Small</button>
                            <button type="button" onClick={() => handleInterfaceSettingChange('fontSize', 'medium')} className={`w-full px-2 py-1 text-sm font-semibold rounded-md transition-colors capitalize ${defaultInterfaceSettings.fontSize === 'medium' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Medium</button>
                            <button type="button" onClick={() => handleInterfaceSettingChange('fontSize', 'large')} className={`w-full px-2 py-1 text-sm font-semibold rounded-md transition-colors capitalize ${defaultInterfaceSettings.fontSize === 'large' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Large</button>
                        </div>
                    </div>
                </div>
            </section>
          </main>

          <footer className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-[var(--border-primary)]">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-white font-semibold transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors">
              {existingProfile ? 'Save Changes' : 'Create Profile'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};