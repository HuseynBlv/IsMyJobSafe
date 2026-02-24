"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import PaddleCheckout from "@/components/PaddleCheckout";

const features = {
    free: [
        "Replaceability score (0–100)",
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
        "PDF export",
    ],
};

export default function UpgradePage() {
    const [email, setEmail] = useState("");
    const [purchased, setPurchased] = useState(false);
    const router = useRouter();

    function handleSuccess() {
        // Persist email so the dashboard can pass it as x-user-email
        if (email) sessionStorage.setItem("ismyjobsafe_email", email.toLowerCase().trim());
        setPurchased(true);
        // Give Paddle a moment to close, then redirect
        setTimeout(() => router.push("/dashboard"), 1800);
    }

    return (
        <div className="min-h-dvh flex flex-col hero-glow">
            <Navbar />

            <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-12">
                {/* Header */}
                <div className="text-center max-w-md">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
                        Unlock the Full Report
                    </h1>
                    <p className="text-[var(--text-muted)] text-base leading-relaxed">
                        Go beyond the score. Understand exactly where your exposure is and
                        what to do about it.
                    </p>
                </div>

                {purchased && (
                    <div className="w-full max-w-2xl rounded-xl border border-emerald-500/40 bg-emerald-900/10 px-5 py-4 text-sm text-emerald-300 text-center">
                        ✓ Payment successful — your full report is now unlocked.
                    </div>
                )}

                {/* Pricing cards */}
                <div className="flex flex-col sm:flex-row gap-5 w-full max-w-2xl">
                    {/* Free */}
                    <div className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-5">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                Free
                            </p>
                            <p className="text-3xl font-bold text-white">$0</p>
                        </div>
                        <ul className="flex flex-col gap-2.5 flex-1">
                            {features.free.map((f) => (
                                <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                                    <span className="text-emerald-400 shrink-0">✓</span>
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Link
                            href="/"
                            className="btn btn-outline w-full h-10 rounded-xl border-[var(--border)] text-sm text-white/60 hover:text-white hover:border-white/20"
                        >
                            Run Analysis
                        </Link>
                    </div>

                    {/* Pro */}
                    <div className="flex-1 rounded-2xl border border-indigo-500/40 bg-indigo-900/10 p-6 flex flex-col gap-5 relative overflow-hidden">
                        {/* Glow */}
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

                        <div className="relative">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                                    Pro
                                </p>
                                <span className="badge badge-xs border-indigo-500/30 bg-indigo-500/20 text-indigo-300 text-[10px]">
                                    One-time
                                </span>
                            </div>
                            <p className="text-3xl font-bold text-white">
                                $9{" "}
                                <span className="text-base font-normal text-[var(--text-muted)]">
                                    / report
                                </span>
                            </p>
                        </div>

                        <ul className="flex flex-col gap-2.5 flex-1 relative">
                            {features.pro.map((f) => (
                                <li key={f} className="flex items-center gap-2.5 text-sm text-white/80">
                                    <span className="text-indigo-400 shrink-0">✓</span>
                                    {f}
                                </li>
                            ))}
                        </ul>

                        {/* Email input + Paddle checkout */}
                        <div className="relative flex flex-col gap-3">
                            <input
                                id="checkout-email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input input-sm w-full rounded-xl bg-white/5 border border-[var(--border)] text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/60 px-3 h-10"
                            />
                            <PaddleCheckout
                                email={email}
                                onSuccess={handleSuccess}
                                className="btn w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 border-none text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 relative disabled:opacity-60"
                            >
                                Unlock Full Report — $9
                            </PaddleCheckout>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                    Payments processed by{" "}
                    <span className="text-white/50">Paddle</span>. No subscription.
                </p>
            </main>
        </div>
    );
}
