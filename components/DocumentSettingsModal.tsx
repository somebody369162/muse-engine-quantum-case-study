import React, { useState } from 'react';
import { Focus } from '../types';
import type { DocumentSettings } from '../types';
import { FOCUSES } from '../constants';
import { Icon } from './Icon';

interface DocumentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DocumentSettings;
  onSettingsChange: (settings: DocumentSettings) => void;
  chatFocuses: Focus[];
}

const Switch: React.FC<{ checked: boolean; onToggle: () => void; label: string, title?: string }> = ({ checked, onToggle, label, title }) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer" title={title}>
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
      <span className="text-sm text-[var(--text-primary)] select-none">{label}</span>
    </label>
  );
};

export const DocumentSettingsModal: React.FC<DocumentSettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange, chatFocuses }) => {
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

  if (!isOpen) return null;
  
  const handleSettingToggle = (key: keyof DocumentSettings) => {
    onSettingsChange({ ...settings, [key]: !settings[key] });
  };

  const handleFocusClick = (focusId: Focus) => {
    const newFocuses = settings.focuses.includes(focusId)
      ? settings.focuses.filter(f => f !== focusId)
      : [...settings.focuses, focusId];
    onSettingsChange({ ...settings, focuses: newFocuses });
  };
  
  const handleWritingStyleChange = (style: string) => {
    onSettingsChange({ ...settings, writingStyle: style });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[51] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-2xl w-full max-w-lg p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Icon name="cog" className="w-6 h-6" />
            Document Settings
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]" title="Close settings">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-6">
            <div>
                <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3 border-b border-[var(--border-primary)] pb-2">Predictive Text</h3>
                 <div className="space-y-4">
                    <Switch 
                        checked={settings.isPredictiveTextEnabled} 
                        onToggle={() => handleSettingToggle('isPredictiveTextEnabled')} 
                        label="Enable AI Predictions"
                        title="Enable or disable AI-powered text predictions"
                    />
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Writing Style</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={settings.writingStyle}
                                onChange={(e) => handleWritingStyleChange(e.target.value)}
                                placeholder="Auto-learn from conversation"
                                className="flex-1 w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2 text-sm text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none disabled:opacity-50"
                                disabled={!settings.isPredictiveTextEnabled}
                            />
                            <button
                                type="button"
                                onClick={() => handleWritingStyleChange('')}
                                className="px-3 py-2 text-xs font-medium rounded-md transition-colors bg-[var(--bg-tertiary)] hover:bg-opacity-80 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                                title="Reset to default auto-learning style"
                                disabled={!settings.isPredictiveTextEnabled}
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                 </div>
            </div>

            <div>
                <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3 border-b border-[var(--border-primary)] pb-2">Contextual Focus</h3>
                <div className="space-y-4">
                    <Switch 
                        checked={settings.useCustomFocuses} 
                        onToggle={() => handleSettingToggle('useCustomFocuses')} 
                        label="Use Custom Focuses for this Document"
                        title="Override the main chat interface's focuses with a custom set"
                    />
                    <div className={`transition-opacity duration-300 ${settings.useCustomFocuses ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                         <button
                            type="button"
                            onClick={() => setIsFocusPanelOpen(prev => !prev)}
                            className="px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            title="Select custom focuses for this document"
                            disabled={!settings.useCustomFocuses}
                        >
                            <Icon name="sparkles" className="w-4 h-4" />
                            {settings.focuses.length > 0 ? `${settings.focuses.length} Selected` : 'Select Focuses'}
                        </button>
                        {isFocusPanelOpen && (
                            <div className="p-3 mt-2 flex flex-wrap gap-2 border-t border-[var(--border-primary)] animate-fade-in-down bg-[var(--bg-secondary)] rounded-b-xl">
                                {FOCUSES.map(focus => (
                                    <button
                                        key={focus.id}
                                        type="button"
                                        onClick={() => handleFocusClick(focus.id)}
                                        className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                                            settings.focuses.includes(focus.id)
                                            ? 'bg-[var(--accent-primary)] text-white'
                                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                        title={focus.description}
                                    >
                                    {focus.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-8 flex justify-end">
            <button
                onClick={onClose}
                className="px-6 py-2 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors"
                title="Save changes and close"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};