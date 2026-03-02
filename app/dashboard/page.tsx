"use client";

import { Suspense, startTransition, useDeferredValue, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import dynamic from "next/dynamic";
import type { SalaryControls, SalaryScenario } from "@/components/SalaryChart";

// Recharts uses browser APIs — load client-side only
const SalaryChart = dynamic(() => import("@/components/SalaryChart"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────
interface YearExposure {
    year: 1 | 2 | 3;
    exposure_level: "low" | "medium" | "high" | "critical";
    headline: string;
    key_change: string;
}
interface TaskItem { task: string; reason: string; }
interface SimulationResult {
    summary: string;
    years: YearExposure[];
    tasks_at_risk: TaskItem[];
    tasks_safe: TaskItem[];
}
interface MarketComparisonResult {
    percentile: number;
    percentile_label: string;
    summary: string;
    strengths: Array<{ area: string; detail: string }>;
    weaknesses: Array<{ area: string; detail: string }>;
    positioning_advice: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuarterPlan {
    quarter: 1 | 2 | 3 | 4;
    objective: string;
    skill_focus: string;
    project_suggestion: string;
    career_positioning: string;
}

const QUARTER_META = [
    { label: "Q1", theme: "Foundation", icon: "🧱", accent: "from-indigo-600 to-indigo-500", border: "border-indigo-500/30", glow: "shadow-indigo-500/20", badge: "bg-indigo-500/15 text-indigo-300", connector: "bg-indigo-500/40" },
    { label: "Q2", theme: "Upgrade", icon: "⚡", accent: "from-violet-600 to-violet-500", border: "border-violet-500/30", glow: "shadow-violet-500/20", badge: "bg-violet-500/15 text-violet-300", connector: "bg-violet-500/40" },
    { label: "Q3", theme: "Leadership", icon: "🎯", accent: "from-emerald-600 to-emerald-500", border: "border-emerald-500/30", glow: "shadow-emerald-500/20", badge: "bg-emerald-500/15 text-emerald-300", connector: "bg-emerald-500/40" },
    { label: "Q4", theme: "Market Leverage", icon: "🚀", accent: "from-amber-600 to-amber-500", border: "border-amber-500/30", glow: "shadow-amber-500/20", badge: "bg-amber-500/15 text-amber-300", connector: "bg-amber-500/40" },
];

const COUNTRIES = [
    "United States", "United Kingdom", "Canada", "Australia", "Germany",
    "France", "Netherlands", "Sweden", "Switzerland", "Singapore",
    "United Arab Emirates", "India", "Brazil", "Mexico", "South Africa",
    "Japan", "South Korea", "New Zealand", "Ireland", "Portugal",
];

function PlanRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</span>
            <p className="text-sm text-white/85 leading-relaxed">{value}</p>
        </div>
    );
}

type SalaryPresetKey = "conservative" | "balanced" | "aggressive";

const SALARY_PRESETS: Record<SalaryPresetKey, Omit<SalaryControls, "salaryAnchor">> = {
    conservative: {
        marketOutlook: -8,
        aiPressure: 68,
        reskillingCommitment: 30,
        promotionLift: 4,
    },
    balanced: {
        marketOutlook: 0,
        aiPressure: 50,
        reskillingCommitment: 50,
        promotionLift: 10,
    },
    aggressive: {
        marketOutlook: 10,
        aiPressure: 38,
        reskillingCommitment: 78,
        promotionLift: 18,
    },
};

function marketOutlookLabel(value: number) {
    if (value <= -10) return "Cooling";
    if (value >= 10) return "Hot";
    return "Balanced";
}

function aiPressureLabel(value: number) {
    if (value <= 35) return "Low";
    if (value >= 65) return "High";
    return "Moderate";
}

function reskillingLabel(value: number) {
    if (value <= 35) return "Passive";
    if (value >= 70) return "Aggressive";
    return "Active";
}

function promotionLabel(value: number) {
    if (value <= 6) return "Modest";
    if (value >= 18) return "Fast-track";
    return "Healthy";
}

function marketOutlookDetail(value: number) {
    if (value <= -10) return "Budget pressure slows compensation growth.";
    if (value >= 10) return "Strong demand supports faster salary expansion.";
    return "Steady demand keeps compensation growth near baseline.";
}

function aiPressureDetail(value: number) {
    if (value <= 35) return "Automation pressure stays manageable for most roles.";
    if (value >= 65) return "Higher automation pressure compresses exposed paths faster.";
    return "Automation risk is material, but still manageable with positioning.";
}

function reskillingDetail(value: number) {
    if (value <= 35) return "Minimal skill investment limits upside beyond baseline.";
    if (value >= 70) return "Aggressive upskilling drives stronger separation over time.";
    return "Consistent reskilling improves resilience without a major pivot.";
}

function promotionDetail(value: number) {
    if (value <= 6) return "Progression stays incremental with smaller compensation jumps.";
    if (value >= 18) return "A larger jump assumes stronger leverage or a title step-up.";
    return "A realistic promotion lift keeps the path optimistic but credible.";
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function DashboardView() {
    // Protection plan state
    const [plan, setPlan] = useState<QuarterPlan[] | null>(null);
    const [planLoading, setPlanLoading] = useState(true);
    const [planError, setPlanError] = useState<string | null>(null);
    const [planCached, setPlanCached] = useState(false);

    // Salary projection state
    const [salary, setSalary] = useState("");
    const [country, setCountry] = useState("United States");
    const [salaryLoading, setSalaryLoading] = useState(false);
    const [salaryError, setSalaryError] = useState<string | null>(null);
    const [scenarios, setScenarios] = useState<SalaryScenario[] | null>(null);
    const [salaryCached, setSalaryCached] = useState(false);
    const [salaryBase, setSalaryBase] = useState<number | null>(null);
    const [activeSalaryPreset, setActiveSalaryPreset] = useState<SalaryPresetKey | "custom">("balanced");
    const [salaryControls, setSalaryControls] = useState<SalaryControls>({
        salaryAnchor: 85_000,
        marketOutlook: 0,
        aiPressure: 50,
        reskillingCommitment: 50,
        promotionLift: 10,
    });

    // AI Simulation state
    const [simulation, setSimulation] = useState<SimulationResult | null>(null);
    const [simLoading, setSimLoading] = useState(false);
    const [simCached, setSimCached] = useState(false);

    // Market comparison state
    const [comparison, setComparison] = useState<MarketComparisonResult | null>(null);
    const [compLoading, setCompLoading] = useState(false);
    const [compCached, setCompCached] = useState(false);
    const [compTriggered, setCompTriggered] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const analysisId = searchParams.get("analysisId")?.trim() ?? "";
    const deferredSalaryControls = useDeferredValue(salaryControls);

    function updateSalaryControl<K extends keyof SalaryControls>(key: K, value: SalaryControls[K]) {
        startTransition(() => {
            setActiveSalaryPreset("custom");
            setSalaryControls((current) => ({
                ...current,
                [key]: value,
            }));
        });
    }

    function applySalaryPreset(preset: SalaryPresetKey) {
        const anchor = salaryBase ?? salaryControls.salaryAnchor;
        startTransition(() => {
            setActiveSalaryPreset(preset);
            setSalaryControls({
                salaryAnchor: anchor,
                ...SALARY_PRESETS[preset],
            });
        });
    }

    function resetSalaryControls() {
        const anchor = salaryBase ?? 85_000;
        startTransition(() => {
            setActiveSalaryPreset("balanced");
            setSalaryControls({
                salaryAnchor: anchor,
                ...SALARY_PRESETS.balanced,
            });
        });
    }

    // ── Load protection plan on mount ─────────────────────────────────────────
    useEffect(() => {
        async function fetchPlan() {
            if (!analysisId) { router.replace("/reports"); return; }

            try {
                const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
                const sessionData = await sessionRes.json();
                if (!sessionRes.ok || !sessionData.authenticated) {
                    router.replace(`/login?next=${encodeURIComponent(`/dashboard?analysisId=${analysisId}`)}`);
                    return;
                }

                const { active } = await fetch(
                    `/api/subscription/status?analysisId=${encodeURIComponent(analysisId)}`,
                    { cache: "no-store" }
                ).then((response) => response.json());
                if (!active) { router.replace(`/upgrade?analysisId=${encodeURIComponent(analysisId)}`); return; }
            } catch { router.replace(`/upgrade?analysisId=${encodeURIComponent(analysisId)}`); return; }

            try {
                const res = await fetch("/api/premium/protection-plan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ analysisId }),
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error ?? "Failed to generate plan.");
                setPlan(data.plan);
                setPlanCached(data.cached);

                // ── 4. Auto-fetch AI simulation ──────────────────────────────────
                setSimLoading(true);
                try {
                    const simRes = await fetch("/api/premium/ai-simulation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ analysisId }),
                    });
                    const simData = await simRes.json();
                    if (simRes.ok && simData.success) {
                        setSimulation(simData.simulation);
                        setSimCached(simData.cached);
                    }
                } catch { /* non-fatal */ } finally {
                    setSimLoading(false);
                }
            } catch (err) {
                setPlanError(err instanceof Error ? err.message : "Something went wrong.");
            } finally {
                setPlanLoading(false);
            }
        }
        fetchPlan();
    }, [analysisId, router]);

    // ── Salary projection submit ───────────────────────────────────────────────
    async function handleSalarySubmit(e: React.FormEvent) {
        e.preventDefault();
        const salaryNum = parseFloat(salary.replace(/,/g, ""));
        if (!salaryNum || salaryNum <= 0) { setSalaryError("Please enter a valid salary."); return; }

        if (!analysisId) return;

        setSalaryLoading(true);
        setSalaryError(null);

        try {
            const res = await fetch("/api/premium/salary-projection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ analysisId, salary: salaryNum, country }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error ?? "Failed to generate projection.");
            setSalaryBase(salaryNum);
            setSalaryControls({
                salaryAnchor: salaryNum,
                marketOutlook: 0,
                aiPressure: 50,
                reskillingCommitment: 50,
                promotionLift: 10,
            });
            setActiveSalaryPreset("balanced");
            setScenarios(data.scenarios);
            setSalaryCached(data.cached);
        } catch (err) {
            setSalaryError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setSalaryLoading(false);
        }
    }

    // ── Loading state ──────────────────────────────────────────────────────────
    if (planLoading) {
        return (
            <div className="min-h-dvh flex flex-col hero-glow">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                        <span className="loading loading-spinner loading-md text-indigo-400" />
                    </div>
                    <div className="text-center">
                        <p className="text-white font-semibold text-lg">Building Your Plan</p>
                        <p className="text-white/50 text-sm mt-1">Our AI is crafting your 12-month strategy…</p>
                    </div>
                    <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    // ── Error state ────────────────────────────────────────────────────────────
    if (planError) {
        return (
            <div className="min-h-dvh flex flex-col hero-glow">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
                    <div className="text-4xl">⚠️</div>
                    <p className="text-white font-semibold text-lg">Something went wrong</p>
                    <p className="text-white/50 text-sm max-w-sm">{planError}</p>
                    <button onClick={() => router.push("/")} className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-sm font-semibold">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // ── Plan rendered ──────────────────────────────────────────────────────────
    return (
        <div className="min-h-dvh flex flex-col hero-glow">
            <Navbar />

            <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-10 sm:py-14 flex flex-col gap-12">

                {/* ── Section 1: Header ── */}
                <div className="text-center flex flex-col gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-widest mx-auto">
                        🛡️ Premium Dashboard
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                        Your 12-Month<br />
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            Career Protection Plan
                        </span>
                    </h1>
                    <p className="text-white/50 text-sm max-w-sm mx-auto">
                        A personalized quarter-by-quarter strategy to reduce your automation risk and grow your career defensibility.
                    </p>
                    {planCached && (
                        <span className="mx-auto text-[10px] font-semibold text-emerald-400/70 uppercase tracking-widest">
                            ✓ Loaded from cache
                        </span>
                    )}
                </div>

                {/* ── Section 2: Q1-Q4 Timeline ── */}
                <div className="relative flex flex-col gap-0">
                    {plan!.map((quarter, idx) => {
                        const meta = QUARTER_META[idx];
                        const isLast = idx === plan!.length - 1;
                        return (
                            <div key={quarter.quarter} className="relative flex gap-5 sm:gap-7">
                                <div className="flex flex-col items-center">
                                    <div className={`w-12 h-12 flex-none rounded-2xl bg-gradient-to-br ${meta.accent} flex items-center justify-center text-white shadow-lg ${meta.glow} z-10`}>
                                        <span className="text-lg">{meta.icon}</span>
                                    </div>
                                    {!isLast && <div className={`w-0.5 flex-1 min-h-8 my-1 ${meta.connector} rounded-full`} />}
                                </div>
                                <div className={`flex-1 mb-8 rounded-2xl border ${meta.border} bg-white/[0.03] backdrop-blur-sm p-5 sm:p-6 flex flex-col gap-5 hover:bg-white/[0.05] transition-colors`}>
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.badge}`}>{meta.label}</span>
                                            <span className="text-white/40 text-xs">·</span>
                                            <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{meta.theme}</span>
                                        </div>
                                        <span className="text-[10px] text-white/25 font-medium tabular-nums">
                                            Months {(idx * 3) + 1}–{(idx + 1) * 3}
                                        </span>
                                    </div>
                                    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Main Objective</p>
                                        <p className="text-white font-semibold text-sm leading-snug">{quarter.objective}</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/[0.06] pt-4">
                                        <PlanRow label="Skill Focus" value={quarter.skill_focus} />
                                        <PlanRow label="Suggested Project" value={quarter.project_suggestion} />
                                        <PlanRow label="Career Positioning" value={quarter.career_positioning} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Section 3: Salary Growth Projection ── */}
                <div className="flex flex-col gap-6 pt-4 border-t border-white/[0.06]">
                    {/* Section header */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💰</span>
                            <h2 className="text-xl font-bold text-white">Salary Growth Projection</h2>
                        </div>
                        <p className="text-white/40 text-sm">
                            Enter your current salary to see AI-modeled income scenarios across 3 paths.
                        </p>
                    </div>

                    {/* Input form — show only if no scenarios yet */}
                    {!scenarios && (
                        <form onSubmit={handleSalarySubmit} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6 flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Salary input */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                        Current Annual Salary
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-semibold select-none">$</span>
                                        <input
                                            id="salary-input"
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="85,000"
                                            value={salary}
                                            onChange={(e) => setSalary(e.target.value)}
                                            className="w-full pl-7 pr-3 h-10 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Country dropdown */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                        Country / Market
                                    </label>
                                    <select
                                        id="country-select"
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        className="w-full px-3 h-10 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
                                    >
                                        {COUNTRIES.map((c) => (
                                            <option key={c} value={c} className="bg-[#0f0f1a] text-white">{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {salaryError && (
                                <p className="text-red-400 text-xs">{salaryError}</p>
                            )}

                            <button
                                type="submit"
                                disabled={salaryLoading || !salary.trim()}
                                className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                {salaryLoading ? (
                                    <>
                                        <span className="loading loading-spinner loading-xs" />
                                        Generating Projection…
                                    </>
                                ) : (
                                    <>
                                        <span>📈</span>
                                        Generate My Salary Projection
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Chart — shown after scenarios load */}
                    {scenarios && (
                        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <p className="text-sm font-semibold text-white/70">
                                    Live Salary Trajectory — {country}
                                </p>
                                <div className="flex items-center gap-3">
                                    {salaryCached && (
                                        <span className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-widest">
                                            ✓ Cached
                                        </span>
                                    )}
                                    <button
                                        onClick={() => {
                                            setScenarios(null);
                                            setSalary("");
                                            setSalaryBase(null);
                                            setActiveSalaryPreset("balanced");
                                            resetSalaryControls();
                                        }}
                                        className="text-[11px] text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
                                    >
                                        Change inputs
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.18))] p-4 sm:p-5 flex flex-col gap-5">
                                <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                                        <div className="space-y-2">
                                            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
                                                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)]" />
                                                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                                                    Live Scenario Controls
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white/85">
                                                    Adjust the market, your strategy, and promotion assumptions in real time.
                                                </p>
                                                <p className="text-xs text-white/45 mt-1">
                                                    The baseline AI scenarios stay fixed. These controls stress-test how each path behaves under different conditions.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {(["conservative", "balanced", "aggressive"] as SalaryPresetKey[]).map((preset) => {
                                                const isActive = activeSalaryPreset === preset;
                                                const toneClass =
                                                    preset === "conservative"
                                                        ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                                                        : preset === "balanced"
                                                            ? "border-indigo-400/20 bg-indigo-400/10 text-indigo-200"
                                                            : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";

                                                return (
                                                    <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => applySalaryPreset(preset)}
                                                        className={`min-w-[8.75rem] rounded-2xl border px-4 py-2.5 text-left transition-colors ${
                                                            isActive ? toneClass : "border-white/[0.08] bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                                                        }`}
                                                    >
                                                        <span className="block text-[10px] font-bold uppercase tracking-[0.18em]">
                                                            {preset}
                                                        </span>
                                                        <span className="mt-1 block text-[11px] text-current/80 normal-case tracking-normal">
                                                            {preset === "conservative"
                                                                ? "Defensive assumptions"
                                                                : preset === "balanced"
                                                                    ? "Default outlook"
                                                                    : "Upside stress test"}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                            <button
                                                type="button"
                                                onClick={resetSalaryControls}
                                                className="rounded-2xl border border-white/[0.08] bg-transparent px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-white/70"
                                            >
                                                Reset To Baseline
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-5">
                                        <div className="rounded-2xl border border-indigo-400/15 bg-indigo-400/[0.08] px-4 py-3 xl:col-span-1">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100/55">Anchor Salary</p>
                                            <p className="mt-2 text-lg font-semibold text-white tabular-nums">
                                                ${Math.round(deferredSalaryControls.salaryAnchor).toLocaleString()}
                                            </p>
                                            <p className="mt-1 text-[11px] text-white/45">The pay level used to stress-test every scenario.</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Market</p>
                                            <p className="mt-2 text-sm font-semibold text-white">{marketOutlookLabel(deferredSalaryControls.marketOutlook)}</p>
                                            <p className="mt-1 text-[11px] text-white/40">{marketOutlookDetail(deferredSalaryControls.marketOutlook)}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">AI Pressure</p>
                                            <p className="mt-2 text-sm font-semibold text-white">{aiPressureLabel(deferredSalaryControls.aiPressure)}</p>
                                            <p className="mt-1 text-[11px] text-white/40">{aiPressureDetail(deferredSalaryControls.aiPressure)}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Reskilling</p>
                                            <p className="mt-2 text-sm font-semibold text-white">{reskillingLabel(deferredSalaryControls.reskillingCommitment)}</p>
                                            <p className="mt-1 text-[11px] text-white/40">{reskillingDetail(deferredSalaryControls.reskillingCommitment)}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Promotion</p>
                                            <p className="mt-2 text-sm font-semibold text-white">{promotionLabel(deferredSalaryControls.promotionLift)}</p>
                                            <p className="mt-1 text-[11px] text-white/40">{promotionDetail(deferredSalaryControls.promotionLift)}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] gap-4">
                                        <div className="rounded-3xl border border-indigo-400/10 bg-[linear-gradient(180deg,rgba(79,70,229,0.09),rgba(10,10,24,0.45))] p-5 flex flex-col gap-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-100/45">
                                                        Compensation Assumptions
                                                    </p>
                                                    <p className="mt-2 text-sm font-semibold text-white/85">
                                                        Tune the salary baseline and the size of a future step-up.
                                                    </p>
                                                </div>
                                                <span className="rounded-full border border-indigo-300/10 bg-indigo-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-indigo-100/70">
                                                    Stress test
                                                </span>
                                            </div>

                                            <div className="rounded-2xl border border-white/[0.05] bg-black/10 p-4 flex flex-col gap-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <label htmlFor="salary-anchor" className="text-[11px] font-semibold text-white/75">
                                                        Current salary anchor
                                                    </label>
                                                    <div className="text-right">
                                                        <span className="block text-sm font-semibold tabular-nums text-white">
                                                            ${Math.round(deferredSalaryControls.salaryAnchor).toLocaleString()}
                                                        </span>
                                                        <span className="block text-[10px] uppercase tracking-widest text-white/30">
                                                            Dynamic baseline
                                                        </span>
                                                    </div>
                                                </div>
                                                <input
                                                    id="salary-anchor"
                                                    type="range"
                                                    min={Math.max(30_000, Math.round((salaryBase ?? deferredSalaryControls.salaryAnchor) * 0.5))}
                                                    max={Math.round((salaryBase ?? deferredSalaryControls.salaryAnchor) * 2)}
                                                    step={1000}
                                                    value={salaryControls.salaryAnchor}
                                                    onChange={(event) => updateSalaryControl("salaryAnchor", Number(event.target.value))}
                                                    className="range range-sm range-primary"
                                                />
                                                <div className="flex items-center justify-between text-[11px] text-white/35">
                                                    <span>${Math.max(30_000, Math.round((salaryBase ?? deferredSalaryControls.salaryAnchor) * 0.5)).toLocaleString()}</span>
                                                    <span>${Math.round((salaryBase ?? deferredSalaryControls.salaryAnchor) * 2).toLocaleString()}</span>
                                                </div>
                                                <p className="text-[11px] text-white/35">
                                                    Move the baseline up or down to see how the same career strategy performs at different pay levels.
                                                </p>
                                            </div>

                                            <div className="rounded-2xl border border-white/[0.05] bg-black/10 p-4 flex flex-col gap-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <label htmlFor="promotion-lift" className="text-[11px] font-semibold text-white/75">
                                                        Promotion lift
                                                    </label>
                                                    <div className="text-right">
                                                        <span className="block text-sm font-semibold tabular-nums text-white">
                                                            +{salaryControls.promotionLift}%
                                                        </span>
                                                        <span className="block text-[10px] uppercase tracking-widest text-white/30">
                                                            {promotionLabel(salaryControls.promotionLift)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <input
                                                    id="promotion-lift"
                                                    type="range"
                                                    min={0}
                                                    max={30}
                                                    step={1}
                                                    value={salaryControls.promotionLift}
                                                    onChange={(event) => updateSalaryControl("promotionLift", Number(event.target.value))}
                                                    className="range range-sm range-warning"
                                                />
                                                <div className="flex items-center justify-between text-[11px] text-white/35">
                                                    <span>Incremental</span>
                                                    <span>Fast-track</span>
                                                </div>
                                                <p className="text-[11px] text-white/35">{promotionDetail(salaryControls.promotionLift)}</p>
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-emerald-400/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(10,10,24,0.45))] p-5 flex flex-col gap-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-100/45">
                                                        Market And Strategy
                                                    </p>
                                                    <p className="mt-2 text-sm font-semibold text-white/85">
                                                        Pressure-test demand, automation intensity, and how hard you push your skill stack.
                                                    </p>
                                                </div>
                                                <span className="rounded-full border border-emerald-300/10 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-100/70">
                                                    Live
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="rounded-2xl border border-white/[0.05] bg-black/10 p-4 flex flex-col gap-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <label htmlFor="market-outlook" className="text-[11px] font-semibold text-white/75">
                                                            Market outlook
                                                        </label>
                                                        <div className="text-right">
                                                            <span className="block text-sm font-semibold tabular-nums text-white">
                                                                {salaryControls.marketOutlook > 0 ? "+" : ""}{salaryControls.marketOutlook}%
                                                            </span>
                                                            <span className="block text-[10px] uppercase tracking-widest text-white/30">
                                                                {marketOutlookLabel(salaryControls.marketOutlook)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        id="market-outlook"
                                                        type="range"
                                                        min={-20}
                                                        max={20}
                                                        step={1}
                                                        value={salaryControls.marketOutlook}
                                                        onChange={(event) => updateSalaryControl("marketOutlook", Number(event.target.value))}
                                                        className="range range-sm range-info"
                                                    />
                                                    <div className="flex items-center justify-between text-[11px] text-white/35">
                                                        <span>Cooling</span>
                                                        <span>Hot</span>
                                                    </div>
                                                    <p className="text-[11px] text-white/35">{marketOutlookDetail(salaryControls.marketOutlook)}</p>
                                                </div>

                                                <div className="rounded-2xl border border-white/[0.05] bg-black/10 p-4 flex flex-col gap-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <label htmlFor="ai-pressure" className="text-[11px] font-semibold text-white/75">
                                                            AI pressure
                                                        </label>
                                                        <div className="text-right">
                                                            <span className="block text-sm font-semibold tabular-nums text-white">
                                                                {salaryControls.aiPressure}/100
                                                            </span>
                                                            <span className="block text-[10px] uppercase tracking-widest text-white/30">
                                                                {aiPressureLabel(salaryControls.aiPressure)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        id="ai-pressure"
                                                        type="range"
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        value={salaryControls.aiPressure}
                                                        onChange={(event) => updateSalaryControl("aiPressure", Number(event.target.value))}
                                                        className="range range-sm range-error"
                                                    />
                                                    <div className="flex items-center justify-between text-[11px] text-white/35">
                                                        <span>Contained</span>
                                                        <span>High disruption</span>
                                                    </div>
                                                    <p className="text-[11px] text-white/35">{aiPressureDetail(salaryControls.aiPressure)}</p>
                                                </div>

                                                <div className="rounded-2xl border border-white/[0.05] bg-black/10 p-4 flex flex-col gap-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <label htmlFor="reskilling-commitment" className="text-[11px] font-semibold text-white/75">
                                                            Reskilling commitment
                                                        </label>
                                                        <div className="text-right">
                                                            <span className="block text-sm font-semibold tabular-nums text-white">
                                                                {salaryControls.reskillingCommitment}/100
                                                            </span>
                                                            <span className="block text-[10px] uppercase tracking-widest text-white/30">
                                                                {reskillingLabel(salaryControls.reskillingCommitment)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        id="reskilling-commitment"
                                                        type="range"
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        value={salaryControls.reskillingCommitment}
                                                        onChange={(event) => updateSalaryControl("reskillingCommitment", Number(event.target.value))}
                                                        className="range range-sm range-success"
                                                    />
                                                    <div className="flex items-center justify-between text-[11px] text-white/35">
                                                        <span>Passive</span>
                                                        <span>Aggressive</span>
                                                    </div>
                                                    <p className="text-[11px] text-white/35">{reskillingDetail(salaryControls.reskillingCommitment)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <SalaryChart scenarios={scenarios} controls={deferredSalaryControls} />
                        </div>
                    )}
                </div>

                {/* ── Section 4: AI Exposure Simulation ── */}
                <div className="flex flex-col gap-6 pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🤖</span>
                                <h2 className="text-xl font-bold text-white">AI Exposure Simulation</h2>
                            </div>
                            <p className="text-white/40 text-sm">How AI automation will reshape your role over 3 years.</p>
                        </div>
                        {simCached && <span className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-widest">✓ Cached</span>}
                    </div>

                    {simLoading && (
                        <div className="flex items-center gap-3 py-6 justify-center">
                            <span className="loading loading-spinner loading-sm text-indigo-400" />
                            <span className="text-white/40 text-sm">Simulating your exposure…</span>
                        </div>
                    )}

                    {simulation && (
                        <>
                            {/* Summary */}
                            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-5 py-4">
                                <p className="text-sm text-white/70 leading-relaxed">{simulation.summary}</p>
                            </div>

                            {/* Year timeline */}
                            <div className="grid grid-cols-3 gap-3">
                                {simulation.years.map((y) => {
                                    const levelStyles: Record<string, string> = {
                                        low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                                        medium: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
                                        high: "border-orange-500/30 bg-orange-500/10 text-orange-300",
                                        critical: "border-red-500/30 bg-red-500/10 text-red-300",
                                    };
                                    const style = levelStyles[y.exposure_level] ?? levelStyles.medium;
                                    return (
                                        <div key={y.year} className={`rounded-xl border ${style} p-4 flex flex-col gap-2`}>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Year {y.year}</span>
                                                <span className="text-xs font-bold capitalize">{y.exposure_level}</span>
                                            </div>
                                            <p className="text-xs font-semibold text-white leading-snug">{y.headline}</p>
                                            <p className="text-[11px] opacity-60 leading-relaxed">{y.key_change}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Tasks grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* At risk */}
                                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 flex flex-col gap-3">
                                    <p className="text-xs font-bold uppercase tracking-widest text-red-400">⚠ Tasks Likely Automated</p>
                                    <ul className="flex flex-col gap-2">
                                        {simulation.tasks_at_risk.map((t, i) => (
                                            <li key={i} className="flex flex-col gap-0.5">
                                                <span className="text-sm font-semibold text-white/90">{t.task}</span>
                                                <span className="text-[11px] text-white/40 leading-relaxed">{t.reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Safe */}
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 flex flex-col gap-3">
                                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">✓ Tasks Staying Safe</p>
                                    <ul className="flex flex-col gap-2">
                                        {simulation.tasks_safe.map((t, i) => (
                                            <li key={i} className="flex flex-col gap-0.5">
                                                <span className="text-sm font-semibold text-white/90">{t.task}</span>
                                                <span className="text-[11px] text-white/40 leading-relaxed">{t.reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Section 5: Recruiter Market Comparison ── */}
                <div className="flex flex-col gap-6 pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🎯</span>
                                <h2 className="text-xl font-bold text-white">Recruiter Market Comparison</h2>
                            </div>
                            <p className="text-white/40 text-sm">See how you rank against peers in your field.</p>
                        </div>
                        {compCached && <span className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-widest">✓ Cached</span>}
                    </div>

                    {/* Trigger button — shown before first click */}
                    {!compTriggered && !comparison && (
                        <button
                            onClick={async () => {
                                setCompTriggered(true);
                                setCompLoading(true);
                                if (!analysisId) return;
                                try {
                                    const res = await fetch("/api/premium/market-comparison", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ analysisId }),
                                    });
                                    const data = await res.json();
                                    if (res.ok && data.success) {
                                        setComparison(data.comparison);
                                        setCompCached(data.cached);
                                    }
                                } catch { /* non-fatal */ } finally {
                                    setCompLoading(false);
                                }
                            }}
                            className="h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                        >
                            <span>📊</span>
                            Compare Me to the Market
                        </button>
                    )}

                    {compLoading && (
                        <div className="flex items-center gap-3 py-6 justify-center">
                            <span className="loading loading-spinner loading-sm text-violet-400" />
                            <span className="text-white/40 text-sm">Analyzing your market position…</span>
                        </div>
                    )}

                    {comparison && (
                        <>
                            {/* Percentile statement */}
                            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-5 sm:p-6 flex flex-col gap-4">
                                <div className="flex items-end justify-between flex-wrap gap-2">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/70 mb-1">Your Market Ranking</p>
                                        <p className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
                                            {comparison.percentile}<span className="text-lg text-white/30">th</span>
                                        </p>
                                        <p className="text-sm text-white/50 mt-0.5">percentile in your field</p>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${comparison.percentile >= 86 ? "bg-emerald-500/15 text-emerald-300" :
                                            comparison.percentile >= 71 ? "bg-blue-500/15 text-blue-300" :
                                                comparison.percentile >= 51 ? "bg-indigo-500/15 text-indigo-300" :
                                                    comparison.percentile >= 31 ? "bg-yellow-500/15 text-yellow-300" :
                                                        "bg-red-500/15 text-red-300"
                                        }`}>
                                        {comparison.percentile_label}
                                    </span>
                                </div>

                                {/* Percentile bar */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="relative h-3 w-full rounded-full bg-white/[0.06] overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-1000"
                                            style={{ width: `${comparison.percentile}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-white/25 font-medium tabular-nums">
                                        <span>0</span>
                                        <span className="text-violet-400/70 font-bold">{comparison.percentile}</span>
                                        <span>100</span>
                                    </div>
                                </div>

                                <p className="text-sm text-white/60 leading-relaxed border-t border-white/[0.06] pt-3">{comparison.summary}</p>
                            </div>

                            {/* Strengths & Weaknesses grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 flex flex-col gap-3">
                                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">✓ Your Strengths vs Peers</p>
                                    <ul className="flex flex-col gap-3">
                                        {comparison.strengths.map((s, i) => (
                                            <li key={i} className="flex flex-col gap-0.5">
                                                <span className="text-sm font-semibold text-white/90">{s.area}</span>
                                                <span className="text-[11px] text-white/40 leading-relaxed">{s.detail}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-4 flex flex-col gap-3">
                                    <p className="text-xs font-bold uppercase tracking-widest text-orange-400">▲ Gaps Behind Peers</p>
                                    <ul className="flex flex-col gap-3">
                                        {comparison.weaknesses.map((w, i) => (
                                            <li key={i} className="flex flex-col gap-0.5">
                                                <span className="text-sm font-semibold text-white/90">{w.area}</span>
                                                <span className="text-[11px] text-white/40 leading-relaxed">{w.detail}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Positioning advice */}
                            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 flex flex-col gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">🎯 Recruiter Positioning Advice</p>
                                <p className="text-sm text-white/70 leading-relaxed">{comparison.positioning_advice}</p>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Footer CTA ── */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col sm:flex-row items-center gap-4 justify-between text-center sm:text-left">
                    <div>
                        <p className="text-white font-semibold">Stay on track</p>
                        <p className="text-white/40 text-sm mt-0.5">Revisit each quarter to measure your progress.</p>
                    </div>
                    <button
                        onClick={() => router.push("/")}
                        className="flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-sm font-semibold whitespace-nowrap"
                    >
                        Analyze Another Role
                    </button>
                </div>

            </main>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-dvh flex flex-col hero-glow">
                    <Navbar />
                    <main className="flex-1 flex items-center justify-center">
                        <span className="loading loading-spinner text-indigo-400" />
                    </main>
                </div>
            }
        >
            <DashboardView />
        </Suspense>
    );
}
