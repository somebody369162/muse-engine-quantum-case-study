import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { Mode } from '../types';
import type { VisionResult } from '../types';
import { generateStream } from '../services/gemini';

const VisionResultCard: React.FC<{
  result: VisionResult;
  onAnalyze: (resultId: string, prompt: string) => void;
  onRemove: (resultId: string) => void;
}> = ({ result, onAnalyze, onRemove }) => {
  const [prompt, setPrompt] = useState('');
  const responseEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [result.response]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onAnalyze(result.id, prompt);
    }
  };

  return (
    <div className="bg-[var(--bg-tertiary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-lg shadow-lg p-3 space-y-2 animate-fade-in">
      <div className="flex gap-3">
        <img src={result.imageDataUrl} alt="Screen capture" className="w-24 h-24 object-cover rounded-md border border-[var(--border-primary)]" />
        <div className="flex-1">
          {result.prompt ? (
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1 italic">"{result.prompt}"</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What do you want to know?"
                className="w-full h-16 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-2 text-sm text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none resize-none"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
              />
              <button type="submit" className="w-full mt-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white transition-colors">Analyze Frame</button>
            </form>
          )}
        </div>
      </div>
      {(result.isLoading || result.response) && (
        <div className="p-2 border-t border-[var(--border-primary)]/50">
          <p className="text-sm text-slate-300 prose-custom prose-sm">
            {result.response}
            {result.isLoading && !result.response && <div className="h-4 bg-slate-700 rounded w-3/4 skeleton-loader mt-2"></div>}
            {result.isLoading && <span className="inline-block w-2 h-4 bg-[var(--text-secondary)] animate-pulse ml-1 align-middle rounded-sm"></span>}
          </p>
          <div ref={responseEndRef} />
        </div>
      )}
       <button onClick={() => onRemove(result.id)} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-0.5" title="Remove capture">
          <Icon name="close" className="w-3.5 h-3.5 text-white" />
      </button>
    </div>
  );
};


export const ScreenView: React.FC = () => {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState('default');
  const [visionResults, setVisionResults] = useState<VisionResult[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices.filter(d => d.kind === 'audioinput');
        setAvailableMics(audioInputDevices);
      } catch (err) {
        console.error("Could not get microphone permissions to list devices.", err);
      }
    };
    getDevices();
  }, []);
  
  const stopScreenShare = () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsSharing(false);
    setIsPaused(false);
    setVisionResults([]);
  };

  const startScreenShare = async () => {
    setError(null);
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { deviceId: selectedMicId } as any,
      });
      displayStream.getVideoTracks()[0].addEventListener('ended', stopScreenShare);
      setStream(displayStream);
      setIsSharing(true);
    } catch (err) {
      console.error("Error starting screen share:", err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError("Permission denied. To use Vision mode, please grant permission.");
      } else {
        setError("Could not start screen share. Please ensure your browser supports it.");
      }
    }
  };
  
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    return () => { if(stream) stream.getTracks().forEach(track => track.stop()); };
  }, [stream]);

  const handleTogglePause = () => {
    if (!videoRef.current) return;
    if (isPaused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
    setIsPaused(!isPaused);
  };
  
  const handleCaptureFrame = async () => {
      if (!videoRef.current) return;
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

      const newResult: VisionResult = {
        id: `vision_${Date.now()}`,
        imageDataUrl,
        prompt: '',
        response: '',
        isLoading: false
      };

      setVisionResults(prev => [newResult, ...prev]);
      if(!isPaused) handleTogglePause();
  };

  const handleAnalyzeFrame = async (resultId: string, prompt: string) => {
    setVisionResults(prev => prev.map(r => r.id === resultId ? { ...r, isLoading: true, prompt, response: '' } : r));

    const result = visionResults.find(r => r.id === resultId);
    if (!result) return;

    try {
      const res = await fetch(result.imageDataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      
      const stream = generateStream(prompt, Mode.QUICK, [], undefined, undefined, false, [file]);
      let currentResponse = '';

      for await (const chunk of stream) {
        currentResponse += (chunk.textChunk || '');
        setVisionResults(prev => prev.map(r => r.id === resultId ? { ...r, response: currentResponse } : r));
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "An unknown error occurred.";
      setVisionResults(prev => prev.map(r => r.id === resultId ? { ...r, response: `Error: ${message}` } : r));
    } finally {
      setVisionResults(prev => prev.map(r => r.id === resultId ? { ...r, isLoading: false } : r));
    }
  };

  const handleRemoveResult = (resultId: string) => {
    setVisionResults(prev => prev.filter(r => r.id !== resultId));
  }
  
  if (!isSharing) {
    return (
       <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-secondary)]">
        <div className="max-w-md p-8">
            <Icon name="eye" className="w-20 h-20 mx-auto mb-6 text-slate-700" />
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Vision Mode</h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">Share your screen to capture frames and get contextual assistance from the AI.</p>
            <div className="mt-8 bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-primary)]">
                <label htmlFor="mic-select" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Microphone (for future use)</label>
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
                <button
                    onClick={startScreenShare}
                    className="mt-4 w-full px-8 py-3 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors text-lg flex items-center justify-center gap-3 mx-auto"
                >
                    <Icon name="eye" className="w-5 h-5" />
                    Share Screen
                </button>
            </div>
             {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-contain transition-all duration-300 ${isPaused ? 'filter brightness-50' : ''}`} />

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[var(--bg-secondary)]/80 backdrop-blur-md border border-[var(--border-primary)] p-2 rounded-full shadow-2xl">
            <button onClick={handleTogglePause} className="p-3 rounded-full text-white hover:bg-white/20 transition-colors" title={isPaused ? "Resume" : "Pause"}>
                <Icon name={isPaused ? 'play-circle' : 'pause-circle'} className="w-7 h-7" />
            </button>
            <button onClick={handleCaptureFrame} className="p-4 rounded-full text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] transition-colors" title="Capture Frame">
                <Icon name="camera" className="w-7 h-7" />
            </button>
            <button onClick={stopScreenShare} className="p-3 rounded-full text-white bg-red-600 hover:bg-red-700 transition-colors" title="Stop Sharing">
                <Icon name="stop" className="w-7 h-7" />
            </button>
        </div>

        {visionResults.length > 0 && (
            <div className="absolute top-4 right-4 w-full max-w-sm h-[calc(100%-2rem)]">
                <div className="h-full overflow-y-auto space-y-3 pr-2">
                    {visionResults.map(result => (
                        <VisionResultCard key={result.id} result={result} onAnalyze={handleAnalyzeFrame} onRemove={handleRemoveResult}/>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};