import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from '../primitives/GlassCard';
import { apiClient } from '../../api/client';

interface ChatInterfaceProps {
    sessionId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId }) => {
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
        { role: 'ai', text: 'Hello! I have analyzed your data. Ask me about trends, outliers, or specific columns.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !sessionId) return;

        const userText = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setLoading(true);

        try {
            const res = await apiClient.chat(sessionId, userText);
            setMessages(prev => [...prev, { role: 'ai', text: res.response }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Connection lost. Please re-upload file.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <GlassCard className="flex flex-col h-[600px] w-full border-indigo-500/30 !bg-gray-900/60">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 bg-indigo-900/20 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                    🤖 AI Analyst <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Online</span>
                </h3>
                <span className="text-xs text-gray-500">Session: {sessionId.slice(0, 4)}...</span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg ${m.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-none'
                            }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-800 rounded-2xl p-4 rounded-bl-none border border-gray-700 flex gap-1">
                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75" />
                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150" />
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-700 bg-gray-900/80 backdrop-blur-md">
                <div className="flex gap-2 relative">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask a question about your data..."
                        className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                        <span className="text-xl">➤</span>
                    </button>
                </div>
            </div>
        </GlassCard>
    );
};
