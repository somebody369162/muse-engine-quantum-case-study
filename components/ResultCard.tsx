



import React, { useState, useEffect, useRef } from 'react';
import { Mode } from '../types';
import type { Result, Citation, IconName } from '../types';
import { MODES } from '../constants';
import { Icon } from './Icon';
import { generateSpeech } from '../services/gemini';
import { useNotifications } from './Notifications';
import { AgentExecutionController } from './AgentExecutionController';
import { PlanRenderer } from './PlanRenderer';

interface ResultCardProps {
  result: Result;
  isLoading: boolean;
  onClarify: (originalResult: Result, userPrompt: string) => void;
  onGenerateAction: (originalResult: Result, actionPrompt: string) => void;
  onFeedback: (resultId: string, feedback: 'upvoted' | 'downvoted') => void;
  onSavePrompt: (result: Result) => void;
  onRedoGeneration: (resultId: string) => void;
  onUsePrompt: (prompt: string) => void;
  onNavigateVersion: (resultId: string, direction: 'next' | 'prev') => void;
  onAgentControl: (resultId: string, command: 'start' | 'pause' | 'stop') => void;
  onAgentUserInput: (resultId: string, stepId: string, userInput: string) => void;
}

const getFaviconUrl = (url: string): string => {
    try {
        const urlObj = new URL(url);
        return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch (e) {
        return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
};

const getHostname = (url: string): string => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
        return url;
    }
}

const SearchResults: React.FC<{ citations: Citation[] }> = ({ citations }) => {
  return (
    <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 rounded-b-xl mt-[-1px]">
      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Icon name="search" className="w-4 h-4 text-[var(--text-secondary)]"/>
          Sources from the Web
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {citations.map((citation, index) => (
          <a
            key={index}
            href={citation.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] rounded-lg transition-colors group"
            title={citation.uri}
          >
            <div className="flex items-center gap-3">
                <img src={getFaviconUrl(citation.uri)} alt={`${getHostname(citation.uri)} favicon`} className="w-5 h-5 rounded-sm flex-shrink-0 bg-[var(--bg-tertiary)]" />
                <div className="overflow-hidden">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                        {citation.title || getHostname(citation.uri)}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                        {getHostname(citation.uri)}
                    </p>
                </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// Audio decoding helpers as per @google/genai guidelines for raw PCM data
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

const getModeDetails = (mode: Result['mode']) => {
    return MODES.find(m => m.id === mode) || { name: 'Unknown', icon: 'chat' };
};

const renderInlineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-[var(--bg-tertiary)] text-[var(--accent-primary)] rounded px-1.5 py-0.5 text-sm font-mono">{part.slice(1, -1)}</code>;
    }
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const url = linkMatch[2];
      return <a href={url} key={i} target="_blank" rel="noopener noreferrer">{linkText}</a>;
    }
    return part;
  });
};

const CodeBlock: React.FC<{ code: string; lang: string }> = ({ code, lang }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [activeView, setActiveView] = useState<'code' | 'preview'>('code');
    const isPreviewable = lang === 'html';

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div className="relative bg-[#0D1117] rounded-lg my-4 border border-[var(--border-primary)]">
            <div className="flex justify-between items-center px-4 py-2 bg-[var(--bg-tertiary)] rounded-t-lg">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)] font-mono lowercase">{lang || 'code'}</span>
                    {isPreviewable && (
                        <div className="flex items-center gap-1 bg-[#0D1117] p-0.5 rounded-md">
                            <button onClick={() => setActiveView('code')} className={`px-2 py-0.5 text-xs rounded ${activeView === 'code' ? 'bg-[var(--bg-tertiary)] text-white' : 'text-gray-400'}`}><Icon name="code" className="w-4 h-4"/></button>
                            <button onClick={() => setActiveView('preview')} className={`px-2 py-0.5 text-xs rounded ${activeView === 'preview' ? 'bg-[var(--bg-tertiary)] text-white' : 'text-gray-400'}`}><Icon name="eye" className="w-4 h-4"/></button>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleCopy}
                    className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors flex items-center gap-1.5"
                >
                    {isCopied ? <Icon name="check" className="w-3.5 h-3.5 text-green-400" /> : <Icon name="copy" className="w-3.5 h-3.5" />}
                    {isCopied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            {activeView === 'code' ? (
                <pre className="p-4 overflow-x-auto text-sm text-[var(--text-primary)]">
                    <code>{code}</code>
                </pre>
            ) : (
                <iframe
                    srcDoc={code}
                    title="Code Preview"
                    sandbox="allow-scripts"
                    className="w-full h-64 bg-white border-t border-[var(--border-primary)]"
                />
            )}
        </div>
    );
};

const MarkdownRenderer: React.FC<{ text: string }> = React.memo(({ text }) => {
  const segments = text.split(/(```(?:[^\n]+)?\n[\s\S]*?```)/g);

  const parseTextChunk = (chunk: string) => {
    const lines = chunk.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Skip empty lines between blocks
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Headings
      const headingMatch = line.match(/^(#+)\s(.*)/);
      if (headingMatch) {
        const level = Math.min(headingMatch[1].length + 1, 6);
        const Tag = `h${level}` as React.ElementType;
        elements.push(<Tag key={`h-${i}`}>{renderInlineMarkdown(headingMatch[2])}</Tag>);
        i++;
        continue;
      }

      // Horizontal Rules
      if (line.match(/^(---|___|\*\*\*)\s*$/)) {
        elements.push(<hr key={`hr-${i}`} />);
        i++;
        continue;
      }

      // Blockquotes
      if (line.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        elements.push(<blockquote key={`quote-${i}`}>{quoteLines.map((q, j) => <p key={j}>{renderInlineMarkdown(q)}</p>)}</blockquote>);
        continue;
      }
      
      // Tables
      if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^[|\s-:]+$/)) {
        const headerLine = lines[i];
        const headers = headerLine.split('|').map(h => h.trim()).slice(1, -1);
        const rows = [];
        let j = i + 2;
        while (j < lines.length && lines[j].includes('|')) {
          rows.push(lines[j].split('|').map(c => c.trim()).slice(1, -1));
          j++;
        }
        if (headers.length > 0) {
            elements.push(
                <table key={`table-${i}`}>
                    <thead>
                        <tr>{headers.map((h, hi) => <th key={hi}>{renderInlineMarkdown(h)}</th>)}</tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{renderInlineMarkdown(cell)}</td>)}</tr>)}
                    </tbody>
                </table>
            );
        }
        i = j;
        continue;
      }

      // Lists
      const olMatch = line.match(/^\d+\.\s/);
      const ulMatch = line.match(/^(\*|-)\s/);
      if (olMatch || ulMatch) {
        const listItems = [];
        const isOrdered = !!olMatch;
        const listMarkerRegex = isOrdered ? /^\d+\.\s/ : /^(\*|-)\s/;
        
        let currentLine = lines[i];
        while (i < lines.length && currentLine && currentLine.match(listMarkerRegex)) {
          listItems.push(currentLine.replace(listMarkerRegex, ''));
          i++;
          currentLine = lines[i];
        }
        
        const ListTag = isOrdered ? 'ol' : 'ul';
        elements.push(
            <ListTag key={`list-${i}`}>
                {listItems.map((item, index) => <li key={index}>{renderInlineMarkdown(item)}</li>)}
            </ListTag>
        );
        continue;
      }

      // Paragraphs
      const paraLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        paraLines.push(lines[i]);
        i++;
      }
      elements.push(<p key={`p-${i}`}>{renderInlineMarkdown(paraLines.join('\n'))}</p>);
    }

    return elements;
  };
  
  return (
    <>
      {segments.filter(Boolean).map((segment, index) => {
        const codeBlockMatch = segment.match(/^```([^\n]*)?\n([\s\S]*?)```$/);
        if (codeBlockMatch) {
          const lang = codeBlockMatch[1] ? codeBlockMatch[1].trim() : '';
          const code = codeBlockMatch[2];
          return <CodeBlock key={index} code={code} lang={lang} />;
        }
        return <div key={index}>{parseTextChunk(segment)}</div>;
      })}
    </>
  );
});

const ActionsPanel: React.FC<{ result: Result, onClarify: ResultCardProps['onClarify'], onGenerateAction: ResultCardProps['onGenerateAction'] }> = ({ result, onClarify, onGenerateAction }) => {
  const [clarifyPrompt, setClarifyPrompt] = useState('Explain this in simpler terms.');

  const handleClarifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarifyPrompt.trim()) return;
    onClarify(result, clarifyPrompt);
  };
  
  return (
    <div className="p-4 bg-[var(--bg-secondary)]/50 rounded-b-xl mt-[-1px]">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
          <Icon name="lightbulb" className="w-4 h-4 text-yellow-400"/>
          Clarify or Elaborate
        </h4>
        <form onSubmit={handleClarifySubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={clarifyPrompt}
            onChange={(e) => setClarifyPrompt(e.target.value)}
            className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2 text-sm text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
            placeholder="Ask a follow-up question..."
          />
          <button type="submit" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors" title="Ask a follow-up question">Ask</button>
        </form>
      </div>
      
      <div>
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
          <Icon name="sparkles" className="w-4 h-4 text-[var(--accent-primary)]"/>
          Generative Actions
        </h4>
        <div className="flex flex-wrap gap-2">
          {result.mode === Mode.MUSE && (
            <>
              <button onClick={() => onGenerateAction(result, `Write a short poem based on the provided context.`)} className="text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-secondary)] px-3 py-1.5 rounded-md transition-colors" title="Generate a short poem based on this response">✍️ Write Poem</button>
              <button onClick={() => onGenerateAction(result, `Summarize the key points of the provided context in a few sentences.`)} className="text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-secondary)] px-3 py-1.5 rounded-md transition-colors" title="Summarize the key points from this response">📋 Summarize</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ContextualActions: React.FC<{ result: Result; onGenerateAction: ResultCardProps['onGenerateAction'] }> = ({ result, onGenerateAction }) => {
    const responseText = result.versions[result.activeVersionIndex].response;
    const actions: { label: string; prompt: string; icon: IconName }[] = [];

    if (responseText.includes('```python')) {
        actions.push({ label: 'Generate Unit Tests', prompt: 'Generate unit tests for the preceding Python code.', icon: 'test-tube' });
        actions.push({ label: 'Explain this Code', prompt: 'Explain the preceding code snippet line by line.', icon: 'lightbulb' });
    }
    if (responseText.includes('```javascript') || responseText.includes('```typescript') || responseText.includes('```jsx')) {
        actions.push({ label: 'Generate JSDoc', prompt: 'Generate JSDoc comments for the preceding JavaScript/TypeScript code.', icon: 'edit' });
        actions.push({ label: 'Refactor to Arrow Functions', prompt: 'Refactor the preceding JavaScript code to use arrow functions where possible.', icon: 'quick' });
    }
     if (responseText.includes('```css')) {
        actions.push({ label: 'Suggest BEM improvements', prompt: 'Review the preceding CSS and suggest improvements based on BEM methodology.', icon: 'edit' });
    }

    if (actions.length === 0) {
        return null;
    }

    return (
        <div className="px-6 pb-4 -mt-2">
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                <Icon name="sparkles" className="w-4 h-4" />
                Suggested Actions
            </h4>
            <div className="flex flex-wrap gap-2">
                {actions.map((action, index) => (
                    <button
                        key={index}
                        onClick={() => onGenerateAction(result, action.prompt)}
                        className="text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-md transition-colors flex items-center gap-2"
                        title={action.prompt}
                    >
                        <Icon name={action.icon} className="w-3.5 h-3.5" />
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const ResultCard: React.FC<ResultCardProps> = ({ result, isLoading, onClarify, onGenerateAction, onFeedback, onSavePrompt, onRedoGeneration, onUsePrompt, onNavigateVersion, onAgentControl, onAgentUserInput }) => {
  const modeDetails = getModeDetails(result.mode);
  const [isActionsPanelOpen, setActionsPanelOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const { addNotification } = useNotifications();

  const isMounted = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const speakErrorTimeoutRef = useRef<number | null>(null);
  
  const isChatMode = result.mode === Mode.CHAT;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error("Error closing AudioContext", e));
      }
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (speakErrorTimeoutRef.current) clearTimeout(speakErrorTimeoutRef.current);
    };
  }, []);

  const activeVersion = result.versions[result.activeVersionIndex];
  if (!activeVersion) {
    // Fallback for corrupted data
    return null;
  }
  
  const isWebSearchChat = result.mode === Mode.CHAT && activeVersion.citations.length > 0;

  const cardStyle = {
    background: `radial-gradient(circle at top left, ${isChatMode ? 'rgba(130, 80, 223, 0.1)' : 'rgba(130, 80, 223, 0.05)'} 0%, transparent 20%), var(--bg-secondary)`,
    border: '1px solid var(--border-primary)',
  };

  const handleCopy = async () => {
    const textToCopy = activeVersion.response;
    if (!textToCopy || isLoading) return;
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);

    try {
      await navigator.clipboard.writeText(textToCopy);
      if (isMounted.current) setIsCopied(true);
      copyTimeoutRef.current = window.setTimeout(() => {
        if (isMounted.current) setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy response:', err);
    }
  };

  const handleSpeak = async () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (!activeVersion.response || isSpeaking || !audioContextRef.current) return;

    if (speakErrorTimeoutRef.current) clearTimeout(speakErrorTimeoutRef.current);
    if (isMounted.current) {
        setSpeakError(null);
        setIsSpeaking(true);
    }

    try {
      const textToSpeak = activeVersion.response.replace(/(\*\*|\*|`|#+\s*)/g, '');
      const base64Audio = await generateSpeech(textToSpeak);
      
      if (base64Audio && audioContextRef.current) {
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => {
            if (isMounted.current) setIsSpeaking(false);
        };
        source.start();
      } else {
        if (isMounted.current) setIsSpeaking(false);
      }
    } catch (error) {
        console.error("Failed to play audio:", error);
        if (isMounted.current) {
            const message = error instanceof Error ? error.message.replace('Speech Generation Error:', '').trim() : "An unknown error occurred.";
            addNotification({
                type: 'error',
                title: 'Audio Playback Failed',
                message: message,
            });
            setSpeakError("Audio failed");
            speakErrorTimeoutRef.current = window.setTimeout(() => {
                if (isMounted.current) setSpeakError(null);
            }, 3000);
            setIsSpeaking(false);
        }
    }
  };

  return (
    <div id={`result-${result.id}`} style={cardStyle} className="rounded-xl shadow-lg animate-fade-in scroll-mt-8">
      {isChatMode || result.mode === Mode.AGENT ? (
         <div className="result-card-prompt flex gap-4 items-start border-b border-[var(--border-primary)]">
            <Icon name={result.mode === Mode.AGENT ? 'agent' : 'user'} className="w-7 h-7 text-[var(--text-secondary)] flex-shrink-0 mt-0.5"/>
            <p className="flex-grow font-sans text-base text-[var(--text-primary)] leading-relaxed break-words pt-1">{result.prompt}</p>
            <button 
                onClick={() => onUsePrompt(result.prompt)}
                className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white transition-colors flex-shrink-0"
                title="Edit and resubmit prompt"
            >
                <Icon name="refresh" className="w-4 h-4" />
            </button>
        </div>
      ) : (
        <div className="result-card-prompt border-b border-[var(--border-primary)] flex justify-between items-start gap-4">
            <p className="flex-grow text-base text-[var(--text-primary)] leading-relaxed break-words pt-1">{result.prompt}</p>
            <button 
                onClick={() => onUsePrompt(result.prompt)}
                className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white transition-colors flex-shrink-0"
                title="Edit and resubmit prompt"
            >
                <Icon name="refresh" className="w-4 h-4" />
            </button>
        </div>
      )}

      {result.mode !== Mode.AGENT && (
        <>
            <div className="result-card-content">
                <div className={`flex items-start ${isChatMode ? 'gap-4' : ''}`}>
                {(isChatMode) && (
                    <Icon name={modeDetails.icon} className="w-7 h-7 text-[var(--accent-primary)] flex-shrink-0 mt-0.5"/>
                )}
                <div className="prose-custom text-base flex-grow pt-1">
                    {isLoading && !activeVersion.response ? (
                        <div className="space-y-3">
                            <div className="h-4 bg-slate-700 rounded w-full skeleton-loader"></div>
                            <div className="h-4 bg-slate-700 rounded w-5/6 skeleton-loader"></div>
                            <div className="h-4 bg-slate-700 rounded w-3/4 skeleton-loader"></div>
                        </div>
                    ) : (
                        <MarkdownRenderer text={activeVersion.response} />
                    )}
                    {isLoading && activeVersion.response && <span className="inline-block w-2.5 h-5 bg-[var(--text-secondary)] animate-pulse ml-1 align-middle rounded-sm"></span>}
                </div>
                </div>
            </div>
            {!isLoading && activeVersion.response && <ContextualActions result={result} onGenerateAction={onGenerateAction} />}
        </>
      )}
      
      {result.mode === Mode.AGENT && result.plan && result.agentState && (
        <>
          <AgentExecutionController result={result} onAgentControl={onAgentControl} />
          <div className="p-4">
            <PlanRenderer 
              plan={result.plan} 
              resultId={result.id}
              onAgentUserInput={onAgentUserInput}
              isExecuting={result.agentState.status === 'running'}
            />
          </div>
        </>
      )}

      <div className="result-card-footer border-t border-[var(--border-primary)] flex flex-col md:flex-row gap-2 items-start md:items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-[var(--bg-tertiary)] px-2.5 py-1 rounded-full font-medium">
              <Icon name={modeDetails.icon} className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span className="text-white">{result.mode}</span>
            </span>
            {result.focuses && result.focuses.map(focus => (
                <span key={focus} className="inline-flex items-center bg-[var(--bg-tertiary)] px-2.5 py-1 rounded-full font-medium">
                    {focus}
                </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 self-end md:self-center">
             {result.versions.length > 1 && (
                <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1 rounded-full">
                    <button onClick={() => onNavigateVersion(result.id, 'prev')} disabled={result.activeVersionIndex === 0} className="p-1.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:bg-[var(--border-primary)] hover:text-white transition-colors" title="Previous version">
                        <Icon name="chevron-left" className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-xs w-12 text-center">{result.activeVersionIndex + 1} / {result.versions.length}</span>
                    <button onClick={() => onNavigateVersion(result.id, 'next')} disabled={result.activeVersionIndex === result.versions.length - 1} className="p-1.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:bg-[var(--border-primary)] hover:text-white transition-colors" title="Next version">
                        <Icon name="chevron-right" className="w-4 h-4" />
                    </button>
                </div>
            )}
             {speakError && <span className="text-xs text-red-400 animate-fade-in">{speakError}</span>}
             <div className="flex items-center bg-[var(--bg-tertiary)] p-1 rounded-full">
               <button
                onClick={() => onRedoGeneration(result.id)}
                disabled={isLoading}
                className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--border-primary)] hover:text-white transition-colors disabled:text-slate-600 disabled:cursor-not-allowed"
                title="Regenerate response"
              >
                <Icon name="refresh" className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                disabled={!activeVersion.response || isLoading}
                className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--border-primary)] hover:text-white transition-colors disabled:text-slate-600 disabled:cursor-not-allowed"
                title={isCopied ? "Copied!" : "Copy response"}
              >
                {isCopied ? (
                    <Icon name="check" className="w-4 h-4 text-green-400" />
                ) : (
                    <Icon name="copy" className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={handleSpeak}
                disabled={!activeVersion.response || isLoading || isSpeaking}
                className={`p-1.5 rounded-full transition-colors disabled:text-slate-600 disabled:cursor-not-allowed ${isSpeaking ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--border-primary)] hover:text-white'}`}
                title="Read response aloud"
              >
                <Icon name="speak" className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSavePrompt(result)}
                disabled={!result.prompt}
                className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--border-primary)] hover:text-white transition-colors disabled:text-slate-600 disabled:cursor-not-allowed"
                title="Save prompt"
              >
                <Icon name="bookmark" className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onFeedback(result.id, 'upvoted')}
                className={`p-1.5 rounded-full transition-colors ${result.feedback === 'upvoted' ? 'bg-green-500/20 text-green-400' : 'text-[var(--text-secondary)] hover:bg-[var(--border-primary)] hover:text-white'}`}
                title="Upvote response"
              >
                <Icon name="thumb-up" className="w-4 h-4" />
              </button>
               <button 
                onClick={() => onFeedback(result.id, 'downvoted')}
                className={`p-1.5 rounded-full transition-colors ${result.feedback === 'downvoted' ? 'bg-red-500/20 text-red-400' : 'text-[var(--text-secondary)] hover:bg-[var(--border-primary)] hover:text-white'}`}
                title="Downvote response"
              >
                <Icon name="thumb-down" className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={() => setActionsPanelOpen(!isActionsPanelOpen)}
              className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white transition-colors"
              title="Follow-up Actions"
            >
              <Icon name="dots-horizontal" className="w-5 h-5"/>
            </button>
            <time className="ml-2 hidden sm:inline">{activeVersion.timestamp}</time>
          </div>
      </div>
      
      {isActionsPanelOpen && <ActionsPanel result={result} onClarify={onClarify} onGenerateAction={onGenerateAction} />}

      {isWebSearchChat ? (
        <SearchResults citations={activeVersion.citations} />
      ) : activeVersion.citations.length > 0 && (
        <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 rounded-b-xl mt-[-1px]">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Sources:</h4>
          <ul className="space-y-1">
            {activeVersion.citations.map((citation, index) => (
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
      )}
    </div>
  );
};
