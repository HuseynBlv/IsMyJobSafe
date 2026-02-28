"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

const features = {
    free: [
        "Replaceability score (0-100)",
        "Automation risk level",
        "3 key assessment reasons",
        "Top 3 upgrade suggestions",
    ],
    pro: [
        "Everything in Free",
        "Full 7-dimension breakdown",
        "Detailed skill roadmap",
        "Full market breakdown",
        "Historical tracking",
        "Role-specific AI exposure report",
        "Peer benchmarking (by industry)",
        "Stored in your premium report archive",
    ],
};

export default function UpgradePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [sessionLoading, setSessionLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [analysisId, setAnalysisId] = useState<string | null>(null);
    const [ownedLoading, setOwnedLoading] = useState(false);
    const [alreadyOwned, setAlreadyOwned] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    const purchased = searchParams.get("checkout") === "success";

    useEffect(() => {
        let active = true;
        const currentAnalysisId = sessionStorage.getItem("ismyjobsafe_analysis_id");
        setAnalysisId(currentAnalysisId);

        async function loadSession() {
            try {
                const res = await fetch("/api/auth/session", { cache: "no-store" });
                const data = await res.json();
                if (!active) {
                    return;
                }

                if (res.ok && data.authenticated) {
                    setUserEmail(data.user.email as string);

                    if (currentAnalysisId) {
                        setOwnedLoading(true);
                        try {
                            const statusRes = await fetch(
                                `/api/subscription/status?analysisId=${encodeURIComponent(currentAnalysisId)}`,
                                { cache: "no-store" }
                            );
                            const statusData = await statusRes.json();
                            if (active && statusRes.ok) {
                                setAlreadyOwned(statusData.active === true);
                            }
                        } catch {
                            if (active) {
                                setAlreadyOwned(false);
                            }
                        } finally {
                            if (active) {
                                setOwnedLoading(false);
                            }
                        }
                    }
                }
            } catch {
                if (active) {
                    setUserEmail(null);
                }
            } finally {
                if (active) {
                    setSessionLoading(false);
                }
            }
        }

        void loadSession();

        return () => {
            active = false;
        };
    }, []);

    async function handleLemonCheckoutClick() {
        if (!analysisId) {
            setCheckoutError("Run a free analysis first so we can attach the premium report to your account.");
            return;
        }

        setCheckoutError(null);
        setCheckoutLoading(true);

        try {
            const res = await fetch("/api/checkout/lemonsqueezy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ analysisId }),
            });
            const data = await res.json();

            if (!res.ok || !data.success || !data.checkoutUrl) {
                throw new Error(data.error ?? "Failed to create checkout.");
            }

            window.location.href = data.checkoutUrl;
        } catch (error) {
            setCheckoutError(error instanceof Error ? error.message : "Checkout failed.");
            setCheckoutLoading(false);
        }
    }

    return (
        <div className="min-h-dvh flex flex-col hero-glow">
            <Navbar />

            <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-12">
                <div className="text-center max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300 mb-6">
                        Premium Upgrade
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
                        Unlock the premium report and keep it saved to your account
                    </h1>
                    <p className="text-[var(--text-muted)] text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                        Every premium purchase is tied to your account so you can reopen it later from your personal archive without repurchasing it.
                    </p>
                </div>

                {purchased ? (
                    <div className="w-full max-w-2xl rounded-2xl border border-emerald-500/30 bg-emerald-900/10 px-5 py-4 text-sm text-emerald-200 text-center">
                        Payment confirmed. We are finishing the handoff to your premium dashboard.
                    </div>
                ) : null}

                {sessionLoading ? (
                    <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/35 backdrop-blur-xl">
                        <div className="flex flex-col items-center gap-4 py-8">
                            <span className="loading loading-spinner loading-md text-indigo-300" />
                            <p className="text-sm text-white/60">Checking your account...</p>
                        </div>
                    </div>
                ) : !userEmail ? (
                    <div className="w-full max-w-3xl rounded-[32px] border border-white/10 bg-[linear-gradient(155deg,rgba(79,70,229,0.14),rgba(8,12,28,0.92)_42%,rgba(8,12,28,0.98))] p-7 sm:p-9 shadow-2xl shadow-black/35">
                        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200/80 mb-3">
                                    Account-first checkout
                                </p>
                                <h2 className="text-2xl sm:text-4xl font-semibold text-white leading-tight">
                                    Create your account before buying a premium report
                                </h2>
                                <p className="mt-4 text-sm sm:text-base leading-7 text-white/65 max-w-xl">
                                    This keeps every purchased premium report attached to you automatically, so the archive is always complete and easy to reopen.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-5 sm:p-6 flex flex-col gap-4">
                                <Link
                                    href="/signup?next=/upgrade&reason=checkout"
                                    className="btn h-12 rounded-2xl border-none bg-gradient-to-r from-indigo-500 to-cyan-500 text-sm font-semibold text-white shadow-[0_18px_50px_-18px_rgba(59,130,246,0.7)]"
                                >
                                    Create Account To Continue
                                </Link>
                                <Link
                                    href="/login?next=/upgrade&reason=checkout"
                                    className="btn h-12 rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-semibold text-white/80 hover:bg-white/[0.08]"
                                >
                                    I Already Have An Account
                                </Link>
                                <p className="text-xs leading-6 text-white/45">
                                    You will return here immediately after signing in, ready to purchase.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : !analysisId ? (
                    <div className="w-full max-w-2xl rounded-[28px] border border-amber-400/15 bg-amber-400/[0.06] p-7 text-center shadow-2xl shadow-black/30">
                        <h2 className="text-2xl font-semibold text-white">Run a free analysis first</h2>
                        <p className="mt-3 text-sm sm:text-base leading-7 text-white/65">
                            Premium purchases are linked to a specific analysis. Start with the free analysis, then come back here to unlock the full report.
                        </p>
                        <Link
                            href="/"
                            className="btn mt-6 h-11 rounded-2xl border border-amber-300/20 bg-amber-300/10 text-sm font-semibold text-amber-100 hover:bg-amber-300/15"
                        >
                            Go To Free Analysis
                        </Link>
                    </div>
                ) : alreadyOwned ? (
                    <div className="w-full max-w-2xl rounded-[28px] border border-emerald-400/20 bg-emerald-400/[0.07] p-7 shadow-2xl shadow-black/30">
                        <h2 className="text-2xl font-semibold text-white text-center">This premium report is already in your account</h2>
                        <p className="mt-3 text-sm sm:text-base leading-7 text-white/65 text-center">
                            You already own the premium version of this report. Open it now or jump straight to your stored archive.
                        </p>
                        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                type="button"
                                onClick={() => router.push("/dashboard")}
                                className="btn h-11 rounded-2xl border-none bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400"
                            >
                                Open Premium Dashboard
                            </button>
                            <Link
                                href="/reports"
                                className="btn h-11 rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-semibold text-white/80 hover:bg-white/[0.08]"
                            >
                                View My Reports
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 w-full max-w-4xl">
                        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/70">
                            Purchasing as <span className="text-white font-medium">{userEmail}</span>. This report will be stored in your account after payment.
                        </div>

                        <div className="flex flex-col lg:flex-row gap-5 w-full">
                            <div className="flex-1 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-5">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Free
                                    </p>
                                    <p className="text-3xl font-bold text-white">$0</p>
                                </div>
                                <ul className="flex flex-col gap-2.5 flex-1">
                                    {features.free.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2.5 text-sm text-white/70">
                                            <span className="text-emerald-400 shrink-0">✓</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/"
                                    className="btn btn-outline w-full h-10 rounded-2xl border-[var(--border)] text-sm text-white/60 hover:text-white hover:border-white/20"
                                >
                                    Run Analysis
                                </Link>
                            </div>

                            <div className="flex-1 rounded-3xl border border-indigo-500/30 bg-indigo-900/10 p-6 flex flex-col gap-5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/6 to-transparent pointer-events-none" />

                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                                            Premium
                                        </p>
                                        <span className="badge badge-xs border-indigo-500/30 bg-indigo-500/20 text-indigo-300 text-[10px]">
                                            One-time
                                        </span>
                                    </div>
                                    <p className="text-3xl font-bold text-white">
                                        $3.99 <span className="text-base font-normal text-[var(--text-muted)]">/ report</span>
                                    </p>
                                </div>

                                <ul className="flex flex-col gap-2.5 flex-1 relative">
                                    {features.pro.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2.5 text-sm text-white/80">
                                            <span className="text-indigo-300 shrink-0">✓</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <div className="relative rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/70">
                                    Your account archive will show this purchase immediately after the webhook confirms payment.
                                </div>

                                {checkoutError ? (
                                    <p className="relative text-xs text-red-300">{checkoutError}</p>
                                ) : null}

                                <button
                                    onClick={handleLemonCheckoutClick}
                                    disabled={checkoutLoading || ownedLoading}
                                    className="relative btn w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 border-none text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 disabled:opacity-60"
                                >
                                    {checkoutLoading ? "Redirecting to checkout..." : ownedLoading ? "Checking ownership..." : "Unlock Full Report - $3.99"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <p className="text-xs text-[var(--text-muted)] text-center max-w-xl">
                    Payments are processed securely by <span className="text-white/50">Lemon Squeezy</span>. No recurring subscription. Each premium report stays in your account archive.
                </p>
            </main>
        </div>
    );
}
