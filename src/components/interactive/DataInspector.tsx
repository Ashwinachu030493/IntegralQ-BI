import React from 'react';

interface DataInspectorProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
}

export const DataInspector: React.FC<DataInspectorProps> = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data.length) return null;

    const headers = Object.keys(data[0]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8 animate-in fade-in duration-200">
            <div className="w-full max-w-6xl h-[80vh] bg-[#111827] border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-gray-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-white">Data Inspector</h2>
                        <p className="text-sm text-gray-400">Viewing raw source data ({data.length} rows)</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-white hover:bg-red-600 transition-colors"
                    >
                        Close
                    </button>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-800 text-xs uppercase text-gray-200 sticky top-0 z-10">
                            <tr>
                                {headers.map(h => (
                                    <th key={h} className="px-6 py-4 font-bold tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {data.slice(0, 100).map((row, i) => (
                                <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                                    {headers.map(h => (
                                        <td key={h} className="px-6 py-4 whitespace-nowrap">
                                            {String(row[h]).substring(0, 50)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-800/50 text-xs text-gray-500 flex justify-between">
                    <span>Showing first 100 rows</span>
                    <span>IntegralQ Secure View</span>
                </div>
            </div>
        </div>
    );
};
