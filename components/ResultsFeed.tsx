

import React from 'react';
import type { Result } from '../types';
import { ResultCard } from './ResultCard';
import { Icon } from './Icon';

interface ResultsFeedProps {
  results: Result[];
  isLoading: boolean;
  onClarify: (originalResult: Result, userPrompt: string) => void;
  onGenerateAction: (originalResult: Result, actionPrompt: string) => void;
  onFeedback: (resultId: string, feedback: 'upvoted' | 'downvoted') => void;
  onSavePrompt: (result: Result) => void;
  onRedoGeneration: (resultId: string) => void;
  onUsePrompt: (prompt: string) => void;
  onNavigateVersion: (resultId: string, direction: 'next' | 'prev') => void;
  isSearching: boolean;
  onAgentControl: (resultId: string, command: 'start' | 'pause' | 'stop') => void;
  onAgentUserInput: (resultId: string, stepId: string, userInput: string) => void;
}

export const ResultsFeed: React.FC<ResultsFeedProps> = ({ results, isLoading, onClarify, onGenerateAction, onFeedback, onSavePrompt, onRedoGeneration, onUsePrompt, onNavigateVersion, isSearching, onAgentControl, onAgentUserInput }) => {
  if (results.length === 0) {
    if (isSearching) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-secondary)]">
          <div className="max-w-md">
              <Icon name="search" className="w-16 h-16 mx-auto mb-6 text-slate-700" />
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">No Results Found</h2>
              <p className="mt-2">Try a different search term to find what you're looking for in your conversation history.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-secondary)]">
        <div className="max-w-md p-8">
            <Icon name="muse" className="w-20 h-20 mx-auto mb-6 text-slate-700" />
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">The Muse Engine</h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">Your canvas for creative and technical exploration. Your results will appear here. Begin by typing a prompt below.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-4">
      {results.map((result, index) => (
        <ResultCard 
          key={result.id} 
          result={result} 
          isLoading={isLoading && index === 0 && result.activeVersionIndex === result.versions.length -1}
          onClarify={onClarify}
          onGenerateAction={onGenerateAction}
          onFeedback={onFeedback}
          onSavePrompt={onSavePrompt}
          onRedoGeneration={onRedoGeneration}
          onUsePrompt={onUsePrompt}
          onNavigateVersion={onNavigateVersion}
          onAgentControl={onAgentControl}
          onAgentUserInput={onAgentUserInput}
        />
      ))}
    </div>
  );
};