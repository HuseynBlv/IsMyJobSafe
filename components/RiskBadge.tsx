interface RiskBadgeProps {
    level: "low" | "medium" | "high";
    label: string;
}

const config: Record<
    "low" | "medium" | "high",
    { badge: string; dot: string; text: string }
> = {
    low: {
        badge: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        dot: "bg-emerald-400",
        text: "Low",
    },
    medium: {
        badge: "border border-amber-500/30 bg-amber-500/10 text-amber-400",
        dot: "bg-amber-400",
        text: "Medium",
    },
    high: {
        badge: "border border-red-500/30 bg-red-500/10 text-red-400",
        dot: "bg-red-400",
        text: "High",
    },
};

export default function RiskBadge({ level, label }: RiskBadgeProps) {
    const c = config[level];
    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${c.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            <span className="text-[var(--text-muted)] text-xs">{label}:</span>
            <span>{c.text}</span>
        </div>
    );
}
