import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Contact | IsMyJobSafe",
    description: "Contact IsMyJobSafe support.",
};

export default function ContactPage() {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
            <div>
                <Link
                    href="/"
                    className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                >
                    Back Home
                </Link>
            </div>

            <section className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                    Contact
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Get in touch
                </h1>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    For support, billing questions, feedback, or data-related requests,
                    contact us at the email below.
                </p>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-sm text-white/60">Support email</p>
                <a
                    href="mailto:ismyjobsafepro@gmail.com"
                    className="mt-2 inline-block text-lg font-medium text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
                >
                    ismyjobsafepro@gmail.com
                </a>
            </section>
        </main>
    );
}
