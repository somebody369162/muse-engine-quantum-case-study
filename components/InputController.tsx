import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mode, Focus } from '../types';
import type { SavedPrompt, IconName } from '../types';
import { transcribeAudio, getPrediction } from '../services/gemini';
import { Icon } from './Icon';
import { Content } from '@google/genai';
import { useNotifications } from './Notifications';

interface InputControllerProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: (prompt: string, files: File[]) => void;
  isLoading: boolean;
  savedPrompts: SavedPrompt[];
  onDeleteSavedPrompt: (promptId: string) => void;
  isPredictiveTextEnabled: boolean;
  onPredictiveTextChange: (enabled: boolean) => void;
  writingStyle: string;
  onWritingStyleChange: (style: string) => void;
  onOpenDocumentEditor: () => void;
  chatHistory: Content[];
}

export const InputController = React.forwardRef<HTMLTextAreaElement, InputControllerProps>(({ 
  prompt,
  onPromptChange,
  onGenerate, 
  isLoading, 
  savedPrompts,
  onDeleteSavedPrompt,
  isPredictiveTextEnabled,
  onPredictiveTextChange,
  writingStyle,
  onWritingStyleChange,
  onOpenDocumentEditor,
  chatHistory,
}, ref) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isStylePanelOpen, setIsStylePanelOpen] = useState<boolean>(false);
  const [isSavedPromptsPanelOpen, setIsSavedPromptsPanelOpen] = useState<boolean>(false);
  const [prediction, setPrediction] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const predictionTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const internalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sizerRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const isMounted = useRef(false);

  const setRefs = useCallback((element: HTMLTextAreaElement) => {
    internalTextareaRef.current = element;
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref) {
      ref.current = element;
    }
  }, [ref]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Predictive text logic
  useEffect(() => {
    const shouldPredict = isPredictiveTextEnabled && prompt.trim().length > 0 && (prompt.endsWith(' ') || prompt.endsWith('\n'));
    
    if (!shouldPredict) {
        setPrediction('');
        return;
    }

    if (predictionTimeoutRef.current) {
        clearTimeout(predictionTimeoutRef.current);
    }

    predictionTimeoutRef.current = window.setTimeout(async () => {
        // Predictive text in input controller doesn't use focuses from header
        const generatedPrediction = await getPrediction(prompt, chatHistory, [], writingStyle);
        const currentTextarea = internalTextareaRef.current;
        if (currentTextarea && currentTextarea.value === prompt) {
            setPrediction(generatedPrediction);
        }
    }, 500); // 500ms debounce

    return () => {
        if (predictionTimeoutRef.current) {
            clearTimeout(predictionTimeoutRef.current);
        }
    };
  }, [prompt, isPredictiveTextEnabled, chatHistory, writingStyle]);
  
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrediction('');
      if (micError) setMicError(null);
      onPromptChange(e.target.value);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isRecording || isTranscribing) return;
    if (!prompt.trim() && attachments.length === 0) return;

    onGenerate(prompt, attachments);
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && prediction) {
        e.preventDefault();
        onPromptChange(prompt + prediction);
        setPrediction('');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    } else if (prediction) {
      setPrediction('');
    }
  };
  
  const handleUseSavedPrompt = (savedPrompt: SavedPrompt) => {
    onPromptChange(savedPrompt.prompt);
    // Note: This won't change the mode/focus in the header, just fills the prompt.
    // This is intentional to keep UI control separate.
    setIsSavedPromptsPanelOpen(false);
    const currentTextarea = internalTextareaRef.current;
    currentTextarea?.focus();
  };

  const startRecording = async () => {
    setMicError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError('Your browser does not support audio recording.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (isMounted.current) setIsTranscribing(true);
        try {
          const transcribedText = await transcribeAudio(audioBlob);
          if (isMounted.current) {
            onPromptChange(prompt ? `${prompt.trim()} ${transcribedText}` : transcribedText);
          }
        } catch (error) {
          if (isMounted.current) {
            const rawErrorMessage = error instanceof Error ? error.message : "Failed to transcribe audio.";
             if (rawErrorMessage.toLowerCase().includes('permission') || rawErrorMessage.toLowerCase().includes('denied') || rawErrorMessage.toLowerCase().includes('microphone')) {
                setMicError(`Error: ${rawErrorMessage}`);
            } else {
                addNotification({
                    type: 'error',
                    title: 'Transcription Failed',
                    message: 'Could not transcribe the audio. Please check your connection and try again.',
                });
            }
            console.error("Transcription error:", error);
          }
        } finally {
          if (isMounted.current) {
            setIsTranscribing(false);
          }
          stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderRef.current.start();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      let errorMessage = "Could not access microphone. Please ensure permissions are granted.";
      if (error instanceof DOMException) {
        if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Microphone access was denied. Please allow microphone access in your browser or system settings.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'The microphone is currently in use or cannot be read. Please ensure it is not being used by another application and try again.';
        }
      }
      if (isMounted.current) {
        setMicError(errorMessage);
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRecordButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const MAX_FILES = 5;
    const MAX_SIZE_MB = 10;
    const files = e.target.files;
    if (!files) return;

    if (attachments.length + files.length > MAX_FILES) {
        addNotification({ type: 'error', title: 'Too many files', message: `You can only attach up to ${MAX_FILES} files.` });
        e.target.value = '';
        return;
    }

    const newAttachments: File[] = [];
    // FIX: Switched to an indexed for-loop to iterate over the FileList.
    // This resolves a TypeScript type inference issue where `file` was being typed as `unknown`
    // when using `for...of` with `Array.from(files)`.
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            addNotification({ type: 'error', title: 'File too large', message: `File "${file.name}" exceeds the ${MAX_SIZE_MB}MB size limit.` });
            continue;
        }
        newAttachments.push(file);
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const getPlaceholderText = () => {
    if (isLoading) return 'Generating response...';
    if (isRecording) return 'Recording... Click mic to stop.';
    if (isTranscribing) return 'Transcribing... Please wait.';
    return 'Ask a question or enter a prompt...';
  }

  const containerClasses = `bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-secondary)] rounded-2xl border shadow-2xl transition-all duration-300 ease-in-out ${
    isRecording
      ? 'border-red-500/50 ring-4 ring-red-500/20'
      : isTranscribing
      ? 'animate-transcribing-pulse'
      : 'border-[var(--border-primary)]'
  }`;

  return (
    <div className="input-controller-wrapper-padding max-w-4xl mx-auto w-full" data-tour-id="input-controller">
      <div className={containerClasses}>
        {attachments.length > 0 && (
            <div className="p-2.5 flex flex-wrap items-center gap-2 border-b border-[var(--border-primary)]">
                {attachments.map((file, index) => {
                    const isImage = file.type.startsWith('image/');
                    const isCodeOrText = file.type.startsWith('text/') || ['javascript', 'typescript', 'json', 'css', 'html', 'python', 'markdown'].some(lang => file.type.includes(lang) || file.name.endsWith(lang));
                    let iconName: IconName = 'document-text';
                    if (isCodeOrText) iconName = 'code';
                    
                    return (
                        <div key={index} className="relative group bg-[var(--bg-secondary)] p-1.5 rounded-lg flex items-center gap-2 animate-fade-in">
                            {isImage ? (
                                <img src={URL.createObjectURL(file)} alt={file.name} className="w-10 h-10 object-cover rounded" />
                            ) : (
                                <div className="w-10 h-10 bg-[var(--bg-tertiary)] rounded flex items-center justify-center">
                                    <Icon name={iconName} className="w-6 h-6 text-[var(--text-secondary)]" />
                                </div>
                            )}
                            <div className="text-xs max-w-[100px]">
                                <p className="text-[var(--text-primary)] truncate">{file.name}</p>
                                <p className="text-[var(--text-secondary)]">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button onClick={() => handleRemoveAttachment(index)} className="absolute -top-1.5 -right-1.5 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Remove attachment">
                                <Icon name="close" className="w-3.5 h-3.5 text-white" />
                            </button>
                        </div>
                    );
                })}
            </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="flex items-start p-2 gap-4">
             <div className="relative flex-1">
                <div 
                    ref={sizerRef}
                    className="invisible whitespace-pre-wrap break-words text-base p-2.5" 
                    style={{ minHeight: '44px', maxHeight: '200px' }}
                    aria-hidden="true"
                >
                    {prompt + prediction + ' '}
                </div>
                
                <div ref={ghostRef} className="absolute inset-0 whitespace-pre-wrap break-words text-base pointer-events-none p-2.5 overflow-hidden">
                    <span className="text-transparent">{prompt}</span>
                    <span className="text-slate-500 opacity-70">{prediction}</span>
                </div>

                <textarea
                  ref={setRefs}
                  value={prompt}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={getPlaceholderText()}
                  className="absolute inset-0 w-full h-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none resize-none overflow-y-auto text-base p-2.5"
                  rows={1}
                  disabled={isLoading || isRecording || isTranscribing}
                  onScroll={(e) => {
                    if (ghostRef.current) ghostRef.current.scrollTop = e.currentTarget.scrollTop;
                  }}
                />
            </div>
            <button
                type="button"
                onClick={handleRecordButtonClick}
                disabled={isLoading || isTranscribing}
                className={`p-3 rounded-full transition-all duration-300 ease-in-out transform hover:scale-110 active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)] focus:ring-[var(--accent-primary)] ${
                    isRecording 
                    ? 'bg-red-500 text-white animate-recording-pulse' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                } disabled:bg-transparent disabled:text-slate-600 disabled:cursor-not-allowed`}
                title={isRecording ? "Stop recording" : "Transcribe audio"}
                aria-label={isRecording ? "Stop recording" : "Transcribe audio"}
            >
                {isTranscribing ? (
                    <div className="w-6 h-6 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <Icon name="microphone" className="w-6 h-6" />
                )}
            </button>
            <button
              type="submit"
              disabled={isLoading || (!prompt.trim() && attachments.length === 0) || isRecording || isTranscribing}
              className="bg-[var(--accent-primary)] text-white rounded-xl p-3 disabled:bg-slate-600 disabled:cursor-not-allowed hover:bg-[var(--accent-hover)] transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)] focus:ring-[var(--accent-primary)]"
              title="Submit prompt (Enter)"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Icon name="send" className="w-6 h-6" />
              )}
            </button>
          </div>

          <div className="p-2.5 flex flex-wrap items-center gap-2 border-t border-[var(--border-primary)]">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*,text/*,.md,.js,.ts,.tsx,.jsx,.json,.css,.html,.py,.rb,.java,.c,.cpp,.h" className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 transform hover:scale-105 active:scale-95 bg-[var(--bg-tertiary)] hover:bg-opacity-80 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Attach files"
            >
              <Icon name="paperclip" className="w-4 h-4" />
              Attach
              {attachments.length > 0 && (
                <span className="bg-slate-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {attachments.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onPredictiveTextChange(!isPredictiveTextEnabled)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 transform hover:scale-105 active:scale-95 ${
                isPredictiveTextEnabled
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'bg-[var(--bg-tertiary)] hover:bg-opacity-80 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title={isPredictiveTextEnabled ? "Disable predictive text (Press Tab to accept)" : "Enable predictive text"}
            >
              <Icon name="sparkles" className="w-4 h-4" />
              Predictive
            </button>
            <button
              type="button"
              onClick={onOpenDocumentEditor}
              className="px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 transform hover:scale-105 active:scale-95 bg-[var(--bg-tertiary)] hover:bg-opacity-80 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Open document editor"
            >
              <Icon name="edit" className="w-4 h-4" />
              Document
            </button>
            <button
              type="button"
              onClick={() => setIsSavedPromptsPanelOpen(prev => !prev)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 transform hover:scale-105 active:scale-95 ${
                isSavedPromptsPanelOpen
                  ? 'bg-slate-600 text-white'
                  : 'bg-[var(--bg-tertiary)] hover:bg-opacity-80 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Use a saved prompt"
            >
              <Icon name="bookmark" className="w-4 h-4" />
              Saved
              {savedPrompts.length > 0 && (
                <span className="bg-[var(--accent-primary)] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {savedPrompts.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsStylePanelOpen(prev => !prev)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 transform hover:scale-105 active:scale-95 ${
                isStylePanelOpen
                  ? 'bg-slate-600 text-white'
                  : 'bg-[var(--bg-tertiary)] hover:bg-opacity-80 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Set custom writing style for predictive text"
            >
              <Icon name="edit" className="w-4 h-4" />
              Style
            </button>
          </div>
          
          {isSavedPromptsPanelOpen && (
            <div className="p-3 border-t border-[var(--border-primary)] animate-fade-in-down bg-[var(--bg-secondary)] rounded-b-xl max-h-60 overflow-y-auto">
                {savedPrompts.length === 0 ? (
                    <p className="text-center text-xs text-[var(--text-secondary)] py-2">You have no saved prompts in this project.</p>
                ) : (
                    <div className="space-y-2">
                        {savedPrompts.map(savedPrompt => (
                            <div key={savedPrompt.id} className="group flex items-center justify-between gap-2 bg-[var(--bg-tertiary)] p-2 rounded-md">
                                <button
                                    type="button"
                                    onClick={() => handleUseSavedPrompt(savedPrompt)}
                                    className="flex-grow text-left"
                                    title={`Prompt: "${savedPrompt.prompt}"`}
                                >
                                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{savedPrompt.name}</p>
                                    <p className="text-xs text-[var(--text-secondary)] truncate">
                                        Mode: {savedPrompt.mode}
                                        {savedPrompt.focuses.length > 0 && ` | Focuses: ${savedPrompt.focuses.join(', ')}`}
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDeleteSavedPrompt(savedPrompt.id)}
                                    className="p-1.5 rounded-full text-slate-500 hover:bg-red-900/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                    title="Delete saved prompt"
                                >
                                    <Icon name="trash" className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          )}

          {isStylePanelOpen && (
            <div className="p-3 border-t border-[var(--border-primary)] animate-fade-in-down bg-[var(--bg-secondary)] rounded-b-xl space-y-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Custom Writing Style (for predictive text)
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={writingStyle}
                        onChange={(e) => onWritingStyleChange(e.target.value)}
                        placeholder="e.g., formal, professional, gen z"
                        className="flex-1 w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2 text-sm text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                    />
                     <button
                        type="button"
                        onClick={() => onWritingStyleChange('')}
                        className="px-3 py-2 text-xs font-medium rounded-md transition-colors bg-[var(--bg-tertiary)] hover:bg-opacity-80 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Reset to default auto-learning style"
                    >
                        Reset to Auto
                    </button>
                </div>
            </div>
          )}
        </form>
      </div>
       {micError && (
        <p className="text-center text-sm text-red-400 mt-2 animate-fade-in">{micError}</p>
      )}
    </div>
  );
});