import React, { createContext, useContext, useState } from 'react';
import type { ChartConfig } from '../types';

interface DataContextType {
    sessionId: string | null;
    domain: string | null;
    charts: ChartConfig[];
    rowCount: number;
    setAnalysisResults: (id: string, domain: string, charts: ChartConfig[], rows: number) => void;
    clearData: () => void;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [domain, setDomain] = useState<string | null>(null);
    const [charts, setCharts] = useState<ChartConfig[]>([]);
    const [rowCount, setRowCount] = useState<number>(0);

    const setAnalysisResults = (id: string, dom: string, newCharts: ChartConfig[], rows: number) => {
        setSessionId(id);
        setDomain(dom);
        setCharts(newCharts);
        setRowCount(rows);
        console.log("💾 Global Data Saved. Session:", id);
    };

    const clearData = () => {
        setSessionId(null);
        setDomain(null);
        setCharts([]);
        setRowCount(0);
    };

    return (
        <DataContext.Provider value={{ sessionId, domain, charts, rowCount, setAnalysisResults, clearData }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
