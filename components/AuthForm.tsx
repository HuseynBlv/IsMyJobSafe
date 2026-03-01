"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AuthMode = "login" | "signup";

interface Props {
    mode: AuthMode;
}

const COPY = {
    signup: {
        eyebrow: "Account Required For Premium",
        title: "Create your account before checkout",
        description:
            "Premium reports are saved to your account automatically, so you can reopen them any time without losing your purchase.",
        submit: "Create Account",
        alternateLabel: "Already have an account?",
        alternateCta: "Log in",
        alternateHref: "/login",
    },
    login: {
        eyebrow: "Welcome Back",
        title: "Log in to access your saved reports",
        description:
            "Your premium reports stay tied to your account. Sign in once, then reopen any report from your archive whenever you need it.",
        submit: "Log In",
        alternateLabel: "New here?",
        alternateCta: "Create an account",
        alternateHref: "/signup",
    },
} as const;

const BENEFITS = [
    "Every paid report is stored automatically in one place.",
    "You can reopen any purchased premium report from your archive.",
    "Checkout uses your account email, so purchases stay linked correctly.",
];

export default function AuthForm({ mode }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const content = COPY[mode];
    const nextPath = searchParams.get("next") || "/reports";
    const reason = searchParams.get("reason");
    const altParams = new URLSearchParams();

    if (nextPath) {
        altParams.set("next", nextPath);
    }
    if (reason) {
        altParams.set("reason", reason);
    }

    const alternateHref = `${content.alternateHref}${altParams.toString() ? `?${altParams.toString()}` : ""}`;

    useEffect(() => {
        let active = true;

        async function loadSession() {
            try {
                const res = await fetch("/api/auth/session", { cache: "no-store" });
                const data = await res.json();

                if (!active) {
                    return;
                }

                if (res.ok && data.authenticated) {
                    router.replace(nextPath);
                    return;
                }
            } catch {
                // Keep the form available if session lookup fails.
            }

            if (active) {
                setCheckingSession(false);
            }
        }

        void loadSession();

        return () => {
            active = false;
        };
    }, [nextPath, router]);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);

        const normalizedEmail = email.toLowerCase().trim();
        if (!normalizedEmail || !normalizedEmail.includes("@")) {
            setError("Enter a valid email address.");
            return;
        }

        if (password.trim().length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch(`/api/auth/${mode}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail, password }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error ?? "Authentication failed.");
            }

            router.replace(nextPath);
            router.refresh();
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Authentication failed."
            );
            setSubmitting(false);
        }
    }

    if (checkingSession) {
        return (
            <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/35 backdrop-blur-xl">
                <div className="flex flex-col items-center gap-4 py-8">
                    <span className="loading loading-spinner loading-md text-indigo-300" />
                    <p className="text-sm text-white/60">Preparing your account access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-6xl">
            <div className="absolute -top-16 left-0 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="absolute -bottom-10 right-8 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(155deg,rgba(79,70,229,0.16),rgba(8,12,28,0.92)_42%,rgba(8,12,28,0.98))] p-7 sm:p-9 shadow-2xl shadow-black/35">
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-200">
                        {content.eyebrow}
                    </div>

                    <div className="mt-6 max-w-xl">
                        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white leading-tight">
                            {content.title}
                        </h1>
                        <p className="mt-4 text-sm sm:text-base leading-7 text-white/65 max-w-lg">
                            {content.description}
                        </p>
                    </div>

                    {reason === "checkout" ? (
                        <div className="mt-6 rounded-2xl border border-amber-400/15 bg-amber-400/8 px-4 py-3 text-sm text-amber-100/85">
                            Create an account once, then every premium purchase will be stored in your personal report archive.
                        </div>
                    ) : null}

                    <div className="mt-8 grid gap-3">
                        {BENEFITS.map((benefit) => (
                            <div
                                key={benefit}
                                className="flex items-start gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-4"
                            >
                                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-xs font-bold text-emerald-200">
                                    ✓
                                </span>
                                <p className="text-sm leading-6 text-white/70">{benefit}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 sm:p-8 shadow-2xl shadow-black/35 backdrop-blur-xl">
                    <div className="mb-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                            Secure Account Access
                        </p>
                        <h2 className="mt-3 text-2xl font-semibold text-white">
                            {mode === "signup" ? "Set up your account" : "Enter your account details"}
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <label className="flex flex-col gap-2 text-sm text-white/75">
                            Email
                            <input
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="you@company.com"
                                className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white outline-none transition-colors placeholder:text-white/25 focus:border-indigo-400/50"
                                disabled={submitting}
                            />
                        </label>

                        <label className="flex flex-col gap-2 text-sm text-white/75">
                            Password
                            <input
                                type="password"
                                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                                className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white outline-none transition-colors placeholder:text-white/25 focus:border-indigo-400/50"
                                disabled={submitting}
                            />
                        </label>

                        {error ? (
                            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200/90">
                                {error}
                            </div>
                        ) : null}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-2 h-12 rounded-2xl border border-indigo-400/20 bg-gradient-to-r from-indigo-500 to-cyan-500 text-sm font-semibold text-white shadow-[0_18px_50px_-18px_rgba(59,130,246,0.7)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {submitting ? "Please wait..." : content.submit}
                        </button>
                    </form>

                    <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-white/45">
                        <span>{content.alternateLabel}</span>
                        <Link href={alternateHref} className="font-semibold text-indigo-300 hover:text-indigo-200">
                            {content.alternateCta}
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    );
}
