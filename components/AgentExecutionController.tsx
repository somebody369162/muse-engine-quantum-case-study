

import React from 'react';
import type { Result } from '../types';
import { Icon } from './Icon';

interface AgentExecutionControllerProps {
  result: Result;
  onAgentControl: (resultId: string, command: 'start' | 'pause' | 'stop') => void;
}

export const AgentExecutionController: React.FC<AgentExecutionControllerProps> = ({ result, onAgentControl }) => {
  const { agentState, plan } = result;

  if (!agentState || !plan) return null;

  const { status, currentStepIndex = 0 } = agentState;
  const planLength = plan.length;
  
  const currentStep = plan[currentStepIndex];
  const currentStepNumber = plan.findIndex(s => s.id === currentStep?.id) + 1 || currentStepIndex + 1;


  let statusText = '';
  let statusColor = 'text-[var(--text-secondary)]';

  switch (status) {
    case 'idle':
      statusText = 'Plan generated. Ready to start.';
      break;
    case 'running':
      statusText = `Executing step ${currentStepNumber} of ${planLength}...`;
      statusColor = 'text-indigo-400';
      break;
    case 'paused':
      statusText = `Paused at step ${currentStepNumber} of ${planLength}.`;
      statusColor = 'text-yellow-400';
      break;
    case 'stopped':
      statusText = 'Execution stopped by user.';
      statusColor = 'text-red-400';
      break;
    case 'error':
      statusText = `Error on step ${currentStepNumber}. Execution halted.`;
      statusColor = 'text-red-400';
      break;
    case 'completed':
      statusText = 'Execution completed successfully.';
      statusColor = 'text-green-400';
      break;
  }
  
  const getStartButtonText = () => {
      if (status === 'paused') return 'Resume';
      if (status === 'stopped' || status === 'error' || status === 'completed') return 'Restart';
      return 'Start Execution';
  }

  return (
    <div className="border-t border-[var(--border-primary)] p-4 bg-slate-900/30 flex items-center justify-between animate-fade-in">
      <div>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">Agent Status</h4>
        <p className={`text-sm ${statusColor}`}>{statusText}</p>
      </div>
      <div className="flex items-center gap-2">
        {(status === 'idle' || status === 'paused' || status === 'stopped' || status === 'error' || status === 'completed') && (
          <button
            onClick={() => onAgentControl(result.id, 'start')}
            className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold rounded-md transition-colors flex items-center gap-2"
          >
            <Icon name="play" className="w-4 h-4" />
            {getStartButtonText()}
          </button>
        )}
        {status === 'running' && (
          <button
            onClick={() => onAgentControl(result.id, 'pause')}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold rounded-md transition-colors flex items-center gap-2"
          >
            <Icon name="pause" className="w-4 h-4" />
            Pause
          </button>
        )}
         {(status === 'running' || status === 'paused') && (
          <button
            onClick={() => onAgentControl(result.id, 'stop')}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded-md transition-colors flex items-center gap-2"
          >
            <Icon name="stop" className="w-4 h-4" />
            Stop
          </button>
        )}
      </div>
    </div>
  );
};