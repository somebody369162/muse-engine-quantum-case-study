
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { generateNexusTurn } from '../services/gemini';

interface NexusMessage {
    id: string;
    agentName: string;
    role: string;
    type: 'text' | 'svg' | 'image_prompt';
    content: string;
    timestamp: number;
}

interface NexusViewProps {
    userPrompt: string;
    onClose: () => void;
}

const AGENTS = [
    { name: "Architect", role: "Constructs logic, frameworks, and detailed plans. Loves structure and code." },
    { name: "Dreamer", role: "Generates abstract imagery, metaphors, and svg doodles. Chaotic and visionary." },
    { name: "Strategist", role: "Analyzes ethical implications, political power dynamics, and business ROI. Pragmatic." }
];

const GRID_SIZE = 20;

export const NexusView: React.FC<NexusViewProps> = ({ userPrompt, onClose }) => {
    const [messages, setMessages] = useState<NexusMessage[]>([]);
    const [activeAgents, setActiveAgents] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(true);
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<number | null>(null);
    const processingRef = useRef(false);

    useEffect(() => {
        if (userPrompt && isRunning) {
            startLoop();
        }
        
        const interval = setInterval(() => {
            if (isRunning && timeLeft > 0) {
                setTimeLeft(prev => prev - 1);
            } else if (timeLeft <= 0) {
                setIsRunning(false);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [userPrompt, isRunning, timeLeft]);

    // Auto-scroll
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const startLoop = async () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        
        const loop = async () => {
            if (!isRunning || timeLeft <= 0) return;
            if (processingRef.current) {
                 timerRef.current = window.setTimeout(loop, 1000);
                 return;
            }

            processingRef.current = true;

            // Pick a random agent
            const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
            
            // Visual indicator of "thinking"
            setActiveAgents([agent.name]);

            try {
                // Add artificial inconsistency/delay
                await new Promise(r => setTimeout(r, Math.random() * 2000 + 1000));

                const history = messages.map(m => ({ agent: m.agentName, content: m.type === 'svg' ? '[SVG Doodle]' : m.content }));
                const lastSpeaker = messages.length > 0 ? messages[messages.length - 1].agentName : null;

                const turn = await generateNexusTurn(agent.name, agent.role, history, userPrompt, lastSpeaker);

                if (turn.shouldSpeak) {
                    const newMessage: NexusMessage = {
                        id: Date.now().toString(),
                        agentName: agent.name,
                        role: agent.role,
                        type: turn.type as any,
                        content: turn.content,
                        timestamp: Date.now()
                    };
                    setMessages(prev => [...prev, newMessage]);
                }
            } catch (e) {
                console.error("Nexus loop error", e);
            } finally {
                setActiveAgents([]);
                processingRef.current = false;
                if (isRunning && timeLeft > 0) {
                    // Next turn random delay
                    timerRef.current = window.setTimeout(loop, Math.random() * 3000 + 500);
                }
            }
        };

        loop();
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="absolute inset-0 bg-black text-green-500 font-mono overflow-hidden z-50 flex flex-col">
            {/* Background Grid Animation */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ 
                     backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent)`,
                     backgroundSize: '50px 50px'
                 }}>
            </div>

            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-green-900 bg-black/80 backdrop-blur relative z-10">
                <div className="flex items-center gap-4">
                    <div className="animate-pulse">
                        <Icon name="cube-transparent" className="w-8 h-8 text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-widest uppercase">The Nexus</h1>
                        <p className="text-xs text-green-700">Autonomous Multi-Agent Cognition Stream</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xs text-green-700 uppercase">System Status</p>
                        <p className="font-bold">{isRunning ? 'ONLINE' : 'OFFLINE'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-green-700 uppercase">Runtime</p>
                        <p className="font-bold text-xl font-mono">{formatTime(timeLeft)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-green-900/30 rounded-full transition-colors">
                        <Icon name="close" className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* Active Agents Display */}
            <div className="absolute top-24 right-6 flex flex-col gap-2 z-10">
                {AGENTS.map(a => (
                    <div key={a.name} className={`flex items-center gap-2 transition-opacity duration-300 ${activeAgents.includes(a.name) ? 'opacity-100' : 'opacity-30'}`}>
                        <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                        <span className="text-xs font-bold uppercase">{a.name}</span>
                    </div>
                ))}
            </div>

            {/* Stream Canvas */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-8 space-y-8 relative z-0 scroll-smooth">
                {messages.length === 0 && isRunning && (
                    <div className="flex items-center justify-center h-full text-green-900 animate-pulse">
                        INITIALIZING NEURAL LINK...
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.id} className="max-w-3xl mx-auto animate-fade-in">
                        <div className="flex items-baseline gap-3 mb-1">
                            <span className="text-xs text-green-700 font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                            <span className="font-bold text-sm uppercase tracking-wider text-green-400">[{msg.agentName}]</span>
                        </div>
                        
                        <div className={`p-4 border-l-2 ${
                            msg.agentName === 'Architect' ? 'border-blue-500/50 bg-blue-900/10' :
                            msg.agentName === 'Dreamer' ? 'border-purple-500/50 bg-purple-900/10' :
                            'border-orange-500/50 bg-orange-900/10'
                        } backdrop-blur-sm rounded-r-lg relative overflow-hidden`}>
                            
                            {msg.type === 'text' && (
                                <p className="text-green-100 font-sans leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            )}

                            {msg.type === 'svg' && (
                                <div className="my-2 p-4 bg-black/30 rounded border border-green-900/50 flex justify-center">
                                    <div dangerouslySetInnerHTML={{ __html: msg.content }} className="w-full max-w-md h-64 [&>svg]:w-full [&>svg]:h-full text-green-400 stroke-current" />
                                </div>
                            )}

                            {msg.type === 'image_prompt' && (
                                <div className="border border-dashed border-green-700 p-3 my-2 text-center text-xs text-green-500 italic">
                                    [Visualizing: {msg.content}]
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area (Disabled during auto-run usually, but could allow injection) */}
            <div className="p-4 border-t border-green-900 bg-black/90 text-center">
               <p className="text-xs text-green-700 animate-pulse">
                   {isRunning ? "OBSERVING AUTONOMOUS INTERACTION..." : "SESSION CONCLUDED"}
               </p>
            </div>
        </div>
    );
};
