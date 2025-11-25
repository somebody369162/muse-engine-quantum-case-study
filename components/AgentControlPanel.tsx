
import React from 'react';

interface AgentControlPanelProps {
  directive: string;
  onDirectiveChange: (directive: string) => void;
  learnedStyle: string;
}

export const AgentControlPanel: React.FC<AgentControlPanelProps> = ({ directive, onDirectiveChange, learnedStyle }) => {
  return (
    <div className="max-w-4xl mx-auto mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <h3 className="text-lg font-semibold text-slate-200 mb-3">Agent Control Panel</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="directive" className="block text-sm font-medium text-slate-400 mb-1">
            System Directive (for this session)
          </label>
          <textarea
            id="directive"
            value={directive}
            onChange={(e) => onDirectiveChange(e.target.value)}
            placeholder="e.g., You are a formal business analyst. Respond with data-driven insights."
            className="w-full h-24 p-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-white focus:ring-1 focus:ring-indigo-400 outline-none resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">
            Learned Style (from feedback)
          </label>
          <div className="w-full h-24 p-2 bg-slate-900/50 border border-slate-700 rounded-md text-sm text-slate-300 overflow-y-auto">
            {learnedStyle ? (
              <pre className="whitespace-pre-wrap font-sans">{learnedStyle}</pre>
            ) : (
              <p className="text-slate-500 italic">No feedback given yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
