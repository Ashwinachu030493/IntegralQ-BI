import React from 'react';

interface HeaderProps {
    user: { name: string; role: string };
    onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
    return (
        <header className="flex items-center justify-between mb-8">
            {/* Logo / Title Area (Optional if Sidebar is present, but good for context) */}
            <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                    Dashboard
                </h1>
            </div>

            <div className="flex items-center gap-4">
                {/* User Info */}
                <div className="text-right">
                    <div className="text-sm font-bold text-gray-200">{user.name}</div>
                    <div className="text-xs text-indigo-400">{user.role}</div>
                </div>

                {/* Logout Button */}
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-gray-400 transition-colors"
                        title="Sign Out"
                    >
                        ⏻
                    </button>
                )}
            </div>
        </header>
    );
};
