

import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import { Icon } from './Icon';

interface UserAuthenticationProps {
  user: User | null;
  onSignInClick: () => void;
  onSignOut: () => void;
}

const UserAvatar: React.FC<{ user: User }> = ({ user }) => {
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-sm font-bold text-white select-none">
      {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" /> : <span>{getInitials(user.name)}</span>}
    </div>
  );
};

export const UserAuthentication: React.FC<UserAuthenticationProps> = ({ user, onSignInClick, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  if (!user) {
    return (
      <button
        onClick={onSignInClick}
        className="px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-white transition-colors"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button onClick={() => setIsOpen(prev => !prev)} className="flex items-center gap-2 p-1 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors">
        <UserAvatar user={user} />
      </button>

      {isOpen && (
         <div className="absolute top-full mt-2 right-0 w-56 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-lg z-30 animate-fade-in-down overflow-hidden">
           <div className="p-3 border-b border-[var(--border-primary)]">
             <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.name}</p>
             <p className="text-xs text-[var(--text-secondary)] truncate">{user.email}</p>
           </div>
           <ul className="py-1">
              <li>
                 <button
                  onClick={onSignOut}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Sign Out
                </button>
              </li>
           </ul>
         </div>
      )}
    </div>
  );
};
