import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { generateStream } from '../services/gemini';
import { Mode } from '../types';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string; // e.g., "Modes"
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ isOpen, onClose, topic }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const responseEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuestion(`In the context of 'The Muse Engine' app, explain what "${topic}" are and how they work. Be concise and helpful for a new user.`);
      setResponse('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, topic]);
  
  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [response]);

  if (!isOpen) return null;

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    setResponse('');
    
    try {
      let currentResponse = '';
      const stream = generateStream(question, Mode.QUICK);
      for await (const chunk of stream) {
        currentResponse += (chunk.textChunk || '');
        setResponse(currentResponse);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] shadow-2xl w-full max-w-lg flex flex-col h-auto max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-[var(--border-primary)]">
          <h2 className="text-lg font-bold text-white flex items-center gap-3">
            <Icon name="lightbulb" className="w-5 h-5 text-yellow-300" />
            Ask about: {topic}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]" title="Close">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                <p className="text-sm text-[var(--text-primary)]">{response || 'Ask a question to learn more.'}</p>
                {isLoading && !response && <div className="h-4 bg-slate-700 rounded w-3/4 skeleton-loader mt-2"></div>}
                {isLoading && response && <span className="inline-block w-2.5 h-4 bg-[var(--text-secondary)] animate-pulse ml-1 align-middle rounded-sm"></span>}
                {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
                <div ref={responseEndRef} />
            </div>
        </main>
        
        <footer className="flex-shrink-0 p-4 border-t border-[var(--border-primary)]">
            <form onSubmit={handleAsk} className="flex items-center gap-2">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a follow-up question..."
                    className="flex-1 w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-2 text-sm text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !question.trim()}
                    className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-md text-sm transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                   {isLoading ? 'Thinking...' : 'Ask'}
                </button>
            </form>
        </footer>
      </div>
    </div>
  );
};