
import React, { useRef, useState } from 'react';
import { Icon } from './Icon';
import type { StoragePreference, Appearance, User, InterfaceSettings, Profile, DocumentTemplate } from '../types';
import { ProfileEditorModal } from './ProfileEditorModal';
import { TemplateEditorModal } from './TemplateEditorModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  currentAppearance: Appearance;
  onAppearanceChange: (appearance: Appearance) => void;
  storagePreference: StoragePreference;
  onStoragePreferenceChange: (preference: StoragePreference) => void;
  interfaceSettings: InterfaceSettings;
  onInterfaceSettingsChange: (settings: InterfaceSettings) => void;
  onExportData: () => void;
  onImportData: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAllData: () => void;
  currentUser: User | null;
  profiles: Profile[];
  onAddProfile: (profile: Profile) => void;
  onUpdateProfile: (profile: Profile) => void;
  onDeleteProfile: (profileId: string) => void;
  onCloneProfile: (profileId: string) => void;
  documentTemplates: DocumentTemplate[];
  onAddTemplate: (template: DocumentTemplate) => void;
  onUpdateTemplate: (template: DocumentTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

type SettingsTab = 'Appearance' | 'Interface' | 'Data' | 'Profiles' | 'Templates';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
  currentAppearance,
  onAppearanceChange,
  storagePreference,
  onStoragePreferenceChange,
  interfaceSettings,
  onInterfaceSettingsChange,
  onExportData,
  onImportData,
  onClearAllData,
  currentUser,
  profiles,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  onCloneProfile,
  documentTemplates,
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('Appearance');
  const [profileToEdit, setProfileToEdit] = useState<Profile | null>(null);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<DocumentTemplate | null>(null);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  if (!isOpen) return null;
  
  const openProfileEditor = (profile?: Profile) => {
    setProfileToEdit(profile || null);
    setIsProfileEditorOpen(true);
  };
  
  const handleSaveProfile = (profile: Profile) => {
    if (profileToEdit) {
      onUpdateProfile(profile);
    } else {
      onAddProfile({ ...profile, id: `profile_${Date.now()}`});
    }
    setIsProfileEditorOpen(false);
  };
  
  const openTemplateEditor = (template?: DocumentTemplate) => {
    setTemplateToEdit(template || null);
    setIsTemplateEditorOpen(true);
  };
  
  const handleSaveTemplate = (template: DocumentTemplate) => {
    if (templateToEdit) {
      onUpdateTemplate(template);
    } else {
      onAddTemplate({ ...template, id: `template_${Date.now()}`});
    }
    setIsTemplateEditorOpen(false);
  };

  const tabs: SettingsTab[] = currentUser ? ['Appearance', 'Interface', 'Profiles', 'Templates', 'Data'] : ['Appearance', 'Interface', 'Templates', 'Data'];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div
          className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-2xl w-full max-w-3xl flex flex-col"
          onClick={e => e.stopPropagation()}
          style={{ height: 'calc(100vh - 4rem)' }}
        >
          <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-[var(--border-primary)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
              <Icon name="cog" className="w-6 h-6" />
              Settings
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]" title="Close settings">
              <Icon name="close" className="w-5 h-5" />
            </button>
          </header>
          
          <div className="flex-1 flex overflow-hidden">
            <nav className="w-48 border-r border-[var(--border-primary)] p-2">
              <ul className="space-y-1">
                {tabs.map(tab => (
                  <li key={tab}>
                    <button
                      onClick={() => setActiveTab(tab)}
                      className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {tab}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <main className="flex-1 overflow-y-auto p-6">
              {activeTab === 'Appearance' && <AppearanceSettings currentTheme={currentTheme} onThemeChange={onThemeChange} currentAppearance={currentAppearance} onAppearanceChange={onAppearanceChange} />}
              {activeTab === 'Interface' && <InterfaceSettingsComponent settings={interfaceSettings} onSettingsChange={onInterfaceSettingsChange} />}
              {activeTab === 'Profiles' && currentUser && <ProfilesSettings profiles={profiles} onEdit={openProfileEditor} onDelete={onDeleteProfile} onAdd={() => openProfileEditor()} onClone={onCloneProfile} />}
              {activeTab === 'Templates' && <TemplatesSettings templates={documentTemplates} onEdit={openTemplateEditor} onDelete={onDeleteTemplate} onAdd={() => openTemplateEditor()} />}
              {activeTab === 'Data' && <DataSettings onExportData={onExportData} onImportData={onImportData} onClearAllData={onClearAllData} fileInputRef={fileInputRef} currentUser={currentUser} storagePreference={storagePreference} onStoragePreferenceChange={onStoragePreferenceChange} />}
            </main>
          </div>
        </div>
      </div>
      {currentUser && (
        <ProfileEditorModal
          isOpen={isProfileEditorOpen}
          onClose={() => setIsProfileEditorOpen(false)}
          onSave={handleSaveProfile}
          existingProfile={profileToEdit}
        />
      )}
       <TemplateEditorModal
        isOpen={isTemplateEditorOpen}
        onClose={() => setIsTemplateEditorOpen(false)}
        onSave={handleSaveTemplate}
        existingTemplate={templateToEdit}
      />
    </>
  );
};

// --- Sub-components for each tab ---

const appearanceDescriptions: Record<Appearance, string> = {
  vanta: "A modern, GitHub-inspired dark theme with purple accents.",
  legacy: "A retro, terminal-style look with a monospace font and sharp corners.",
  serene: "A calm, clean design with soft colors and fully-rounded elements.",
  arcade: "A retro, 80s-inspired theme with neon text and a grid background.",
  solar: "A warm, energetic theme inspired by solar flares and deep space.",
  oceanic: "A calming, deep-sea theme with animated caustic light effects.",
  celestial: "A deep-space theme with animated nebula effects and glowing UI.",
};
const ALL_APPEARANCES: Appearance[] = ['vanta', 'legacy', 'serene', 'celestial', 'arcade', 'solar', 'oceanic'];

const AppearanceSettings: React.FC<{currentTheme: 'light' | 'dark', onThemeChange: Function, currentAppearance: Appearance, onAppearanceChange: Function}> = ({currentTheme, onThemeChange, currentAppearance, onAppearanceChange}) => (
  <div className="space-y-6">
    <div>
      <label className="text-sm font-semibold text-[var(--text-primary)]">Theme</label>
      <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1 rounded-lg mt-2">
        <button onClick={() => onThemeChange('light')} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${currentTheme === 'light' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Switch to Light theme">Light</button>
        <button onClick={() => onThemeChange('dark')} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${currentTheme === 'dark' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Switch to Dark theme">Dark</button>
      </div>
    </div>
    <div>
      <label className="text-sm font-semibold text-[var(--text-primary)]">Style</label>
      <p className="text-xs text-[var(--text-secondary)] mb-2">Change the overall look and feel of the application.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ALL_APPEARANCES.map((app) => (
          <button key={app} onClick={() => onAppearanceChange(app)} className={`text-left p-3 rounded-lg border-2 transition-colors ${currentAppearance === app ? 'border-[var(--accent-primary)] bg-[var(--bg-tertiary)]' : 'border-transparent bg-[var(--bg-tertiary)] hover:border-[var(--border-primary)]'}`} title={appearanceDescriptions[app]}>
            <span className="font-semibold text-sm capitalize text-[var(--text-primary)]">{app}</span>
            <p className="text-xs text-[var(--text-secondary)]">{appearanceDescriptions[app]}</p>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const InterfaceSettingsComponent: React.FC<{settings: InterfaceSettings, onSettingsChange: (settings: InterfaceSettings) => void}> = ({settings, onSettingsChange}) => (
    <div className="space-y-6">
        <div>
            <label className="text-sm font-semibold text-[var(--text-primary)]">UI Density</label>
            <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1 rounded-lg mt-2">
                <button onClick={() => onSettingsChange({...settings, density: 'comfortable'})} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${settings.density === 'comfortable' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Spacious layout with more padding.">Comfortable</button>
                <button onClick={() => onSettingsChange({...settings, density: 'compact'})} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${settings.density === 'compact' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Reduced padding to show more information.">Compact</button>
            </div>
        </div>
        <div>
            <label className="text-sm font-semibold text-[var(--text-primary)]">Animations</label>
            <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1 rounded-lg mt-2">
                <button onClick={() => onSettingsChange({...settings, animations: 'full'})} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${settings.animations === 'full' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Enable all user interface animations.">Full</button>
                <button onClick={() => onSettingsChange({...settings, animations: 'minimal'})} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${settings.animations === 'minimal' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Disable decorative animations for a faster feel.">Minimal</button>
            </div>
        </div>
        <div>
            <label className="text-sm font-semibold text-[var(--text-primary)]">Font Size</label>
            <div className="grid grid-cols-3 items-center gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg mt-2">
                <button onClick={() => onSettingsChange({...settings, fontSize: 'small'})} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors capitalize ${settings.fontSize === 'small' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Small</button>
                <button onClick={() => onSettingsChange({...settings, fontSize: 'medium'})} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors capitalize ${settings.fontSize === 'medium' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Medium</button>
                <button onClick={() => onSettingsChange({...settings, fontSize: 'large'})} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors capitalize ${settings.fontSize === 'large' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Large</button>
            </div>
        </div>
        <div>
            <label className="text-sm font-semibold text-[var(--text-primary)]">Sound Effects</label>
            <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1 rounded-lg mt-2">
                <button onClick={() => onSettingsChange({...settings, soundEffects: true})} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${settings.soundEffects ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Enable UI sound effects.">On</button>
                <button onClick={() => onSettingsChange({...settings, soundEffects: false})} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${!settings.soundEffects ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Disable UI sound effects.">Off</button>
            </div>
        </div>
        <div className="border-t border-[var(--border-primary)] pt-4">
            <label className="text-sm font-semibold text-[var(--text-primary)] flex items-center justify-between">
                <span>Advanced: Experimental Modes</span>
                <button 
                    role="switch"
                    aria-checked={settings.showExperimentalModes}
                    onClick={() => onSettingsChange({...settings, showExperimentalModes: !settings.showExperimentalModes})}
                    className={`relative inline-flex items-center h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] ${settings.showExperimentalModes ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'}`}
                >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.showExperimentalModes ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            </label>
            <p className="text-xs text-[var(--text-secondary)] mt-2">
                Unlock access to "The Nexus" mode. Warning: These features are highly experimental and may use significant API tokens.
            </p>
        </div>
    </div>
);

const ProfilesSettings: React.FC<{profiles: Profile[], onEdit: (p: Profile) => void, onDelete: (id: string) => void, onAdd: () => void, onClone: (id: string) => void}> = ({profiles, onEdit, onDelete, onAdd, onClone}) => (
    <div>
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Session Profiles</h3>
                <p className="text-sm text-[var(--text-secondary)]">Create and manage preset configurations for your sessions.</p>
            </div>
            <button onClick={onAdd} className="px-3 py-1.5 text-sm font-semibold rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white transition-colors flex items-center gap-2">
                <Icon name="plus" className="w-4 h-4" />
                New Profile
            </button>
        </div>
        <div className="space-y-2">
            {profiles.map(profile => (
                <div key={profile.id} className="group flex items-center justify-between gap-2 bg-[var(--bg-tertiary)] p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Icon name={profile.icon} className="w-5 h-5 text-[var(--accent-primary)]" />
                        <div>
                            <p className="font-semibold text-[var(--text-primary)]">{profile.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">Mode: {profile.defaultMode}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onClone(profile.id)} className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]" title="Clone profile"><Icon name="copy" className="w-4 h-4" /></button>
                        <button onClick={() => onEdit(profile)} className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]" title="Edit profile"><Icon name="edit" className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(profile.id)} className="p-2 rounded-full hover:bg-red-900/50 text-red-400" title="Delete profile"><Icon name="trash" className="w-4 h-4" /></button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const TemplatesSettings: React.FC<{templates: DocumentTemplate[], onEdit: (t: DocumentTemplate) => void, onDelete: (id: string) => void, onAdd: () => void}> = ({templates, onEdit, onDelete, onAdd}) => (
    <div>
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Document Templates</h3>
                <p className="text-sm text-[var(--text-secondary)]">Create and manage reusable document starters.</p>
            </div>
            <button onClick={onAdd} className="px-3 py-1.5 text-sm font-semibold rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white transition-colors flex items-center gap-2">
                <Icon name="plus" className="w-4 h-4" />
                New Template
            </button>
        </div>
        <div className="space-y-2">
            {templates.map(template => (
                <div key={template.id} className="group flex items-center justify-between gap-2 bg-[var(--bg-tertiary)] p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Icon name={template.icon} className="w-5 h-5 text-[var(--accent-primary)]" />
                        <div>
                            <p className="font-semibold text-[var(--text-primary)]">{template.name}</p>
                            <p className="text-xs text-[var(--text-secondary)] truncate max-w-xs">{template.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(template)} className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]" title="Edit template"><Icon name="edit" className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(template.id)} className="p-2 rounded-full hover:bg-red-900/50 text-red-400" title="Delete template"><Icon name="trash" className="w-4 h-4" /></button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const DataSettings: React.FC<{
    onExportData: () => void;
    onImportData: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClearAllData: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    currentUser: User | null;
    storagePreference: StoragePreference;
    onStoragePreferenceChange: (preference: StoragePreference) => void;
}> = ({ onExportData, onImportData, onClearAllData, fileInputRef, currentUser, storagePreference, onStoragePreferenceChange }) => (
    <div className="space-y-6">
        {currentUser && (
        <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Data Storage</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-2">Choose where to save your projects. Cloud storage allows access across devices.</p>
            <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1 rounded-lg">
                <button onClick={() => onStoragePreferenceChange('local')} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${storagePreference === 'local' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Save data only on this device.">Local</button>
                <button onClick={() => onStoragePreferenceChange('cloud')} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${storagePreference === 'cloud' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Save data to your account in the cloud.">Cloud</button>
                <button onClick={() => onStoragePreferenceChange('both')} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${storagePreference === 'both' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Save to both local and cloud for backup.">Both</button>
            </div>
        </div>
        )}
        <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Data Management</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-2">Export your data for backup, or import a previous backup.</p>
            <div className="flex flex-col sm:flex-row gap-3">
                <input type="file" ref={fileInputRef} onChange={onImportData} accept=".json" className="hidden" />
                <button onClick={onExportData} className="flex-1 px-4 py-2 text-sm font-semibold rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-white transition-colors flex items-center justify-center gap-2">
                    <Icon name="arrow-down-on-square" className="w-5 h-5" />
                    Export All Data
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 px-4 py-2 text-sm font-semibold rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-white transition-colors flex items-center justify-center gap-2">
                    <Icon name="arrow-up-on-square" className="w-5 h-5" />
                    Import from Backup
                </button>
            </div>
        </div>
        <div className="border-t border-red-500/30 pt-4">
            <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-2">This action is irreversible. Please be certain.</p>
            <button
                onClick={onClearAllData}
                className="w-full px-4 py-2 text-sm font-semibold rounded-md bg-red-600/20 hover:bg-red-600/40 border border-red-600/50 text-red-300 transition-colors"
            >
                Clear All Local Data
            </button>
        </div>
    </div>
);
