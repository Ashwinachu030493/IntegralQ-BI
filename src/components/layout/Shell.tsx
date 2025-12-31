import React from 'react';
// import { cn } from "../../lib/utils"; // <--- REMOVE THIS LINE

interface ShellProps {
    children: React.ReactNode;
    state?: string; // Kept for backward compat if needed, but we rely on currentView now
    user: { name: string; role: string };
    currentView: 'dashboard' | 'knowledge';
    onNavigate: (view: 'dashboard' | 'knowledge') => void;
}

export const Shell = ({ children, user, currentView, onNavigate }: ShellProps) => {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#0B0F19] text-white">
            {/* Sidebar */}
            <aside className="w-64 border-r border-gray-800 bg-[#111827] flex flex-col p-4">
                <div className="mb-8 flex items-center gap-3 px-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 font-bold">Q</div>
                    <span className="font-bold tracking-tight">IntegralQ</span>
                </div>

                {/* User Info */}
                <div className="px-2 mb-6">
                    <div className="text-sm font-medium text-white">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.role}</div>
                </div>

                <nav className="space-y-1">
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className={`flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${currentView === 'dashboard'
                                ? 'bg-indigo-500/10 text-indigo-400'
                                : 'text-gray-400 hover:bg-gray-800'
                            }`}
                    >
                        📊 Overview
                    </button>
                    <button
                        onClick={() => onNavigate('knowledge')}
                        className={`flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${currentView === 'knowledge'
                                ? 'bg-indigo-500/10 text-indigo-400'
                                : 'text-gray-400 hover:bg-gray-800'
                            }`}
                    >
                        📚 Knowledge Base
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative">
                <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] pointer-events-none" />
                <div className="relative z-10 p-8 h-full">
                    {children}
                </div>
            </main>
        </div>
    );
};
