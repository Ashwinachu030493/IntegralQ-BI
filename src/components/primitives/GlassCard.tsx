import { cn } from "../../lib/utils";

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    score?: number;
    badge?: string;
}

export const GlassCard = ({ children, className, title, score, badge }: GlassCardProps) => {
    return (
        <div className={cn(
            "relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/40 backdrop-blur-md transition-all duration-300 group",
            "hover:border-indigo-500/50 hover:bg-gray-800/60 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]",
            className
        )}>

            {/* Card Header */}
            {(title || score !== undefined) && (
                <div className="flex items-center justify-between border-b border-gray-800/50 p-4">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-200 tracking-tight">{title}</h3>
                        {badge && (
                            <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                                {badge}
                            </span>
                        )}
                    </div>

                    {/* Score Circle */}
                    {score !== undefined && (
                        <div className="flex flex-col items-end">
                            <span className={cn(
                                "text-xl font-bold",
                                score > 80 ? "text-emerald-400" : score > 50 ? "text-yellow-400" : "text-red-400"
                            )}>
                                {score}
                            </span>
                            <span className="text-[10px] uppercase text-gray-500">Score</span>
                        </div>
                    )}
                </div>
            )}

            <div className="p-4 relative z-10">{children}</div>

            {/* Background Gradient Blob for visual depth */}
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/5 blur-[50px] transition-all group-hover:bg-indigo-500/10" />
        </div>
    );
};
