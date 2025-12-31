import React, { useState } from 'react';
import { GlassCard } from '../primitives/GlassCard';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen: React.FC = () => {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');
        try {
            await signIn(email);
            setStatus('sent');
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    if (status === 'sent') {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <GlassCard className="max-w-md w-full text-center space-y-4">
                    <div className="text-4xl">📧</div>
                    <h2 className="text-2xl font-bold text-white">Check your email</h2>
                    <p className="text-gray-300">
                        We sent a magic link to <span className="text-indigo-400">{email}</span>.
                        <br />Click it to log in instantly.
                    </p>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-gray-900/50 to-purple-900/20 pointer-events-none" />

            <GlassCard className="max-w-md w-full relative z-10 border-indigo-500/30">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-300">
                        IntegralQ BI
                    </h1>
                    <p className="text-gray-400 mt-2 text-sm">Secure Analytics Platform</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Work Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'sending'}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                    >
                        {status === 'sending' ? 'Sending Magic Link...' : 'Sign In with Email'}
                    </button>
                </form>

                {status === 'error' && (
                    <p className="text-red-400 text-sm text-center mt-4">Error sending link. Check console.</p>
                )}
            </GlassCard>
        </div>
    );
};
