"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuarterPlan {
    quarter: 1 | 2 | 3 | 4;
    objective: string;
    skill_focus: string;
    project_suggestion: string;
    career_positioning: string;
}

const QUARTER_META = [
    {
        label: "Q1",
        theme: "Foundation",
        icon: "🧱",
        accent: "from-indigo-600 to-indigo-500",
        border: "border-indigo-500/30",
        glow: "shadow-indigo-500/20",
        badge: "bg-indigo-500/15 text-indigo-300",
        connector: "bg-indigo-500/40",
    },
    {
        label: "Q2",
        theme: "Upgrade",
        icon: "⚡",
        accent: "from-violet-600 to-violet-500",
        border: "border-violet-500/30",
        glow: "shadow-violet-500/20",
        badge: "bg-violet-500/15 text-violet-300",
        connector: "bg-violet-500/40",
    },
    {
        label: "Q3",
        theme: "Leadership",
        icon: "🎯",
        accent: "from-emerald-600 to-emerald-500",
        border: "border-emerald-500/30",
        glow: "shadow-emerald-500/20",
        badge: "bg-emerald-500/15 text-emerald-300",
        connector: "bg-emerald-500/40",
    },
    {
        label: "Q4",
        theme: "Market Leverage",
        icon: "🚀",
        accent: "from-amber-600 to-amber-500",
        border: "border-amber-500/30",
        glow: "shadow-amber-500/20",
        badge: "bg-amber-500/15 text-amber-300",
        connector: "bg-amber-500/40",
    },
];

// ─── Helper ───────────────────────────────────────────────────────────────────
function PlanRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                {label}
            </span>
            <p className="text-sm text-white/85 leading-relaxed">{value}</p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const [plan, setPlan] = useState<QuarterPlan[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cached, setCached] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function fetchPlan() {
            // ── 1. Check analysisId ──────────────────────────────────────────
            const analysisId = sessionStorage.getItem("ismyjobsafe_analysis_id");
            if (!analysisId) {
                router.replace("/");
                return;
            }

            // ── 2. Check subscription ────────────────────────────────────────
            const email = sessionStorage.getItem("ismyjobsafe_email");
            if (!email) {
                router.replace("/upgrade");
                return;
            }

            try {
                const statusRes = await fetch(
                    `/api/subscription/status?email=${encodeURIComponent(email)}`
                );
                const statusBody = await statusRes.json();
                if (!statusBody.active) {
                    router.replace("/upgrade");
                    return;
                }
            } catch {
                router.replace("/upgrade");
                return;
            }

            // ── 3. Fetch plan ────────────────────────────────────────────────
            try {
                const email = sessionStorage.getItem("ismyjobsafe_email")!;
                const res = await fetch("/api/premium/protection-plan", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-user-email": email,
                    },
                    body: JSON.stringify({ analysisId }),
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.error ?? "Failed to generate plan.");
                }

                setPlan(data.plan);
                setCached(data.cached);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong.");
            } finally {
                setLoading(false);
            }
        }

        fetchPlan();
    }, [router]);

    // ── Loading state ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-dvh flex flex-col hero-glow">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                        <span className="loading loading-spinner loading-md text-indigo-400" />
                    </div>
                    <div className="text-center">
                        <p className="text-white font-semibold text-lg">Building Your Plan</p>
                        <p className="text-white/50 text-sm mt-1">
                            Our AI is crafting your 12-month strategy…
                        </p>
                    </div>
                    {/* Fake progress bar */}
                    <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    // ── Error state ────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="min-h-dvh flex flex-col hero-glow">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
                    <div className="text-4xl">⚠️</div>
                    <p className="text-white font-semibold text-lg">Something went wrong</p>
                    <p className="text-white/50 text-sm max-w-sm">{error}</p>
                    <button
                        onClick={() => router.push("/")}
                        className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-sm font-semibold"
                    >
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

            <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-10 sm:py-14 flex flex-col gap-10">

                {/* ── Header ── */}
                <div className="text-center flex flex-col gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-widest mx-auto">
                        🛡️ Premium Feature
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
                    {cached && (
                        <span className="mx-auto text-[10px] font-semibold text-emerald-400/70 uppercase tracking-widest">
                            ✓ Loaded from cache
                        </span>
                    )}
                </div>

                {/* ── Timeline ── */}
                <div className="relative flex flex-col gap-0">
                    {plan!.map((quarter, idx) => {
                        const meta = QUARTER_META[idx];
                        const isLast = idx === plan!.length - 1;

                        return (
                            <div key={quarter.quarter} className="relative flex gap-5 sm:gap-7">
                                {/* Vertical connector line + icon */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-12 h-12 flex-none rounded-2xl bg-gradient-to-br ${meta.accent} flex items-center justify-center text-white shadow-lg ${meta.glow} shadow-lg z-10`}
                                    >
                                        <span className="text-lg">{meta.icon}</span>
                                    </div>
                                    {!isLast && (
                                        <div className={`w-0.5 flex-1 min-h-8 my-1 ${meta.connector} rounded-full`} />
                                    )}
                                </div>

                                {/* Card */}
                                <div
                                    className={`flex-1 mb-8 rounded-2xl border ${meta.border} bg-white/[0.03] backdrop-blur-sm p-5 sm:p-6 flex flex-col gap-5 hover:bg-white/[0.05] transition-colors`}
                                >
                                    {/* Card header */}
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.badge}`}>
                                                {meta.label}
                                            </span>
                                            <span className="text-white/40 text-xs">·</span>
                                            <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
                                                {meta.theme}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-white/25 font-medium tabular-nums">
                                            Months {(idx * 3) + 1}–{(idx + 1) * 3}
                                        </span>
                                    </div>

                                    {/* Objective */}
                                    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">
                                            Main Objective
                                        </p>
                                        <p className="text-white font-semibold text-sm leading-snug">
                                            {quarter.objective}
                                        </p>
                                    </div>

                                    {/* Detail rows */}
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

                {/* ── Footer CTA ── */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col sm:flex-row items-center gap-4 justify-between text-center sm:text-left">
                    <div>
                        <p className="text-white font-semibold">Stay on track</p>
                        <p className="text-white/40 text-sm mt-0.5">
                            Revisit this plan each quarter to track your progress.
                        </p>
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
