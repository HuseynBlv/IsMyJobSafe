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

export interface SalaryControls {
    salaryAnchor: number;
    marketOutlook: number;
    aiPressure: number;
    reskillingCommitment: number;
    promotionLift: number;
}

interface Props {
    scenarios: SalaryScenario[];
    controls: SalaryControls;
}

interface ScenarioPoint {
    label: string;
    value: number;
}

interface InteractiveScenario extends SalaryScenario {
    points: ScenarioPoint[];
    dynamicSummary: string;
}

function fmt(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
    return `$${Math.round(value)}`;
}

const SCENARIO_STYLE: Record<string, { color: string; dash?: string }> = {
    no_change: { color: "#f87171", dash: "4 4" },
    moderate_upskill: { color: "#818cf8" },
    ai_resistant_pivot: { color: "#34d399" },
};

const SCENARIO_SENSITIVITY: Record<
    string,
    { market: number; ai: number; reskill: number; promotion: number }
> = {
    no_change: { market: 0.5, ai: 0.95, reskill: 0.15, promotion: 0.2 },
    moderate_upskill: { market: 0.7, ai: 0.6, reskill: 0.65, promotion: 0.5 },
    ai_resistant_pivot: { market: 0.9, ai: 0.35, reskill: 0.9, promotion: 0.7 },
};

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function toAnnualRate(current: number, future: number, years: number) {
    if (current <= 0 || future <= 0 || years <= 0) {
        return 0;
    }

    return Math.pow(future / current, 1 / years) - 1;
}

function buildDynamicSummary(scenario: SalaryScenario, controls: SalaryControls) {
    const aiTone = controls.aiPressure >= 65 ? "AI pressure is high" : controls.aiPressure <= 35 ? "AI pressure is muted" : "AI pressure is moderate";
    const marketTone = controls.marketOutlook >= 8 ? "the market is running hot" : controls.marketOutlook <= -8 ? "the market is cooling" : "the market is steady";
    const reskillTone = controls.reskillingCommitment >= 70 ? "you are leaning hard into upskilling" : controls.reskillingCommitment <= 35 ? "upskilling is limited" : "upskilling is steady";

    if (scenario.id === "no_change") {
        return `${marketTone} and ${aiTone.toLowerCase()}, so the no-change path shifts mostly with external demand.`;
    }

    if (scenario.id === "moderate_upskill") {
        return `${reskillTone} while ${marketTone}, so moderate upskilling captures some upside without a hard pivot.`;
    }

    return `${reskillTone} and ${marketTone}, so the pivot path absorbs more short-term volatility but amplifies long-term upside.`;
}

function buildInteractiveScenario(
    scenario: SalaryScenario,
    controls: SalaryControls
): InteractiveScenario {
    const sensitivity =
        SCENARIO_SENSITIVITY[scenario.id] ??
        SCENARIO_SENSITIVITY.moderate_upskill;

    const marketDelta = controls.marketOutlook / 100;
    const aiDelta = (controls.aiPressure - 50) / 100;
    const reskillDelta = (controls.reskillingCommitment - 50) / 100;
    const promotionDelta = controls.promotionLift / 100;

    const baseYear1Rate = toAnnualRate(scenario.salary_now, scenario.salary_year_1, 1);
    const baseLaterRate = toAnnualRate(scenario.salary_year_1, scenario.salary_year_3, 2);

    const year1Rate = clamp(
        baseYear1Rate +
            marketDelta * sensitivity.market * 0.6 -
            aiDelta * sensitivity.ai * 0.18 +
            reskillDelta * sensitivity.reskill * 0.14 +
            promotionDelta * sensitivity.promotion * 0.08,
        -0.35,
        0.45
    );

    const laterRate = clamp(
        baseLaterRate +
            marketDelta * sensitivity.market * 0.7 -
            aiDelta * sensitivity.ai * 0.14 +
            reskillDelta * sensitivity.reskill * 0.18 +
            promotionDelta * sensitivity.promotion * 0.1,
        -0.25,
        0.5
    );

    const promotionYear2Boost = promotionDelta * sensitivity.promotion * 0.08;
    const promotionYear3Boost = promotionDelta * sensitivity.promotion * 0.04;

    const now = Math.max(1, controls.salaryAnchor);
    const sixMonths = Math.max(1, now * (1 + year1Rate * 0.5));
    const year1 = Math.max(1, now * (1 + year1Rate));
    const year2 = Math.max(1, year1 * (1 + laterRate + promotionYear2Boost));
    const year3 = Math.max(1, year2 * (1 + laterRate + promotionYear3Boost));

    return {
        ...scenario,
        salary_now: now,
        salary_year_1: year1,
        salary_year_3: year3,
        dynamicSummary: buildDynamicSummary(scenario, controls),
        points: [
            { label: "Now", value: now },
            { label: "6 mo", value: sixMonths },
            { label: "Year 1", value: year1 },
            { label: "Year 2", value: year2 },
            { label: "Year 3", value: year3 },
        ],
    };
}

function CustomTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
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

export default function SalaryChart({ scenarios, controls }: Props) {
    const interactiveScenarios = scenarios.map((scenario) =>
        buildInteractiveScenario(scenario, controls)
    );

    const chartData = interactiveScenarios[0]?.points.map((point, pointIndex) => ({
        name: point.label,
        ...Object.fromEntries(
            interactiveScenarios.map((scenario) => [
                scenario.label,
                scenario.points[pointIndex]?.value ?? scenario.salary_now,
            ])
        ),
    })) ?? [];

    return (
        <div className="flex flex-col gap-6">
            <div className="w-full h-72 sm:h-80">
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
                            width={58}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", paddingTop: "12px" }}
                        />
                        {interactiveScenarios.map((scenario) => {
                            const style = SCENARIO_STYLE[scenario.id] ?? { color: "#94a3b8" };
                            return (
                                <Line
                                    key={scenario.id}
                                    type="monotone"
                                    dataKey={scenario.label}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {interactiveScenarios.map((scenario) => {
                    const style = SCENARIO_STYLE[scenario.id] ?? { color: "#94a3b8" };
                    const delta3 = scenario.salary_year_3 - scenario.salary_now;
                    const pct3 = ((delta3 / scenario.salary_now) * 100).toFixed(0);
                    return (
                        <div
                            key={scenario.id}
                            className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 flex flex-col gap-2"
                        >
                            <div className="flex items-center justify-between">
                                <span
                                    className="text-xs font-bold uppercase tracking-wide"
                                    style={{ color: style.color }}
                                >
                                    {scenario.label}
                                </span>
                                <span
                                    className="text-xs font-semibold tabular-nums"
                                    style={{ color: delta3 >= 0 ? "#34d399" : "#f87171" }}
                                >
                                    {delta3 >= 0 ? "+" : ""}{pct3}% in 3yr
                                </span>
                            </div>
                            <p className="text-[11px] text-white/65 leading-relaxed">
                                {scenario.dynamicSummary}
                            </p>
                            <p className="text-[11px] text-white/40 leading-relaxed">
                                {scenario.risk_commentary}
                            </p>
                            <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/[0.06]">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-white/30 uppercase tracking-wider">Year 1</span>
                                    <span className="text-sm font-semibold text-white">{fmt(scenario.salary_year_1)}</span>
                                </div>
                                <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-white/30 uppercase tracking-wider">Year 3</span>
                                    <span className="text-sm font-semibold text-white">{fmt(scenario.salary_year_3)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
