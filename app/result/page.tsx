"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ScoreMeter from "@/components/ScoreMeter";
import RiskBadge from "@/components/RiskBadge";
import BreakdownCard from "@/components/BreakdownCard";
import LockedBlurCard from "@/components/LockedBlurCard";
import type { AnalysisResult } from "@/types/analysis";

function getUrgencyTime() {
    // Determine milliseconds until "tomorrow" for mock expiry
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0); // Midnight next day
    return tomorrow.getTime();
}

export default function ResultPage() {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");
    const [isPremium, setIsPremium] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const raw = sessionStorage.getItem("ismyjobsafe_result");
        if (!raw) {
            router.replace("/");
            return;
        }
        try {
            setResult(JSON.parse(raw) as AnalysisResult);
        } catch {
            router.replace("/");
        }

        // Check if user already has an active subscription
        const email = sessionStorage.getItem("ismyjobsafe_email");
        if (email) {
            fetch(`/api/subscription/status?email=${encodeURIComponent(email)}`)
                .then((r) => r.json())
                .then((d) => setIsPremium(d.active === true))
                .catch(() => { });
        }
    }, [router]);

    // Simple countdown timer
    useEffect(() => {
        const target = getUrgencyTime();
        const update = () => {
            const diff = target - Date.now();
            if (diff <= 0) {
                setTimeLeft("Expired");
                return;
            }
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${h}h ${m}m`);
        };
        update();
        const timer = setInterval(update, 60000); // update every minute
        return () => clearInterval(timer);
    }, []);

    function handleShare() {
        if (!result) return;
        const text = `My AI replaceability score: ${result.replaceability_score}/100 (${result.automation_risk} risk) — via IsMyJobSafe`;
        navigator.clipboard
            .writeText(`${text}\n${window.location.origin}`)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            })
            .catch(() => { });
    }

    if (!result) {
        return (
            <div className="min-h-dvh flex items-center justify-center hero-glow">
                <span className="loading loading-spinner loading-lg text-indigo-400" />
            </div>
        );
    }

    const confidencePct = result.confidence ?? 0;
    const comparisonPct = result.comparison_percentile ?? 60; // Fallback if missing

    return (
        <div className="min-h-dvh flex flex-col hero-glow">
            <Navbar />

            {/* Urgency Banner */}
            <div className="bg-indigo-900/40 border-b border-indigo-500/20 text-center py-2 px-4 backdrop-blur-sm sticky top-0 z-30">
                <p className="text-xs sm:text-sm font-medium text-indigo-200">
                    <span className="mr-2">⚠️ Analysis expires in {timeLeft}</span>
                    <span className="opacity-60 hidden sm:inline">•</span>
                    <span className="ml-2 text-indigo-100/70 hidden sm:inline">Save your report now</span>
                </p>
            </div>

            <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col gap-10">

                {/* ── 1. Shock & Score ── */}
                <div className="flex flex-col items-center gap-6 text-center">
                    <ScoreMeter score={result.replaceability_score} />

                    <div className="flex flex-col gap-2 max-w-lg">
                        <div className="flex flex-wrap justify-center gap-3 mb-2">
                            <RiskBadge level={result.automation_risk} label="Automation Risk" />
                            <RiskBadge level={result.market_saturation} label="Market Saturation" />
                        </div>

                        {/* Comparison Layer */}
                        {comparisonPct >= 50 ? (
                            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 mt-2 inline-block mx-auto">
                                <p className="text-sm text-emerald-300 font-medium">
                                    You rank above <span className="text-emerald-200 font-bold">{comparisonPct}%</span> of professionals in your field.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 mt-2 inline-block mx-auto">
                                <p className="text-sm text-red-300 font-medium">
                                    You rank below <span className="text-red-200 font-bold">{100 - comparisonPct}%</span> of professionals in your field.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── 2. The Logic (Breakdown) ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <BreakdownCard
                        title="Skill Defensibility"
                        value={`${result.skill_defensibility_score} / 100`}
                        description="How hard it is to automate your specific expertise."
                    >
                        <progress className="progress progress-success w-full h-1.5" value={result.skill_defensibility_score} max={100} />
                    </BreakdownCard>

                    <BreakdownCard
                        title="Analysis Confidence"
                        value={`${confidencePct}%`}
                        description="Based on the detail level of your profile data."
                    >
                        <progress className="progress progress-info w-full h-1.5" value={confidencePct} max={100} />
                    </BreakdownCard>
                </div>

                {/* ── Context & Urgency ── */}
                <div className="flex flex-col gap-5 text-sm bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-5 sm:p-6 w-full">
                    <div>
                        <h3 className="text-indigo-300 font-bold uppercase tracking-wider mb-2 text-xs">Why This Matters</h3>
                        <p className="text-indigo-100/80 leading-relaxed">
                            {result.why_this_matters || "Roles with high repetition and low strategic ownership are most exposed to automation over the next 3–5 years."}
                        </p>
                    </div>
                    <div className="h-px bg-indigo-500/20 w-full" />
                    <div>
                        <h3 className="text-orange-300 font-bold uppercase tracking-wider mb-2 text-xs">If You Do Nothing</h3>
                        <p className="text-orange-100/80 leading-relaxed">
                            {result.if_you_do_nothing || "If your current skill trajectory continues, your automation exposure may increase over the next 2–3 years."}
                        </p>
                    </div>
                </div>

                {/* ── 3. Partial Reveal (The Hook) ── */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-emerald-400">⚡</span> Immediate Actions
                        </h2>
                        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Free Preview</span>
                    </div>

                    <div className="grid gap-4">
                        {/* Top 3 Recommendations (Real) */}
                        {result.recommended_upgrades.slice(0, 3).map((upgrade, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                                <span className="flex-none w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold mt-0.5">
                                    {i + 1}
                                </span>
                                <p className="text-sm text-white/90 leading-relaxed">{upgrade}</p>
                            </div>
                        ))}

                        {/* Specific Locked Hook */}
                        <div className="relative rounded-xl border border-indigo-500/30 bg-indigo-900/10 p-5 overflow-hidden group">
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-9-2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" /></svg>
                                    <span className="text-xs font-bold tracking-wide uppercase">Detailed Roadmap Locked</span>
                                </div>
                            </div>
                            {/* Fake content for background */}
                            <div className="opacity-30 blur-sm pointer-events-none">
                                <h3 className="font-semibold text-white mb-2">Strategic 12-Month Execution Plan</h3>
                                <ul className="space-y-2">
                                    <li className="h-2 w-full bg-white/20 rounded-full" />
                                    <li className="h-2 w-5/6 bg-white/20 rounded-full" />
                                    <li className="h-2 w-4/6 bg-white/20 rounded-full" />
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 4. The Vault (Blurred Premium Sections) ── */}
                <div className="space-y-5 pt-8 border-t border-[var(--border)]">
                    <h2 className="text-lg font-bold text-white mb-2">
                        🔐 Unlock Your Protection Plan
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <LockedBlurCard
                            title="12-Month Career Protection Plan"
                            description="Step-by-step timeline to immunize your role."
                        />
                        <LockedBlurCard
                            title="Salary Growth Projection"
                            description="AI impact on your compensation trajectory."
                        />
                        <LockedBlurCard
                            title="AI Exposure Simulation"
                            description="Scenario analysis for your specific daily tasks."
                        />
                        <LockedBlurCard
                            title="Recruiter Market Comparison"
                            description="How you stack up against 5,000+ peers."
                        />
                    </div>
                </div>

                {/* ── 5. Sticky CTA ── */}
                <div className="sticky bottom-6 z-40 mt-4">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-2xl transform scale-y-150 rounded-full opacity-60 pointer-events-none" />
                    {isPremium ? (
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="relative w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-lg shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] border border-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                        >
                            <span>🛡️ View My Protection Plan</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push("/upgrade")}
                            className="relative w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-lg shadow-[0_0_40px_-10px_rgba(99,102,241,0.6)] border border-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                        >
                            <span>Get My Career Protection Plan</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    )}
                    <p className="text-center text-[10px] text-white/40 mt-2 font-medium">
                        {isPremium ? "Premium Active — Full Access Unlocked" : "Secure SSL Payment • Cancel Anytime • Money-back Guarantee"}
                    </p>
                </div>

                {/* Footer Links */}
                <div className="text-center pt-8 pb-4">
                    <button onClick={handleShare} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                        {copied ? "Link copied!" : "Share Analysis Result"}
                    </button>
                    <div className="h-4" />
                    <a href="/" className="text-xs text-[var(--text-muted)] hover:text-white">Run another analysis</a>
                </div>

            </main>
        </div>
    );
}
