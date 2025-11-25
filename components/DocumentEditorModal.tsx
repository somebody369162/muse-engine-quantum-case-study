import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Focus } from '../types';
import type { DocumentSettings, DocumentTemplate } from '../types';
import { getPrediction, modifyText } from '../services/gemini';
import { Icon } from './Icon';
import { Content } from '@google/genai';
import { DocumentSettingsModal } from './DocumentSettingsModal';
import { useNotifications } from './Notifications';

interface DocumentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onContentChange: (content: string) => void;
  settings: DocumentSettings;
  onSettingsChange: (settings: DocumentSettings) => void;
  chatHistory: Content[];
  chatFocuses: Focus[];
  documentTemplates: DocumentTemplate[];
}

const TemplateSelectorView: React.FC<{
    templates: DocumentTemplate[];
    onSelect: (content: string) => void;
}> = ({ templates, onSelect }) => (
    <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-white mb-2">Start a New Document</h2>
            <p className="text-center text-[var(--text-secondary)] mb-8">Choose a template or start with a blank page.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button onClick={() => onSelect('')} className="p-6 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] rounded-xl transition-all duration-200 text-left flex flex-col gap-4 group hover:scale-105 border border-transparent hover:border-[var(--accent-primary)]">
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center group-hover:bg-[var(--bg-tertiary)]">
                        <Icon name="plus" className="w-6 h-6 text-[var(--accent-primary)]" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Blank Document</h3>
                        <p className="text-sm text-[var(--text-secondary)]">Start from scratch.</p>
                    </div>
                </button>
                {templates.map(template => (
                    <button key={template.id} onClick={() => onSelect(template.content)} className="p-6 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] rounded-xl transition-all duration-200 text-left flex flex-col gap-4 group hover:scale-105 border border-transparent hover:border-[var(--accent-primary)]">
                        <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center group-hover:bg-[var(--bg-tertiary)]">
                            <Icon name={template.icon} className="w-6 h-6 text-[var(--accent-primary)]" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">{template.name}</h3>
                            <p className="text-sm text-[var(--text-secondary)]">{template.description}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    </div>
);


const MagicMenu: React.FC<{
    position: { x: number, y: number };
    onAction: (prompt: string, action: 'replace' | 'insert') => void;
    onClose: () => void;
}> = ({ position, onAction, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const actions = [
        { label: 'Improve', prompt: 'Improve the writing of the selected text.', icon: 'sparkles' as const, type: 'replace' as const },
        { label: 'Fix Grammar', prompt: 'Fix any spelling and grammar errors in the selected text.', icon: 'check' as const, type: 'replace' as const },
        { label: 'Shorter', prompt: 'Summarize or shorten the selected text.', icon: 'quick' as const, type: 'replace' as const },
        { label: 'Longer', prompt: 'Elaborate on or expand the selected text.', icon: 'plus' as const, type: 'replace' as const },
    ];

    return (
        <div ref={menuRef} style={{ top: position.y, left: position.x }} className="absolute z-10 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-2xl p-1 animate-fade-in-down flex items-center gap-1">
            <button onClick={() => onAction('Continue writing from here.', 'insert')} title="Continue Writing" className="px-2 py-1.5 flex items-center gap-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white text-xs">
                <Icon name="wand" className="w-4 h-4" />
                Continue
            </button>
             <div className="w-px h-4 bg-[var(--border-primary)] mx-1"></div>
            {actions.map(action => (
                <button key={action.label} onClick={() => onAction(action.prompt, action.type)} title={action.label} className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white">
                    <Icon name={action.icon} className="w-4 h-4" />
                </button>
            ))}
        </div>
    );
};

const EditorToolbar: React.FC<{ onAction: (action: 'bold' | 'italic' | 'h1' | 'h2' | 'list') => void }> = ({ onAction }) => {
    const actions = [
        { name: 'bold' as const, icon: 'bold' as const },
        { name: 'italic' as const, icon: 'italic' as const },
        { name: 'h1' as const, icon: 'h1' as const },
        { name: 'h2' as const, icon: 'h2' as const },
        { name: 'list' as const, icon: 'list-bullet' as const },
    ];
    return (
        <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg">
            {actions.map(action => (
                <button key={action.name} onClick={() => onAction(action.name)} className="p-2 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white transition-colors" title={`Format as ${action.name}`}>
                    <Icon name={action.icon} className="w-5 h-5" />
                </button>
            ))}
        </div>
    );
};


const DocumentEditor: React.FC<{
    onClose: () => void;
    content: string;
    onContentChange: (content: string) => void;
    settings: DocumentSettings;
    onSettingsChange: (settings: DocumentSettings) => void;
    chatHistory: Content[];
    chatFocuses: Focus[];
    onBackToTemplates: () => void;
}> = ({ onClose, content, onContentChange, settings, onSettingsChange, chatHistory, chatFocuses, onBackToTemplates }) => {
    const [prediction, setPrediction] = useState('');
    const [selection, setSelection] = useState<{ start: number, end: number, text: string } | null>(null);
    const [magicMenuPos, setMagicMenuPos] = useState<{ x: number, y: number } | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isModifying, setIsModifying] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const predictionTimeoutRef = useRef<number | null>(null);
    const { addNotification } = useNotifications();
    const isMounted = useRef(false);

    useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const charCount = content.length;

    useEffect(() => {
        const { isPredictiveTextEnabled } = settings;
        const shouldPredict = isPredictiveTextEnabled && content.length > 0 && (content.endsWith(' ') || content.endsWith('\n'));
        
        if (!shouldPredict) { setPrediction(''); return; }
        if (predictionTimeoutRef.current) clearTimeout(predictionTimeoutRef.current);

        predictionTimeoutRef.current = window.setTimeout(async () => {
            const currentFocuses = settings.useCustomFocuses ? settings.focuses : chatFocuses;
            const style = settings.writingStyle;
            const generatedPrediction = await getPrediction(content, chatHistory, currentFocuses, style, content);
            if (textareaRef.current?.value === content) { setPrediction(generatedPrediction); }
        }, 500);

        return () => { if (predictionTimeoutRef.current) clearTimeout(predictionTimeoutRef.current); };
    }, [content, settings, chatHistory, chatFocuses]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPrediction('');
        onContentChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab' && prediction) {
            e.preventDefault();
            onContentChange(content + prediction);
            setPrediction('');
        } else if (prediction) {
            setPrediction('');
        }
    };
    
    const handleSelect = () => {
        if (!textareaRef.current) return;
        const { selectionStart, selectionEnd, value } = textareaRef.current;
        const selectedText = value.substring(selectionStart, selectionEnd);
        
        if (selectedText) {
            setSelection({ start: selectionStart, end: selectionEnd, text: selectedText });
        } else {
            setSelection(null);
            setMagicMenuPos(null);
        }
    };

    const handleMagicWandClick = () => {
        if (!textareaRef.current) return;
        const { selectionStart } = textareaRef.current;
        
        const textLines = content.substring(0, selectionStart).split('\n');
        const lineNum = textLines.length;
        const charOnLine = textLines[textLines.length - 1].length;

        const roughY = (lineNum * 24) + 24; // Approximation based on line height
        const roughX = (charOnLine * 8) + 24; // Approximation based on char width

        const rect = textareaRef.current.getBoundingClientRect();
        
        setMagicMenuPos({ x: rect.left + roughX, y: rect.top + roughY });
    };

    const handleAIAction = async (prompt: string, action: 'replace' | 'insert') => {
        setMagicMenuPos(null);
        if (!textareaRef.current) return;
        
        const { selectionStart, selectionEnd } = textareaRef.current;
        const selectedText = action === 'replace' ? content.substring(selectionStart, selectionEnd) : '';

        setIsModifying(true);
        try {
            const modifiedText = await modifyText(selectedText, prompt, content);
            if (!isMounted.current) return;
            const newContent = action === 'replace'
                ? content.substring(0, selectionStart) + modifiedText + content.substring(selectionEnd)
                : content.substring(0, selectionEnd) + modifiedText + content.substring(selectionEnd);
            onContentChange(newContent);
        } catch(e) {
            addNotification({ type: 'error', title: 'Action Failed', message: e instanceof Error ? e.message : 'Could not modify text.' });
        } finally {
            if (isMounted.current) setIsModifying(false);
        }
    };
    
    const handleToolbarAction = (action: 'bold' | 'italic' | 'h1' | 'h2' | 'list') => {
        if (!textareaRef.current) return;
        const { selectionStart, selectionEnd, value } = textareaRef.current;
        const selectedText = value.substring(selectionStart, selectionEnd);
        let newText = '';

        switch(action) {
            case 'bold': newText = `**${selectedText}**`; break;
            case 'italic': newText = `*${selectedText}*`; break;
            case 'h1': newText = `# ${selectedText}`; break;
            case 'h2': newText = `## ${selectedText}`; break;
            case 'list': newText = selectedText.split('\n').map(line => `- ${line}`).join('\n'); break;
        }

        const newContent = value.substring(0, selectionStart) + newText + value.substring(selectionEnd);
        onContentChange(newContent);
    };

    const handleExport = () => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                    <button onClick={onBackToTemplates} className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white" title="Back to templates"><Icon name="template" className="w-5 h-5" /></button>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white" title="Document Settings"><Icon name="cog" className="w-5 h-5" /></button>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Document Editor</h3>
                <button onClick={onClose} className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white" title="Close Editor"><Icon name="close" className="w-5 h-5" /></button>
            </header>
            <main className="flex-1 relative overflow-hidden">
                {magicMenuPos && <MagicMenu position={magicMenuPos} onClose={() => setMagicMenuPos(null)} onAction={handleAIAction} />}
                <div className="absolute top-4 left-4 z-10">
                    <button onClick={handleMagicWandClick} disabled={isModifying} className="p-2 rounded-full bg-[var(--accent-primary)] text-white shadow-lg hover:bg-[var(--accent-hover)] transition-transform transform hover:scale-110 disabled:bg-slate-500">
                        {isModifying ? <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div> : <Icon name="wand" className="w-5 h-5" />}
                    </button>
                </div>
                <div className="relative w-full h-full">
                    <div className="absolute inset-0 whitespace-pre-wrap break-words p-6 text-base pointer-events-none overflow-hidden font-serif">
                        <span className="text-transparent">{content}</span>
                        <span className="text-slate-500 opacity-70">{prediction}</span>
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleContentChange}
                        onKeyDown={handleKeyDown}
                        onSelect={handleSelect}
                        className="absolute inset-0 w-full h-full bg-transparent text-[var(--text-primary)] focus:outline-none resize-none p-6 text-base font-serif"
                        placeholder="Start writing..."
                    />
                </div>
            </main>
            <footer className="flex-shrink-0 flex items-center justify-between p-2 border-t border-[var(--border-primary)]">
                <div className="text-xs text-[var(--text-secondary)] px-2">
                    <span>{wordCount} words</span>
                    <span className="mx-2">|</span>
                    <span>{charCount} characters</span>
                </div>
                <EditorToolbar onAction={handleToolbarAction} />
                <button onClick={handleExport} className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white" title="Export as Markdown"><Icon name="download" className="w-5 h-5" /></button>
            </footer>
            {isSettingsModalOpen && (
                <DocumentSettingsModal 
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    settings={settings}
                    onSettingsChange={onSettingsChange}
                    chatFocuses={chatFocuses}
                />
            )}
        </>
    );
};


export const DocumentEditorModal: React.FC<DocumentEditorModalProps> = ({
  isOpen,
  onClose,
  content,
  onContentChange,
  settings,
  onSettingsChange,
  chatHistory,
  chatFocuses,
  documentTemplates,
}) => {
  const isDefaultContent = content.startsWith('# New Document');
  const [view, setView] = useState<'template' | 'editor'>(isDefaultContent ? 'template' : 'editor');

  useEffect(() => {
      if (isOpen) {
          const isDefault = content.startsWith('# New Document');
          setView(isDefault ? 'template' : 'editor');
      }
  }, [isOpen, content]);

  const handleTemplateSelect = (templateContent: string) => {
    onContentChange(templateContent || '# \n'); // if blank, provide a starting point
    setView('editor');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-primary)] shadow-2xl w-full max-w-5xl flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ height: 'calc(100vh - 4rem)' }}
      >
        {view === 'template' ? (
          <>
            <header className="flex-shrink-0 flex justify-end p-3 border-b border-[var(--border-primary)]">
                <button onClick={onClose} className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white" title="Close Editor"><Icon name="close" className="w-5 h-5" /></button>
            </header>
            <TemplateSelectorView templates={documentTemplates} onSelect={handleTemplateSelect} />
          </>
        ) : (
          <DocumentEditor
            onClose={onClose}
            content={content}
            onContentChange={onContentChange}
            settings={settings}
            onSettingsChange={onSettingsChange}
            chatHistory={chatHistory}
            chatFocuses={chatFocuses}
            onBackToTemplates={() => setView('template')}
          />
        )}
      </div>
    </div>
  );
};
