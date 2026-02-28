"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import type { AnalysisResult } from "@/types/analysis";

interface StoredReport {
    id: string;
    analysisId: string;
    paymentId: string;
    createdAt: string;
    reportData: AnalysisResult;
}

export default function ReportsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [reports, setReports] = useState<StoredReport[]>([]);

    useEffect(() => {
        let active = true;

        async function loadReports() {
            try {
                const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
                const sessionData = await sessionRes.json();

                if (!active) {
                    return;
                }

                if (!sessionRes.ok || !sessionData.authenticated) {
                    router.replace("/login?next=/reports");
                    return;
                }

                setEmail(sessionData.user.email as string);

                const reportsRes = await fetch("/api/reports", { cache: "no-store" });
                const reportsData = await reportsRes.json();

                if (!active) {
                    return;
                }

                if (!reportsRes.ok || !reportsData.success) {
                    throw new Error(reportsData.error ?? "Failed to load stored reports.");
                }

                setReports(reportsData.reports as StoredReport[]);
            } catch (loadError) {
                if (!active) {
                    return;
                }
                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "Failed to load stored reports."
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadReports();

        return () => {
            active = false;
        };
    }, [router]);

    function openReport(report: StoredReport) {
        sessionStorage.setItem("ismyjobsafe_analysis_id", report.analysisId);
        sessionStorage.setItem("ismyjobsafe_result", JSON.stringify(report.reportData));
        router.push("/dashboard");
    }

    return (
        <div className="min-h-dvh flex flex-col hero-glow">
            <Navbar />

            <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10 sm:py-14">
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300 mb-2">
                            Premium Archive
                        </p>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white">
                            Your stored premium reports
                        </h1>
                        {email ? (
                            <p className="text-sm text-[var(--text-muted)] mt-2">
                                Signed in as <span className="text-white/80">{email}</span>
                            </p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push("/upgrade")}
                        className="btn h-10 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
                    >
                        Buy Another Report
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center gap-3 py-10 justify-center">
                        <span className="loading loading-spinner loading-md text-indigo-400" />
                        <span className="text-white/50 text-sm">Loading your report archive...</span>
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                        {error}
                    </div>
                ) : reports.length === 0 ? (
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                        <h2 className="text-xl font-semibold text-white mb-2">
                            No premium reports yet
                        </h2>
                        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-7">
                            Complete your first premium purchase and it will appear here automatically, ready to reopen any time.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push("/upgrade")}
                            className="btn mt-6 h-11 rounded-2xl border-none bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500"
                        >
                            Unlock Your First Premium Report
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {reports.map((report) => (
                            <div
                                key={report.id}
                                className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:items-center">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-1">
                                            Report Date
                                        </p>
                                        <p className="text-sm text-white/85">
                                            {new Date(report.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-1">
                                            Replaceability
                                        </p>
                                        <p className="text-sm text-white/85">
                                            {report.reportData.replaceability_score}/100
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-1">
                                            Automation Risk
                                        </p>
                                        <p className="text-sm text-white/85 capitalize">
                                            {report.reportData.automation_risk}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-1">
                                            Payment ID
                                        </p>
                                        <p className="text-sm text-white/60 truncate">
                                            {report.paymentId}
                                        </p>
                                    </div>
                                    <div className="md:justify-self-end">
                                        <button
                                            type="button"
                                            onClick={() => openReport(report)}
                                            className="btn h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 border-none text-white text-sm font-semibold px-4"
                                        >
                                            Open In Dashboard
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
