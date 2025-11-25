import React, { useState, useEffect } from 'react';
import type { DocumentTemplate, IconName } from '../types';
import { TEMPLATE_ICONS } from '../constants';
import { Icon } from './Icon';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: DocumentTemplate) => void;
  existingTemplate?: DocumentTemplate | null;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ isOpen, onClose, onSave, existingTemplate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [icon, setIcon] = useState<IconName>('document-text');

  useEffect(() => {
    if (isOpen) {
      if (existingTemplate) {
        setName(existingTemplate.name);
        setDescription(existingTemplate.description);
        setContent(existingTemplate.content);
        setIcon(existingTemplate.icon);
      } else {
        setName('');
        setDescription('');
        setContent('');
        setIcon('document-text');
      }
    }
  }, [isOpen, existingTemplate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    onSave({
      id: existingTemplate?.id || '', // ID is handled by App.tsx for new templates
      name: name.trim(),
      description: description.trim(),
      content,
      icon,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[52] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-2xl w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-auto max-h-[90vh]">
          <header className="flex-shrink-0 p-6 border-b border-[var(--border-primary)]">
            <h2 className="text-xl font-bold text-white">{existingTemplate ? 'Edit Template' : 'Create New Template'}</h2>
          </header>
          
          <main className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div>
              <label htmlFor="template-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Template Name</label>
              <input
                id="template-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                placeholder="e.g., Weekly Report"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="template-description" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
              <input
                id="template-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                placeholder="A short description of the template's purpose"
              />
            </div>
            
             <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Icon</label>
                <div className="flex flex-wrap gap-2 p-2 bg-[var(--bg-tertiary)] rounded-lg">
                    {TEMPLATE_ICONS.map(iconName => (
                    <button
                        key={iconName}
                        type="button"
                        onClick={() => setIcon(iconName)}
                        className={`p-2 rounded-lg border-2 transition-colors ${icon === iconName ? 'border-[var(--accent-primary)] bg-[var(--bg-secondary)]' : 'border-transparent hover:bg-[var(--bg-secondary)]'}`}
                    >
                        <Icon name={iconName} className="w-5 h-5 text-[var(--text-primary)]" />
                    </button>
                    ))}
                </div>
            </div>

            <div>
              <label htmlFor="template-content" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Content (Markdown supported)</label>
              <textarea
                id="template-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-48 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none resize-y font-mono text-sm"
                placeholder="# Your Template Header..."
                required
              />
            </div>
          </main>

          <footer className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-[var(--border-primary)]">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-white font-semibold transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors">
              {existingTemplate ? 'Save Changes' : 'Create Template'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};