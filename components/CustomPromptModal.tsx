
import React, { useState, useEffect } from 'react';

interface CustomPromptModalProps {
  isOpen: boolean;
  title: string;
  label: string;
  initialValue: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export const CustomPromptModal: React.FC<CustomPromptModalProps> = ({ isOpen, title, label, initialValue, onConfirm, onCancel }) => {
  const [inputValue, setInputValue] = useState(initialValue);

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onConfirm(inputValue.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onCancel}>
      <div 
        className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
          <label htmlFor="prompt-input" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</label>
          <input
            id="prompt-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onCancel();
              }
            }}
          />
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-white font-semibold transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors">
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
