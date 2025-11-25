

import React from 'react';
import type { PlanStep, Citation } from '../types';
import { UserInputPrompt } from './UserInputPrompt';
import { Icon } from './Icon';

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const blocks = text.split(/\n\s*\n/);
    return (
        <>
            {blocks.map((block, i) => (
                <p key={i} className="mb-2 last:mb-0">
                    {block}
                </p>
            ))}
        </>
    );
};

const CitationList: React.FC<{ citations: Citation[] }> = ({ citations }) => (
    <div className="mt-3 pt-2 border-t border-slate-700/50">
        <h5 className="text-xs font-semibold text-slate-400 mb-1">Sources:</h5>
        <ul className="space-y-1">
            {citations.map((citation, index) => (
                <li key={index} className="flex items-start">
                    <span className="text-slate-500 mr-2 text-xs">[{index + 1}]</span>
                    <a
                        href={citation.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent-primary)] text-xs hover:underline truncate"
                        title={citation.uri}
                    >
                        {citation.title || citation.uri}
                    </a>
                </li>
            ))}
        </ul>
    </div>
);

export const PlanRenderer: React.FC<{ plan: PlanStep[]; resultId: string; onAgentUserInput: (resultId: string, stepId: string, userInput: string) => void; isExecuting: boolean; }> = ({ plan, resultId, onAgentUserInput, isExecuting }) => {
  return (
    <div>
      <h4 className="text-md font-semibold text-[var(--text-secondary)] mb-4">Execution Plan:</h4>
      <ol className="space-y-4">
        {plan.map((step, index) => (
          <li key={step.id} className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
              step.status === 'completed' ? 'bg-green-500/20 border-green-500 text-green-300' : 
              step.status === 'in-progress' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 
              step.status === 'awaiting-input' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300' :
              step.status === 'error' ? 'bg-red-500/20 border-red-500 text-red-300' : 
              'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)]'
            }`}>
              {step.status === 'in-progress' ? (
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-white rounded-full animate-spin"></div>
              ) : step.status === 'completed' ? (
                <Icon name="check" className="w-5 h-5" />
              ) : (
                index + 1
              )}
            </div>
            <div className="flex-grow pt-1">
              <p className="font-medium text-[var(--text-primary)]">{step.description}</p>
              
              {step.status === 'awaiting-input' && step.inputPrompt && (
                  <UserInputPrompt 
                      promptText={step.inputPrompt}
                      onSubmit={(inputText) => onAgentUserInput(resultId, step.id, inputText)}
                      isExecuting={isExecuting}
                  />
              )}

              {step.result && (
                <div className="mt-3 p-3 bg-[var(--bg-primary)] rounded-md border border-[var(--border-primary)] text-sm text-[var(--text-secondary)]">
                  <MarkdownRenderer text={step.result} />
                  {step.status === 'in-progress' && <span className="inline-block w-2 h-4 bg-[var(--text-secondary)] animate-pulse ml-1 align-middle rounded-sm"></span>}
                   {step.citations && step.citations.length > 0 && (
                      <CitationList citations={step.citations} />
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};
