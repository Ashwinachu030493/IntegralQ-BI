import React from 'react';
import { cn } from "../../lib/utils";

interface ShellProps {
    children: React.ReactNode;
    state: string;
}

export const Shell = ({ children, state }: ShellProps) => {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#0B0F19] text-white">
            {/* Sidebar - Only show in Dashboard mode */}
            {state === 'DASHBOARD' && (
                <aside className="w-64 border-r border-gray-800 bg-[#111827] flex flex-col p-4">
                    <div className="mb-8 flex items-center gap-3 px-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 font-bold">Q</div>
                        <span className="font-bold tracking-tight">IntegralQ</span>
                    </div>
                    <nav className="space-y-1">
                        <button className="flex w-full items-center gap-3 rounded-lg bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-400">
                            📊 Overview
                        </button>
                        <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800">
                            📚 Knowledge Base
                        </button>
                    </nav>
                </aside>
            )}

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
