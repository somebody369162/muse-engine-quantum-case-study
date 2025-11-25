import React from 'react';
import { Icon } from './Icon';

interface SignUpSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
}

export const SignUpSuggestionModal: React.FC<SignUpSuggestionModalProps> = ({ isOpen, onClose, onCreateAccount }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-2xl w-full max-w-md p-8 text-center"
        onClick={e => e.stopPropagation()}
      >
        <Icon name="gemini" className="w-12 h-12 text-[var(--accent-primary)] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-3">Save Your Progress</h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Enjoying The Muse Engine? Create a free account to save your projects and access them from anywhere.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button onClick={onClose} className="px-6 py-3 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-white font-semibold transition-colors">
            Continue as Guest
          </button>
          <button onClick={onCreateAccount} className="px-6 py-3 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors">
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};
