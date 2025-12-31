import React from 'react';
import { GlassCard } from '../primitives/GlassCard';

interface FilterBarProps {
    columns: string[];
    activeFilter: string;
    onFilterChange: (col: string) => void;
    rowCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    columns,
    activeFilter,
    onFilterChange,
    rowCount
}) => {
    // Filter only interesting categorical columns for the dropdown
    const filterableCols = columns.filter(c =>
        !c.toLowerCase().includes('date') &&
        !c.toLowerCase().includes('id') &&
        !c.toLowerCase().includes('salary')
    );

    return (
        <GlassCard className="mb-8 !bg-indigo-900/20 !border-indigo-500/30">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">

                {/* Left: Title & Count */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-500/30">
                        <span className="text-xl">🌪️</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Active Dataset</h3>
                        <p className="text-xs text-indigo-300">{rowCount} rows loaded</p>
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <label className="absolute -top-2 left-3 bg-[#0B0F19] px-1 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                            Group By
                        </label>
                        <select
                            value={activeFilter}
                            onChange={(e) => onFilterChange(e.target.value)}
                            className="w-full h-12 rounded-lg border border-gray-700 bg-gray-900/50 px-4 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">Auto-Detect</option>
                            {filterableCols.map(col => (
                                <option key={col} value={col}>{col.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>

                    <button className="h-12 w-12 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 hover:text-white text-gray-400 transition-colors" title="Reset Filters">
                        ↺
                    </button>
                </div>
            </div>
        </GlassCard>
    );
};
