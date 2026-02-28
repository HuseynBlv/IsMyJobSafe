"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 30000;

export default function PaymentSuccessPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(Math.ceil(MAX_WAIT_MS / 1000));
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        let active = true;
        let intervalId: number | null = null;
        let countdownId: number | null = null;
        const analysisId = sessionStorage.getItem("ismyjobsafe_analysis_id");

        async function load() {
            try {
                const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
                const sessionData = await sessionRes.json();

                if (!active) {
                    return;
                }

                if (!sessionRes.ok || !sessionData.authenticated) {
                    router.replace("/login?next=/payment/success");
                    return;
                }

                if (!analysisId) {
                    setError("Payment succeeded, but the current report context is missing. Open your saved reports instead.");
                    setCheckingSession(false);
                    return;
                }

                setCheckingSession(false);

                const startedAt = Date.now();
                intervalId = window.setInterval(() => {
                    void checkStatus(startedAt, analysisId);
                }, POLL_INTERVAL_MS);
                countdownId = window.setInterval(() => {
                    const remaining = Math.max(
                        0,
                        Math.ceil((MAX_WAIT_MS - (Date.now() - startedAt)) / 1000)
                    );
                    setSecondsLeft(remaining);
                }, 1000);

                async function checkStatus(
                    startedAtMs: number,
                    currentAnalysisId: string
                ) {
                    try {
                        const res = await fetch(
                            `/api/subscription/status?analysisId=${encodeURIComponent(currentAnalysisId)}`,
                            { cache: "no-store" }
                        );
                        const data = await res.json();
                        if (!active) {
                            return;
                        }

                        if (res.ok && data.active === true) {
                            if (intervalId) {
                                window.clearInterval(intervalId);
                            }
                            if (countdownId) {
                                window.clearInterval(countdownId);
                            }
                            router.replace("/dashboard");
                            return;
                        }

                        if (Date.now() - startedAtMs >= MAX_WAIT_MS) {
                            setError(
                                "Payment succeeded, but report storage is taking longer than expected. Open your saved reports in a moment."
                            );
                            if (intervalId) {
                                window.clearInterval(intervalId);
                            }
                            if (countdownId) {
                                window.clearInterval(countdownId);
                            }
                        }
                    } catch {
                        if (!active) {
                            return;
                        }
                        if (Date.now() - startedAtMs >= MAX_WAIT_MS) {
                            setError(
                                "Payment succeeded, but we could not verify the saved report yet. Please open your report archive in a moment."
                            );
                            if (intervalId) {
                                window.clearInterval(intervalId);
                            }
                            if (countdownId) {
                                window.clearInterval(countdownId);
                            }
                        }
                    }
                }

                void checkStatus(startedAt, analysisId);
            } catch {
                if (active) {
                    setCheckingSession(false);
                    setError("We could not verify your session. Please log in again.");
                }
            }
        }

        void load();

        return () => {
            active = false;
            if (intervalId) {
                window.clearInterval(intervalId);
            }
            if (countdownId) {
                window.clearInterval(countdownId);
            }
        };
    }, [router]);

    return (
        <div className="min-h-dvh flex flex-col hero-glow">
            <Navbar />
            <main className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-lg rounded-[30px] border border-emerald-500/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(3,7,18,0.92))] p-8 text-center shadow-2xl shadow-emerald-950/20">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                        Payment successful
                    </h1>

                    {checkingSession ? (
                        <div className="flex flex-col items-center gap-4 py-6">
                            <span className="loading loading-spinner loading-md text-emerald-300" />
                            <p className="text-sm text-emerald-100/75">
                                Restoring your account session...
                            </p>
                        </div>
                    ) : !error ? (
                        <>
                            <p className="text-sm text-emerald-100/80 mb-6 leading-7">
                                We are linking this purchase to your account and sending you into the full premium dashboard.
                            </p>
                            <div className="flex flex-col items-center gap-3">
                                <span className="loading loading-spinner loading-md text-emerald-300" />
                                <p className="text-xs text-emerald-200/70">
                                    Redirecting automatically ({secondsLeft}s)
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col gap-4 items-center">
                            <p className="text-sm text-amber-200 leading-7">{error}</p>
                            <button
                                type="button"
                                onClick={() => router.push("/reports")}
                                className="btn h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 border-none text-white text-sm font-semibold px-4"
                            >
                                Open My Reports
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
