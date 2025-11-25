import React, { useState } from 'react';
import { UserAgreementModal } from './UserAgreementModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  onSignUp: (name: string, email: string, password: string) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSignIn, onSignUp }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  if (!isOpen) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLoginView && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setIsLoading(true);
    try {
      if (isLoginView) {
        await onSignIn(email, password, rememberMe);
      } else {
        await onSignUp(name, email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleView = () => {
    setIsLoginView(!isLoginView);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRememberMe(false);
    setAgreedToTerms(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div 
          className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-2xl w-full max-w-sm p-8"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold text-white mb-2 text-center">{isLoginView ? 'Sign In' : 'Create Account'}</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6 text-center">to save your projects to the cloud.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginView && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                required
              />
            </div>
            {!isLoginView && (
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                  required
                />
              </div>
            )}

            {isLoginView && (
              <div className="flex items-center">
                  <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded-sm border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-[var(--text-secondary)]">
                      Remember me
                  </label>
              </div>
            )}

            {!isLoginView && (
              <div className="flex items-start">
                  <input
                      id="terms-agreement"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded-sm border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                  />
                  <label htmlFor="terms-agreement" className="ml-2 block text-sm text-[var(--text-secondary)]">
                      I agree to the{' '}
                      <button type="button" onClick={() => setIsAgreementModalOpen(true)} className="font-semibold text-[var(--accent-primary)] hover:underline">
                          User Agreement & Terms of Service.
                      </button>
                  </label>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={isLoading || (!isLoginView && !agreedToTerms)} className="w-full mt-4 px-4 py-3 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors flex items-center justify-center disabled:bg-slate-600 disabled:cursor-not-allowed">
              {isLoading ? <div className="w-6 h-6 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div> : (isLoginView ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
          <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
            {isLoginView ? "Don't have an account?" : "Already have an account?"}
            <button onClick={handleToggleView} className="font-semibold text-[var(--accent-primary)] hover:underline ml-1">
              {isLoginView ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
      <UserAgreementModal 
        isOpen={isAgreementModalOpen}
        onClose={() => setIsAgreementModalOpen(false)}
        mode="viewer"
      />
    </>
  );
};