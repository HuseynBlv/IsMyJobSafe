"use client";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

export interface SalaryScenario {
    id: string;
    label: string;
    description: string;
    salary_now: number;
    salary_year_1: number;
    salary_year_3: number;
    risk_commentary: string;
}

interface Props {
    scenarios: SalaryScenario[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
    return `$${value}`;
}

const SCENARIO_STYLE: Record<string, { color: string; dash?: string }> = {
    no_change: { color: "#f87171", dash: "4 4" },   // red-400
    moderate_upskill: { color: "#818cf8" },                 // indigo-400
    ai_resistant_pivot: { color: "#34d399" },                 // emerald-400
};

// Custom tooltip card
function CustomTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string; payload: { id: string } }>;
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-md p-3 shadow-2xl min-w-[180px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">{label}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
                    <span className="text-xs" style={{ color: entry.color }}>{entry.name}</span>
                    <span className="text-xs font-bold text-white">{fmt(entry.value)}</span>
                </div>
            ))}
        </div>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SalaryChart({ scenarios }: Props) {
    // Build data points: Now / Year 1 / Year 3
    const chartData = [
        {
            name: "Now",
            ...Object.fromEntries(scenarios.map((s) => [s.label, s.salary_now])),
        },
        {
            name: "Year 1",
            ...Object.fromEntries(scenarios.map((s) => [s.label, s.salary_year_1])),
        },
        {
            name: "Year 3",
            ...Object.fromEntries(scenarios.map((s) => [s.label, s.salary_year_3])),
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* Chart */}
            <div className="w-full h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                            tickLine={false}
                        />
                        <YAxis
                            tickFormatter={fmt}
                            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={52}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", paddingTop: "12px" }}
                        />
                        {scenarios.map((s) => {
                            const style = SCENARIO_STYLE[s.id] ?? { color: "#94a3b8" };
                            return (
                                <Line
                                    key={s.id}
                                    type="monotone"
                                    dataKey={s.label}
                                    stroke={style.color}
                                    strokeWidth={2.5}
                                    strokeDasharray={style.dash}
                                    dot={{ r: 4, fill: style.color, strokeWidth: 0 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Commentary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {scenarios.map((s) => {
                    const style = SCENARIO_STYLE[s.id] ?? { color: "#94a3b8" };
                    const delta3 = s.salary_year_3 - s.salary_now;
                    const pct3 = ((delta3 / s.salary_now) * 100).toFixed(0);
                    return (
                        <div
                            key={s.id}
                            className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 flex flex-col gap-2"
                        >
                            <div className="flex items-center justify-between">
                                <span
                                    className="text-xs font-bold uppercase tracking-wide"
                                    style={{ color: style.color }}
                                >
                                    {s.label}
                                </span>
                                <span
                                    className="text-xs font-semibold tabular-nums"
                                    style={{ color: delta3 >= 0 ? "#34d399" : "#f87171" }}
                                >
                                    {delta3 >= 0 ? "+" : ""}{pct3}% in 3yr
                                </span>
                            </div>
                            <p className="text-[11px] text-white/50 leading-relaxed">{s.risk_commentary}</p>
                            <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/[0.06]">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-white/30 uppercase tracking-wider">Year 1</span>
                                    <span className="text-sm font-semibold text-white">{fmt(s.salary_year_1)}</span>
                                </div>
                                <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-white/30 uppercase tracking-wider">Year 3</span>
                                    <span className="text-sm font-semibold text-white">{fmt(s.salary_year_3)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
