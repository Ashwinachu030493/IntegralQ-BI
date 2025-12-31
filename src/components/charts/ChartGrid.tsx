import React from 'react';
import type { ChartConfig } from '../../types';
import { ChartRenderer } from '../visual/ChartRenderer';

export const ChartGrid: React.FC<{ charts: ChartConfig[] }> = ({ charts }) => {
    return (
        <div className="grid grid-cols-1 gap-6">
            {charts.map((chart) => (
                <ChartRenderer key={chart.id} config={chart} />
            ))}
        </div>
    );
};
