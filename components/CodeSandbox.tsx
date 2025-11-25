
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ResultsFeed } from './ResultsFeed';
import { Icon } from './Icon';
import type { Result, CodeSandboxSettings } from '../types';

interface CodeSandboxProps {
  results: Result[];
  content: string;
  settings: CodeSandboxSettings;
  // Pass-through props for ResultsFeed
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

// Hook for debouncing values
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const buildSrcDoc = (code: string, lang: 'html' | 'jsx'): string => {
  if (lang === 'jsx') {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { 
              font-family: sans-serif; 
              background-color: #111827; 
              color: white; 
              padding: 1rem;
              margin: 0;
              height: 100vh;
              box-sizing: border-box;
              overflow: auto;
            }
            #root { height: 100%; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel" data-presets="env,react">
            window.onerror = function(message, source, lineno, colno, error) {
               const root = document.getElementById('root');
               root.innerHTML = '<div style="color: #fca5a5; font-family: monospace; background: rgba(127, 29, 29, 0.5); padding: 1rem; border-radius: 0.5rem; border: 1px solid #ef4444;"><strong>Runtime Error:</strong><br/>' + message + '</div>';
            };

            try {
              const App = () => {
                ${code}
              };
              const root = ReactDOM.createRoot(document.getElementById('root'));
              root.render(<App />);
            } catch (e) {
              console.error(e);
              const root = document.getElementById('root');
              root.innerHTML = '<div style="color: #fca5a5; font-family: monospace; background: rgba(127, 29, 29, 0.5); padding: 1rem; border-radius: 0.5rem; border: 1px solid #ef4444;"><strong>Render Error:</strong><br/>' + e.message + '</div>';
            }
          </script>
        </body>
      </html>
    `;
  }
  // For HTML
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { background-color: #ffffff; color: #000000; margin: 0; padding: 0; } 
        </style>
      </head>
      <body>
        ${code}
      </body>
    </html>
  `;
};

const LivePreview = React.memo(({ code, lang }: { code: string, lang: 'html' | 'jsx' }) => {
  const srcDoc = useMemo(() => buildSrcDoc(code, lang), [code, lang]);
  
  return (
    <iframe
      srcDoc={srcDoc}
      title="Live Code Preview"
      sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-forms"
      className="w-full h-full bg-white border-none"
    />
  );
}, (prev, next) => prev.code === next.code && prev.lang === next.lang);

export const CodeSandbox: React.FC<CodeSandboxProps> = ({ results, content, settings, ...resultsFeedProps }) => {
  const [lang, setLang] = useState<'html' | 'jsx'>(settings.template);
  const [panelWidth, setPanelWidth] = useState(50); // Initial width as a percentage
  const isResizing = useRef(false);

  // Debounce content to prevent rapid iframe reloads
  const debouncedContent = useDebounce(content, 1000);

  useEffect(() => {
    setLang(settings.template);
  }, [settings.template]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    // Add overlay to iframe to prevent mouse capturing during resize
    const overlay = document.getElementById('iframe-overlay');
    if (overlay) overlay.style.display = 'block';
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        const overlay = document.getElementById('iframe-overlay');
        if (overlay) overlay.style.display = 'none';
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) { // Constraints
        setPanelWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const displayContent = debouncedContent || (lang === 'html' ? '<!-- Your HTML code will appear here -->' : '// Your React component will appear here');

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto main-padding" style={{ width: `${panelWidth}%` }}>
        <ResultsFeed results={results} {...resultsFeedProps} />
      </div>
      <div
        onMouseDown={handleMouseDown}
        className="w-2 cursor-col-resize bg-[var(--border-primary)] hover:bg-[var(--accent-primary)] transition-colors duration-200 flex items-center justify-center z-10"
        title="Drag to resize panels"
      >
        <div className="w-0.5 h-8 bg-[var(--text-secondary)] rounded-full opacity-50" />
      </div>
      <div className="flex-1 flex flex-col relative" style={{ width: `${100 - panelWidth}%` }}>
        <header className="flex-shrink-0 flex items-center justify-between p-2 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                <Icon name="play-circle" className="w-4 h-4" />
                Live Preview
            </h3>
            <div className="flex items-center gap-2">
                 {content !== debouncedContent && (
                    <span className="text-xs text-[var(--text-secondary)] animate-pulse">Updating...</span>
                 )}
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)]">{lang}</span>
            </div>
        </header>
        <div className="relative flex-1 w-full h-full bg-white">
            <div id="iframe-overlay" className="absolute inset-0 z-20 hidden bg-transparent"></div>
            <LivePreview code={displayContent} lang={lang} />
        </div>
      </div>
    </div>
  );
};
