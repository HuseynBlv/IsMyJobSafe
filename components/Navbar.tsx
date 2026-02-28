"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SessionUser {
    email: string;
}

export default function Navbar() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadSession() {
            try {
                const res = await fetch("/api/auth/session", { cache: "no-store" });
                const data = await res.json();
                if (!active) {
                    return;
                }
                setUser(data.authenticated ? data.user : null);
            } catch {
                if (active) {
                    setUser(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadSession();

        return () => {
            active = false;
        };
    }, []);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch {
            // Treat logout as best effort.
        }

        sessionStorage.removeItem("ismyjobsafe_email");
        setUser(null);
        setLoggingOut(false);
        router.push("/");
        router.refresh();
    }

    return (
        <header className="w-full px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-[var(--border)] backdrop-blur-xl">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
                <span className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs font-bold">
                    AI
                </span>
                <span className="font-semibold text-base tracking-tight text-white">
                    IsMyJob<span className="text-indigo-400">Safe</span>
                </span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
                {loading ? (
                    <div className="h-9 w-28 rounded-xl border border-white/10 bg-white/[0.03] animate-pulse" />
                ) : user ? (
                    <>
                        <Link
                            href="/reports"
                            className="btn btn-sm rounded-xl border border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white"
                        >
                            My Reports
                        </Link>
                        <Link
                            href="/upgrade"
                            className="btn btn-sm rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400"
                        >
                            Unlock Full Report
                        </Link>
                        <button
                            type="button"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="btn btn-sm rounded-xl border border-white/10 bg-transparent text-white/55 hover:bg-white/[0.06] hover:text-white disabled:opacity-70"
                        >
                            {loggingOut ? "Signing out..." : "Logout"}
                        </button>
                    </>
                ) : (
                    <>
                        <Link
                            href="/login"
                            className="btn btn-sm rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
                        >
                            Login
                        </Link>
                        <Link
                            href="/signup?next=/upgrade&reason=checkout"
                            className="btn btn-sm rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400"
                        >
                            Create Account
                        </Link>
                    </>
                )}
            </div>
        </header>
    );
}
