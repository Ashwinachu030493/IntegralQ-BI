import {
    ResponsiveContainer,
    BarChart, Bar,
    LineChart, Line,
    PieChart, Pie, Cell,
    AreaChart, Area,
    ScatterChart, Scatter,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ComposedChart, ReferenceLine,
    CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import type { ChartConfig } from '../../types';

// Color palette for charts
const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#22d3ee', '#10b981'];

interface ExtendedChartConfig extends ChartConfig {
    xAxisKey?: string;
    yAxisKey?: string;
}

// Normalize data to ensure we have proper name/value pairs for charts
function normalizeChartData(data: any[], xKey: string, yKey: string): any[] {
    // First pass: try to get proper numeric values
    const normalized = data.map(item => {
        const keys = Object.keys(item);

        // Find the categorical key (string value)
        const catKey = keys.find(k => typeof item[k] === 'string') || xKey;
        // Find the numeric key (number value)  
        const numKey = keys.find(k => typeof item[k] === 'number') || yKey;

        const nameValue = item[catKey] ?? item[xKey] ?? 'Unknown';
        let numValue = item[numKey] ?? item[yKey];

        // If the value is not a number, or is 0, try to find ANY numeric value
        if (typeof numValue !== 'number' || numValue === 0) {
            numValue = Object.values(item).find(v => typeof v === 'number' && v !== 0);
        }

        // Final fallback: use a count of 1 for distribution charts
        if (typeof numValue !== 'number' || isNaN(numValue)) {
            numValue = 1;
        }

        return {
            name: String(nameValue).substring(0, 20), // Truncate long names
            value: numValue
        };
    });

    // Check if all values are 1 (meaning we failed to find real values)
    // In this case, aggregate by counting occurrences of each name
    const allOnes = normalized.every(d => d.value === 1);
    if (allOnes && normalized.length > 3) {
        // Aggregate: count occurrences of each name
        const counts: Record<string, number> = {};
        normalized.forEach(d => {
            counts[d.name] = (counts[d.name] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }

    // If values look like aggregated data, return as-is
    return normalized.slice(0, 15); // Limit for readability
}

export const ChartRenderer = ({ config }: { config: ExtendedChartConfig }) => {
    if (!config.data?.length) {
        return (
            <div className="flex h-[250px] items-center justify-center text-gray-500">
                <span>No data available</span>
            </div>
        );
    }

    // Use axis keys from config or detect from first data item
    const firstItem = config.data[0];
    const allKeys = Object.keys(firstItem);

    // Find string key (category) and number key (value)
    const xKey = config.xAxisKey || allKeys.find(k => typeof firstItem[k] === 'string') || allKeys[0] || 'name';
    const yKey = config.yAxisKey || allKeys.find(k => typeof firstItem[k] === 'number') || allKeys[1] || 'value';

    // Normalize the data
    const normalizedData = normalizeChartData(config.data, xKey, yKey);

    // Debug first chart
    console.log('[ChartRenderer]', config.type, ':', normalizedData.slice(0, 3));

    const commonProps = {
        data: normalizedData,
        margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    const tooltipStyle = {
        contentStyle: {
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#fff'
        }
    };

    switch (config.type) {
        case 'bar':
            return (
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis
                            dataKey="name"
                            stroke="#9ca3af"
                            fontSize={10}
                            tickLine={false}
                            interval={0}
                            angle={-35}
                            textAnchor="end"
                            height={70}
                        />
                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            );

        case 'line':
            return (
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltipStyle} />
                        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
                    </LineChart>
                </ResponsiveContainer>
            );

        case 'area':
            return (
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart {...commonProps}>
                        <defs>
                            <linearGradient id={`areaGradient-${config.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltipStyle} />
                        <Area type="monotone" dataKey="value" stroke="#6366f1" fill={`url(#areaGradient-${config.id})`} strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            );

        case 'pie':
            // Filter out zero/negative values for pie chart
            const pieData = normalizedData.filter(d => d.value > 0);
            if (pieData.length === 0) {
                return (
                    <div className="flex h-[250px] items-center justify-center text-gray-500">
                        <span>No positive values for pie chart</span>
                    </div>
                );
            }

            return (
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            dataKey="value"
                            nameKey="name"
                            paddingAngle={2}
                            label={({ percent }) => (percent ?? 0) > 0.08 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''}
                            labelLine={false}
                        >
                            {pieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                        <Legend
                            wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }}
                            formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            );

        case 'scatter':
            // Scatter needs original data with numeric x and y
            const scatterData = config.data.filter(d => {
                const xVal = Number(d[xKey]);
                const yVal = Number(d[yKey]);
                return !isNaN(xVal) && !isNaN(yVal);
            }).slice(0, 50);

            if (scatterData.length < 2) {
                return (
                    <div className="flex h-[250px] items-center justify-center text-gray-500">
                        <span>Insufficient numeric data for scatter</span>
                    </div>
                );
            }

            return (
                <ResponsiveContainer width="100%" height={250}>
                    <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis type="number" dataKey={xKey} stroke="#9ca3af" fontSize={11} name={xKey} />
                        <YAxis type="number" dataKey={yKey} stroke="#9ca3af" fontSize={11} name={yKey} />
                        <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter data={scatterData} fill="#6366f1" />
                    </ScatterChart>
                </ResponsiveContainer>
            );

        case 'radar': {
            // Radar chart - great for comparing multiple dimensions
            const radarData = normalizedData.slice(0, 8).map(d => ({
                subject: d.name,
                A: d.value,
                fullMark: Math.max(...normalizedData.map(x => x.value)) * 1.2
            }));

            return (
                <ResponsiveContainer width="100%" height={250}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: '#9ca3af', fontSize: 10 }}
                        />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, 'auto']}
                            tick={{ fill: '#6b7280', fontSize: 9 }}
                            axisLine={false}
                        />
                        <Radar
                            name="Value"
                            dataKey="A"
                            stroke="#6366f1"
                            fill="#6366f1"
                            fillOpacity={0.5}
                        />
                        <Tooltip {...tooltipStyle} />
                    </RadarChart>
                </ResponsiveContainer>
            );
        }

        case 'heatmap': {
            // Custom CSS heatmap grid visualization
            const maxValue = Math.max(...normalizedData.map(d => d.value));
            const heatmapData = normalizedData.slice(0, 12);

            const getHeatColor = (value: number) => {
                const intensity = value / maxValue;
                if (intensity > 0.8) return 'bg-purple-500';
                if (intensity > 0.6) return 'bg-indigo-500';
                if (intensity > 0.4) return 'bg-blue-500';
                if (intensity > 0.2) return 'bg-cyan-500';
                return 'bg-slate-600';
            };

            return (
                <div className="h-[250px] flex flex-col">
                    <div className="grid grid-cols-4 gap-2 flex-1 p-2">
                        {heatmapData.map((item, i) => (
                            <div
                                key={i}
                                className={`${getHeatColor(item.value)} rounded-lg flex flex-col items-center justify-center text-white transition-transform hover:scale-105 cursor-pointer`}
                                title={`${item.name}: ${item.value}`}
                            >
                                <span className="text-xs font-medium truncate px-1 max-w-full">{item.name}</span>
                                <span className="text-lg font-bold">{item.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-2 text-xs text-gray-400 pb-2">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-600 rounded"></span>Low</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-cyan-500 rounded"></span></span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded"></span></span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-500 rounded"></span></span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500 rounded"></span>High</span>
                    </div>
                </div>
            );
        }

        case 'boxplot': {
            // Real Boxplot: Shows Q1-Q3 box with median line
            // Data format: { name, min, q1, median, q3, max }
            return (
                <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={config.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis
                            dataKey="name"
                            stroke="#9ca3af"
                            fontSize={10}
                            angle={-25}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis stroke="#9ca3af" fontSize={11} domain={['auto', 'auto']} />
                        <Tooltip
                            {...tooltipStyle}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-gray-800 border border-gray-700 p-2 rounded text-sm text-white">
                                            <p className="font-bold text-indigo-400">{d.name}</p>
                                            <p>Min: {Math.round(d.min)}</p>
                                            <p>Q1: {Math.round(d.q1)}</p>
                                            <p className="text-purple-400">Median: {Math.round(d.median)}</p>
                                            <p>Q3: {Math.round(d.q3)}</p>
                                            <p>Max: {Math.round(d.max)}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        {/* Whisker: Min to Q1 */}
                        <Bar dataKey="min" stackId="box" fill="transparent" />
                        {/* Box: Q1 to Q3 (as stacked bars) */}
                        <Bar
                            dataKey={(d: any) => d.q3 - d.q1}
                            stackId="box"
                            fill="#8b5cf6"
                            radius={[4, 4, 4, 4]}
                            name="IQR"
                        />
                        {/* Median line shown via ReferenceLine per item - simplified */}
                        {config.data.map((d: any, i: number) => (
                            <ReferenceLine
                                key={i}
                                y={d.median}
                                stroke="#f472b6"
                                strokeWidth={2}
                                strokeDasharray="3 3"
                                ifOverflow="extendDomain"
                            />
                        ))}
                    </ComposedChart>
                </ResponsiveContainer>
            );
        }

        case 'waterfall': {
            // Real Waterfall: Shows cumulative impact with floating bars
            // Data format: { name, value: [start, end], displayValue, isNegative }
            return (
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={config.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis
                            dataKey="name"
                            stroke="#9ca3af"
                            fontSize={10}
                            angle={-25}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis stroke="#9ca3af" fontSize={11} />
                        <Tooltip
                            {...tooltipStyle}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-gray-800 border border-gray-700 p-2 rounded text-sm text-white">
                                            <p className="font-bold">{d.name}</p>
                                            <p className={d.isNegative ? 'text-red-400' : 'text-emerald-400'}>
                                                Value: {d.displayValue >= 0 ? '+' : ''}{d.displayValue}
                                            </p>
                                            <p className="text-gray-400">Cumulative: {d.value[1]}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        {/* Floating bar from start to end */}
                        <Bar
                            dataKey="value"
                            fill="#10b981"
                            radius={[4, 4, 4, 4]}
                        >
                            {config.data.map((entry: any, index: number) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isNegative ? '#ef4444' : '#10b981'}
                                />
                            ))}
                        </Bar>
                        <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1} />
                    </BarChart>
                </ResponsiveContainer>
            );
        }

        default:
            // Fallback to bar chart
            return (
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            );
    }
};
