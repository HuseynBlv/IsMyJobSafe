"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 30000;

export default function PaymentSuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [error, setError] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(Math.ceil(MAX_WAIT_MS / 1000));

    const email = useMemo(() => {
        const fromQuery = searchParams.get("email")?.toLowerCase().trim();
        const fromSession =
            typeof window !== "undefined"
                ? sessionStorage.getItem("ismyjobsafe_email")?.toLowerCase().trim()
                : null;
        return fromSession || fromQuery || "";
    }, [searchParams]);
    const missingEmail = !email;

    useEffect(() => {
        if (missingEmail) {
            return;
        }

        sessionStorage.setItem("ismyjobsafe_email", email);

        let active = true;
        const startedAt = Date.now();
        const intervalId = window.setInterval(() => {
            void checkStatus();
        }, POLL_INTERVAL_MS);
        const countdownId = window.setInterval(() => {
            const remaining = Math.max(
                0,
                Math.ceil((MAX_WAIT_MS - (Date.now() - startedAt)) / 1000)
            );
            setSecondsLeft(remaining);
        }, 1000);

        async function checkStatus() {
            try {
                const res = await fetch(
                    `/api/subscription/status?email=${encodeURIComponent(email)}`,
                    { cache: "no-store" }
                );
                const data = await res.json();
                if (!active) return;

                if (res.ok && data.active === true) {
                    router.replace("/dashboard");
                    return;
                }

                if (Date.now() - startedAt >= MAX_WAIT_MS) {
                    setError(
                        "Payment succeeded, but subscription confirmation is taking longer than expected. Please refresh in a moment."
                    );
                    window.clearInterval(intervalId);
                    window.clearInterval(countdownId);
                }
            } catch {
                if (!active) return;
                if (Date.now() - startedAt >= MAX_WAIT_MS) {
                    setError(
                        "Payment succeeded, but we couldn't verify your subscription yet. Please refresh in a moment."
                    );
                    window.clearInterval(intervalId);
                    window.clearInterval(countdownId);
                }
            }
        }

        void checkStatus();

        return () => {
            active = false;
            window.clearInterval(intervalId);
            window.clearInterval(countdownId);
        };
    }, [email, missingEmail, router]);

    const effectiveError = missingEmail
        ? "We couldn't find your email to verify payment."
        : error;

    return (
        <div className="min-h-dvh flex flex-col hero-glow">
            <Navbar />
            <main className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-emerald-900/10 p-8 text-center shadow-xl shadow-emerald-900/20">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                        Payment successful
                    </h1>

                    {!effectiveError ? (
                        <>
                            <p className="text-sm text-emerald-100/80 mb-6">
                                Verifying your subscription and unlocking your full report...
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
                            <p className="text-sm text-amber-200">{effectiveError}</p>
                            <button
                                type="button"
                                onClick={() => router.push("/dashboard")}
                                className="btn h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 border-none text-white text-sm font-semibold px-4"
                            >
                                Continue to Full Report
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
