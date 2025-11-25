
import React from 'react';

interface FooterProps {
  onNavigate: (page: 'privacy' | 'terms') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="flex-shrink-0 py-3 px-6 border-t border-[var(--border-primary)] bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-6 text-xs text-[var(--text-secondary)]">
        <button onClick={() => onNavigate('privacy')} className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</button>
        <span className="select-none">|</span>
        <button onClick={() => onNavigate('terms')} className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</button>
      </div>
    </footer>
  );
};
