import React from 'react';
import { GlassCard } from '../primitives/GlassCard';

interface AiSummaryProps {
    data: {
        title: string;
        summary: string[];
    }
}

export const AiSummary: React.FC<AiSummaryProps> = ({ data }) => {
    if (!data) return null;

    return (
        <GlassCard className="mb-8 border-indigo-500/50 bg-indigo-900/10 relative overflow-hidden">
            {/* Decorative AI Glow */}
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-[60px]" />

            <div className="relative z-10 flex gap-6 items-start">
                {/* Animated Icon */}
                <div className="flex-shrink-0 mt-1">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <span className="text-2xl animate-pulse">✨</span>
                    </div>
                </div>

                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">{data.title}</h3>
                    <ul className="space-y-2">
                        {data.summary.map((point, i) => (
                            <li key={i} className="flex gap-2 text-indigo-100 text-sm leading-relaxed">
                                <span className="text-indigo-400 font-bold">•</span>
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </GlassCard>
    );
};
