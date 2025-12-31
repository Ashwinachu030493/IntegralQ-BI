import React, { createContext, useContext, useState } from 'react';
import type { ChartConfig } from '../types';

// Export interface so it can be used if needed
export interface GlobalDataType {
    activeSessionId: string | null;
    domain: string | null;
    charts: ChartConfig[];
    rowCount: number;
    setAnalysisResults: (id: string, domain: string, charts: ChartConfig[], rows: number) => void;
    clearData: () => void;
}

const GlobalDataContext = createContext<GlobalDataType>({} as GlobalDataType);

export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [domain, setDomain] = useState<string | null>(null);
    const [charts, setCharts] = useState<ChartConfig[]>([]);
    const [rowCount, setRowCount] = useState<number>(0);

    const setAnalysisResults = (id: string, dom: string, newCharts: ChartConfig[], rows: number) => {
        setActiveSessionId(id);
        setDomain(dom);
        setCharts(newCharts);
        setRowCount(rows);
        console.log("💾 Global Data Saved. Session:", id);
    };

    const clearData = () => {
        setActiveSessionId(null);
        setDomain(null);
        setCharts([]);
        setRowCount(0);
    };

    return (
        <GlobalDataContext.Provider value={{ activeSessionId, domain, charts, rowCount, setAnalysisResults, clearData }}>
            {children}
        </GlobalDataContext.Provider>
    );
};

export const useGlobalData = (): GlobalDataType => useContext(GlobalDataContext);
