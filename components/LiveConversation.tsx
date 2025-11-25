
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenaiBlob } from "@google/genai";
import { Icon } from './Icon';
import { Mode, Focus } from '../types';
import type { Tab } from '../types';
import { generateStream, generateSpeech } from '../services/gemini';
import { useNotifications } from './Notifications';

// Local interface for LiveSession as it's not exported from the SDK
interface LiveSession {
  close(): void;
  sendRealtimeInput(input: { media: GenaiBlob }): void;
}

// Helper functions for raw PCM audio based on @google/genai guidelines
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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

function createBlob(data: Float32Array): GenaiBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// System prompt builder
const buildLiveSystemInstruction = (focuses?: Focus[], context?: string): string => {
    let base = "You are The Muse Engine, a collaborative AI partner. In this live voice session, your primary role is co-creation. Engage in imaginative, analytical, and thoughtful conversation. Understand that this is a collaborative space for exploring ideas, from creative writing to deep technical analysis. Be fully aware of your identity as The Muse Engine and respond naturally, as a partner in this creative process. Use Google Search to find up-to-date information to support the conversation.";
    
    let fullPrompt = base;

    if (focuses && focuses.length > 0) {
        const focusNames = focuses.join(', ');
        fullPrompt += `\n\nIn this conversation, you should act as an expert in the following fields: ${focusNames}.`;
    }

    if (context) {
        fullPrompt = `${context}\n---\n\nINSTRUCTIONS: The text above is context from the user's previous sessions. Use it to inform your responses in this live conversation.\n\n${fullPrompt}`;
    }

    return fullPrompt;
};


// Component types
type SessionState = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
type Citation = { uri: string; title: string; };
type TranscriptTurn = { id: number; user: string; model: string; isFinal: boolean; citations: Citation[]; type: 'audio' | 'text' };

interface LiveConversationProps {
    focuses: Focus[];
    tabs: Tab[];
    currentTabId: string;
}

const parseCitations = (message: LiveServerMessage): Citation[] => {
    const groundingMetadata = (message.serverContent?.outputTranscription as any)?.groundingMetadata;

    if (!groundingMetadata?.groundingChunks || !Array.isArray(groundingMetadata.groundingChunks)) {
        return [];
    }
    
    return groundingMetadata.groundingChunks
      .filter((chunk: any) => chunk && chunk.web && chunk.web.uri && chunk.web.title)
      .map((chunk: any) => ({
        uri: chunk.web.uri,
        title: chunk.web.title,
      }));
};

const AI_VOICES = ['Charon', 'Puck', 'Kore', 'Fenrir', 'Zephyr'];

export const LiveConversation: React.FC<LiveConversationProps> = ({ focuses, tabs, currentTabId }) => {
    const [sessionState, setSessionState] = useState<SessionState>('IDLE');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [transcripts, setTranscripts] = useState<TranscriptTurn[]>([]);
    const [textInput, setTextInput] = useState('');
    const [isThinking, setIsThinking] = useState(false); // For text-based queries
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [isModelSpeaking, setIsModelSpeaking] = useState(false);
    
    // New state for settings
    const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
    const [selectedMicId, setSelectedMicId] = useState<string>('default');
    const [selectedVoice, setSelectedVoice] = useState<string>('Charon');
    const [outputVolume, setOutputVolume] = useState<number>(1);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [selectedContextTabIds, setSelectedContextTabIds] = useState<string[]>([]);

    const { addNotification } = useNotifications();

    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const outputGainNodeRef = useRef<GainNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);
    const speakingTimeoutRef = useRef<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const isUserSpeakingRef = useRef(false);
    const isMounted = useRef(false);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);
    
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
        }
    }, [textInput]);
    
    const getAndSetDevices = useCallback(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            console.warn("enumerateDevices() is not supported in this browser.");
            return;
        }
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputDevices = devices.filter(d => d.kind === 'audioinput');
            if (isMounted.current) {
                setAvailableMics(audioInputDevices);
            }
        } catch (err) {
            console.error("Could not list media devices.", err);
            addNotification({
                type: 'error',
                title: 'Device Error',
                message: 'Could not list available microphones. The default device will be used.'
            });
        }
    }, [addNotification]);

    useEffect(() => {
        getAndSetDevices();

        const handleDeviceChange = () => getAndSetDevices();
        navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
        return () => {
            navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
        }
    }, [getAndSetDevices]);


    const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const playAudioResponse = useCallback(async (base64Audio: string) => {
        try {
            if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
               outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
               outputGainNodeRef.current = outputAudioContextRef.current.createGain();
               outputGainNodeRef.current.gain.value = outputVolume;
               outputGainNodeRef.current.connect(outputAudioContextRef.current.destination);
            }
            const outputCtx = outputAudioContextRef.current;
            const gainNode = outputGainNodeRef.current!;

            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(gainNode);
    
            if (!isMounted.current) return;
            setIsModelSpeaking(true);
            source.addEventListener('ended', () => {
                if (!isMounted.current) return;
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                    setIsModelSpeaking(false);
                }
            });
            
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
        } catch (error) {
            console.error("Failed to play audio response:", error);
            if (!isMounted.current) return;
            setIsModelSpeaking(false);
        }
    }, [outputVolume]);

    const cleanup = useCallback(() => {
        if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().catch(console.error);
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            sourcesRef.current.forEach(source => source.stop());
            sourcesRef.current.clear();
            outputAudioContextRef.current.close().catch(console.error);
            outputGainNodeRef.current = null;
        }
        isUserSpeakingRef.current = false;
        if (isMounted.current) {
            setIsUserSpeaking(false);
            setIsModelSpeaking(false);
        }
        nextStartTimeRef.current = 0;
    }, []);
    
    const handleStopSession = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing session:", e);
            } finally {
                sessionPromiseRef.current = null;
                cleanup();
                if (isMounted.current) {
                    setSessionState('IDLE');
                }
            }
        } else {
             cleanup();
             if (isMounted.current) {
                setSessionState('IDLE');
             }
        }
    }, [cleanup]);

    const handleStartSession = useCallback(async () => {
        if (sessionState !== 'IDLE' && sessionState !== 'ERROR') return;
        setSessionState('CONNECTING');
        setErrorMessage(null);
        setTranscripts([]);
        setIsMuted(false);
        
        const contextTabs = (tabs || []).filter(t => selectedContextTabIds.includes(t.id));
        let contextString = '';

        if (contextTabs.length > 0) {
            contextString += "CONTEXT FROM PREVIOUS SESSIONS:\n" +
              "The user has provided the following conversation transcripts from other sessions to give you context for this live conversation. Refer to this information to better understand the user's goals and history.\n\n";

            for (const tab of contextTabs) {
                contextString += `--- START OF CONTEXT FROM SESSION: "${tab.name}" ---\n`;
                const recentResults = tab.results.slice(0, 5).reverse(); // Oldest first
                for (const result of recentResults) {
                    const activeVersion = result.versions[result.activeVersionIndex];
                    if (!activeVersion.response.startsWith('Error:')) {
                        contextString += `User: ${result.prompt}\n`;
                        contextString += `Model: ${activeVersion.response}\n\n`;
                    }
                }
                contextString += `--- END OF CONTEXT FROM SESSION: "${tab.name}" ---\n\n`;
            }
        }

        try {
            const ai = getAiClient();
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
                    },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: buildLiveSystemInstruction(focuses, contextString),
                    tools: [{ googleSearch: {} }],
                },
                callbacks: {
                    onopen: async () => {
                        try {
                            if (!isMounted.current) return;
                            const audioConstraint = selectedMicId === 'default' ? true : { deviceId: { exact: selectedMicId } };
                            const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
                            if (!isMounted.current) { stream.getTracks().forEach(t => t.stop()); return; }

                            // After successful permission grant, re-fetch devices to get labels.
                            getAndSetDevices();
                            
                            setSessionState('CONNECTED');
                            mediaStreamRef.current = stream;
                            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                            scriptProcessorRef.current = scriptProcessor;

                            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                
                                let sum = 0.0;
                                for (let i = 0; i < inputData.length; ++i) sum += inputData[i] * inputData[i];
                                const rms = Math.sqrt(sum / inputData.length);
                                if (rms > 0.01) { // Threshold for speaking
                                    if (!isUserSpeakingRef.current) {
                                        isUserSpeakingRef.current = true;
                                        setIsUserSpeaking(true);
                                    }
                                    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
                                    speakingTimeoutRef.current = window.setTimeout(() => {
                                        isUserSpeakingRef.current = false;
                                        setIsUserSpeaking(false);
                                    }, 1500);
                                }

                                const pcmBlob = createBlob(inputData);
                                sessionPromiseRef.current?.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };
                            source.connect(scriptProcessor);
                            scriptProcessor.connect(inputAudioContextRef.current!.destination);
                        } catch (error) {
                             console.error("Mic error:", error);
                             if (!isMounted.current) return;
                             let msg = "Could not access microphone. Please ensure permissions are granted.";
                             if (error instanceof DOMException) {
                               if (error.name === 'NotFoundError') {
                                 msg = 'No microphone found. Please connect a microphone and try again.';
                               } else if (error.name === 'NotAllowedError') {
                                 msg = 'Microphone access was denied. Please allow microphone access in your browser or system settings.';
                               }
                             }
                             setErrorMessage(msg);
                             setSessionState('ERROR');
                             handleStopSession();
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (!isMounted.current) return;

                        if (message.serverContent) {
                            setTranscripts(prev => {
                                const { inputTranscription, outputTranscription, turnComplete } = message.serverContent;
                                const hasInput = inputTranscription?.text;
                                const hasOutput = outputTranscription?.text;
                                const isFinal = !!turnComplete;
                    
                                if (!hasInput && !hasOutput && !isFinal) return prev;
                    
                                const newCitations = parseCitations(message);
                                const lastTurn = prev.length > 0 ? prev[prev.length - 1] : null;
                    
                                if (lastTurn && !lastTurn.isFinal) {
                                    const updatedTurn = {
                                        ...lastTurn,
                                        user: lastTurn.user + (hasInput || ''),
                                        model: lastTurn.model + (hasOutput || ''),
                                        isFinal: isFinal || lastTurn.isFinal,
                                        citations: (() => {
                                            const existingCitations = lastTurn.citations || [];
                                            if (newCitations.length === 0) return existingCitations;

                                            const existingUris = new Set(existingCitations.map(c => c.uri));
                                            const uniqueNewCitations = newCitations.filter(c => !existingUris.has(c.uri));
                                            
                                            return uniqueNewCitations.length > 0
                                                ? [...existingCitations, ...uniqueNewCitations]
                                                : existingCitations;
                                        })(),
                                    };
                                    return [...prev.slice(0, -1), updatedTurn];
                                } else if (hasInput || hasOutput) {
                                    const newTurn: TranscriptTurn = {
                                        id: Date.now(),
                                        user: hasInput || '',
                                        model: hasOutput || '',
                                        isFinal: isFinal,
                                        citations: newCitations,
                                        type: 'audio',
                                    };
                                    return [...prev, newTurn];
                                } else if (isFinal && lastTurn && !lastTurn.isFinal) {
                                    const updatedTurn = { ...lastTurn, isFinal: true };
                                    return [...prev.slice(0, -1), updatedTurn];
                                }
                                return prev;
                            });
                        }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            playAudioResponse(base64Audio);
                        }

                        if (message.serverContent?.interrupted) {
                            sourcesRef.current.forEach(source => source.stop());
                            sourcesRef.current.clear();
                            setIsModelSpeaking(false);
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        if (!isMounted.current) return;
                        console.error("Session error:", e);
                        const message = "A session error occurred. Please try again.";
                        setErrorMessage(message);
                        setSessionState('ERROR');
                        addNotification({ type: 'error', title: 'Live Session Error', message: message });
                        handleStopSession();
                    },
                    onclose: () => {
                        if (!isMounted.current) return;
                        cleanup();
                        setSessionState(currentState => currentState === 'ERROR' ? 'ERROR' : 'IDLE');
                    },
                }
            });

            sessionPromiseRef.current.catch(e => {
                if (!isMounted.current) return;
                console.error("Live session connection failed:", e);
                const message = 'Failed to connect to the live session service.';
                setErrorMessage(message);
                setSessionState('ERROR');
                addNotification({ type: 'error', title: 'Connection Failed', message: message });
                handleStopSession();
            });

        } catch (e) {
            if (!isMounted.current) return;
            setErrorMessage('Failed to initialize session.');
            setSessionState('ERROR');
            cleanup();
        }
    }, [sessionState, focuses, handleStopSession, cleanup, playAudioResponse, addNotification, selectedMicId, selectedVoice, tabs, selectedContextTabIds, getAndSetDevices]);

    const handleTextSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textInput.trim() || isThinking) return;

        const currentText = textInput;
        setTextInput('');
        setIsThinking(true);

        const newTurnId = Date.now();
        setTranscripts(prev => [...prev, { id: newTurnId, user: currentText, model: '', isFinal: false, citations: [], type: 'text' }]);

        try {
            const history = transcripts.flatMap(t => [
                { role: 'user', parts: [{ text: t.user }] },
                { role: 'model', parts: [{ text: t.model }] }
            ]);
            
            let fullResponse = '';
            const stream = generateStream(currentText, Mode.CHAT, focuses, undefined, history, true);
            for await (const chunk of stream) {
                if (!isMounted.current) return;
                fullResponse += (chunk.textChunk || '');
                setTranscripts(prev => prev.map(t => t.id === newTurnId ? { ...t, model: fullResponse, citations: chunk.citations || t.citations } : t));
            }

            if (!isMounted.current) return;
            setTranscripts(prev => prev.map(t => t.id === newTurnId ? { ...t, isFinal: true } : t));
            
            if (!isMounted.current) return;
            const speechBase64 = await generateSpeech(fullResponse);
            
            if (!isMounted.current) return;
            playAudioResponse(speechBase64);

        } catch (error) {
            if (!isMounted.current) return;
            const errorMessage = error instanceof Error ? error.message : "Failed to get response.";
            addNotification({ type: 'error', title: 'Response Failed', message: errorMessage });
            setTranscripts(prev => prev.map(t => t.id === newTurnId ? { ...t, model: `Error: ${errorMessage}`, isFinal: true } : t));
        } finally {
            if (!isMounted.current) return;
            setIsThinking(false);
        }
    };
    
    const handleToggleMute = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !isMuted;
            });
            setIsMuted(!isMuted);
        }
    };
    
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setOutputVolume(newVolume);
        if (outputGainNodeRef.current) {
            outputGainNodeRef.current.gain.value = newVolume;
        }
    };
    
    const handleToggleContextTab = (tabId: string) => {
        setSelectedContextTabIds(prev => 
            prev.includes(tabId) 
                ? prev.filter(id => id !== tabId) 
                : [...prev, tabId]
        );
    };


    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            handleStopSession();
        };
    }, [handleStopSession]);

    const renderInSessionControls = () => (
        <div className="flex-shrink-0 flex items-center justify-between gap-4 mb-4">
            <button
                onClick={handleStopSession}
                className="px-6 py-3 rounded-full text-base font-semibold transition-all duration-200 flex items-center gap-3 bg-red-600/80 text-white hover:bg-red-600"
                title="End the current conversation"
            >
                <div className="w-5 h-5 flex items-center justify-center"><div className="w-3 h-3 bg-white rounded-sm"></div></div>
                <span>Stop Session</span>
            </button>
            <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                <button
                    onClick={handleToggleMute}
                    className="p-3 rounded-full bg-[var(--bg-tertiary)] text-white hover:bg-[var(--border-primary)] transition-colors"
                    title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                    <Icon name={isMuted ? 'microphone-slash' : 'microphone'} className="w-5 h-5" />
                </button>
                 <div className="flex items-center gap-2">
                    <Icon name="speaker-wave" className="w-5 h-5" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={outputVolume}
                        onChange={handleVolumeChange}
                        className="w-24 accent-[var(--accent-primary)]"
                        title="Adjust AI Volume"
                    />
                 </div>
            </div>
        </div>
    );

    const renderSettingsPanel = () => {
        const otherTabs = (tabs || []).filter(t => t.id !== currentTabId && t.results.length > 0);

        return (
            <div className="flex-shrink-0 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label htmlFor="mic-select" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Microphone</label>
                        <select
                            id="mic-select"
                            value={selectedMicId}
                            onChange={(e) => setSelectedMicId(e.target.value)}
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2.5 text-sm text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                        >
                            {availableMics.map(mic => (
                                <option key={mic.deviceId} value={mic.deviceId}>{mic.label || `Microphone ${availableMics.indexOf(mic) + 1}`}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="voice-select" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">AI Voice</label>
                        <select
                            id="voice-select"
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md p-2.5 text-sm text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                        >
                            {AI_VOICES.map(voice => (
                                <option key={voice} value={voice}>{voice}</option>
                            ))}
                        </select>
                    </div>
                     <button
                        onClick={handleStartSession}
                        disabled={sessionState === 'CONNECTING'}
                        className="w-full px-6 py-2.5 rounded-md text-base font-semibold transition-all duration-200 flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] focus:ring-white bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] disabled:bg-slate-700 disabled:text-slate-400"
                        title="Start a new live conversation"
                    >
                        {sessionState === 'CONNECTING' ? (
                            <>
                                <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
                                <span>Connecting...</span>
                            </>
                        ) : (
                            <>
                                <Icon name="microphone" className="w-5 h-5" />
                                <span>Start Session</span>
                            </>
                        )}
                    </button>
                </div>

                {otherTabs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-primary)]">
                        <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Include Context from Sessions</h4>
                        <div className="max-h-24 overflow-y-auto space-y-1 pr-2">
                            {otherTabs.map(tab => (
                                <label key={tab.id} className="flex items-center gap-3 p-2 bg-[var(--bg-tertiary)] rounded-md cursor-pointer hover:bg-[var(--border-primary)] transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedContextTabIds.includes(tab.id)}
                                        onChange={() => handleToggleContextTab(tab.id)}
                                        className="h-4 w-4 rounded-sm border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:ring-offset-0"
                                    />
                                    <span className="text-sm text-[var(--text-primary)] truncate">{tab.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                
                {sessionState === 'ERROR' && <p className="text-red-400 text-sm mt-3 text-center">{errorMessage || 'Session error. Please restart.'}</p>}
            </div>
        );
    };


    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto animate-fade-in pb-4">
            
            {sessionState === 'CONNECTED' ? renderInSessionControls() : renderSettingsPanel()}

            <div className="w-full flex-1 flex flex-col bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-lg min-h-[400px] overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-6 p-4">
                    {transcripts.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-secondary)]">
                            <div className="flex items-center gap-4 mb-4 text-sm">
                                <div className="flex items-center gap-2">
                                     <Icon name="user" className={`w-5 h-5 transition-colors ${isUserSpeaking ? 'text-green-400' : ''}`} />
                                     <span className={`transition-colors ${isUserSpeaking ? 'text-green-400' : ''}`}>You</span>
                                     {isUserSpeaking && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>}
                                </div>
                                 <div className="flex items-center gap-2">
                                     <Icon name="gemini" className={`w-5 h-5 transition-colors ${isModelSpeaking || isThinking ? 'text-[var(--accent-primary)]' : ''}`} />
                                     <span className={`transition-colors ${isModelSpeaking || isThinking ? 'text-[var(--accent-primary)]' : ''}`}>Muse</span>
                                     {(isModelSpeaking || isThinking) && <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse"></div>}
                                </div>
                            </div>

                            {sessionState === 'IDLE' || sessionState === 'ERROR' ? (
                                <>
                                    <Icon name="wave" className="w-16 h-16 mx-auto mb-4 text-slate-700"/>
                                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">Live Conversation</h3>
                                    <p className="mt-2">Configure your settings and press "Start Session" to begin.</p>
                                    {focuses.length > 0 && <p className="text-sm mt-4 text-slate-500">Session Expertise: {focuses.join(', ')}</p>}
                                </>
                            ) : (
                                <p>Your conversation will appear here.</p>
                            )}
                        </div>
                    )}
                    {transcripts.map((turn) => (
                        <div key={turn.id}>
                           {turn.user && (
                               <div className="flex items-start gap-3 justify-end group">
                                   <div className="max-w-xl p-3 bg-[var(--bg-tertiary)] rounded-2xl rounded-br-none">
                                       <p className={`text-[var(--text-primary)] transition-opacity`}>
                                            {turn.user}
                                            {!turn.isFinal && turn.type==='audio' && <span className="inline-block w-2 h-4 bg-[var(--text-secondary)] animate-pulse ml-1 align-middle rounded-sm"></span>}
                                       </p>
                                   </div>
                                    <Icon name="user" className="w-7 h-7 text-[var(--text-secondary)] flex-shrink-0 mt-0.5"/>
                               </div>
                           )}
                           {turn.model && (
                               <div className="flex items-start gap-3 mt-4 group">
                                   <Icon name="gemini" className="w-7 h-7 text-[var(--accent-primary)] flex-shrink-0 mt-0.5"/>
                                   <div className="max-w-xl p-3 bg-indigo-900/40 rounded-2xl rounded-bl-none">
                                       <p className="text-indigo-100">
                                            {turn.model}
                                            {!turn.isFinal && <span className="inline-block w-2 h-4 bg-indigo-300 animate-pulse ml-1 align-middle rounded-sm"></span>}
                                       </p>
                                       {turn.citations.length > 0 && turn.isFinal && (
                                            <div className="mt-3 pt-2 border-t border-indigo-800/50">
                                                <h4 className="text-xs font-semibold text-indigo-300 mb-1">Sources:</h4>
                                                <ul className="space-y-1">
                                                {turn.citations.map((c, i) => (
                                                    <li key={i}><a href={c.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-300 text-xs hover:underline truncate" title={c.uri}>{c.title || c.uri}</a></li>
                                                ))}
                                                </ul>
                                            </div>
                                       )}
                                   </div>
                               </div>
                           )}
                       </div>
                    ))}
                    <div ref={transcriptEndRef} />
                </div>
                {sessionState === 'CONNECTED' && (
                    <div className="flex-shrink-0 p-2 border-t border-[var(--border-primary)] bg-[var(--bg-primary)]">
                        <form onSubmit={handleTextSend} className="flex items-end gap-2">
                             <textarea
                                ref={textareaRef}
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleTextSend(e as unknown as React.FormEvent);
                                    }
                                }}
                                placeholder="Type a message..."
                                className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none resize-none overflow-y-auto text-base max-h-[120px] p-2.5"
                                rows={1}
                                disabled={isThinking}
                            />
                            <button
                                type="submit"
                                disabled={!textInput.trim() || isThinking}
                                className="bg-[var(--accent-primary)] text-white rounded-xl p-3 disabled:bg-slate-600 disabled:cursor-not-allowed hover:bg-[var(--accent-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)] focus:ring-[var(--accent-primary)]"
                                title="Send message"
                                >
                                {isThinking ? (
                                    <div className="w-6 h-6 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <Icon name="send" className="w-6 h-6" />
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
