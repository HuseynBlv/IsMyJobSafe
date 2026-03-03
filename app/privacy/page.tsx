import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Privacy Policy | IsMyJobSafe",
    description: "How IsMyJobSafe collects, uses, and stores profile and resume data.",
};

export default function PrivacyPage() {
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
                    Privacy Policy
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    How we handle your data
                </h1>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    IsMyJobSafe processes the profile, resume, and account data you
                    submit so we can generate career-risk analysis and store purchased
                    reports in your account.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-medium text-white">What we collect</h2>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    We collect the text you submit for analysis, uploaded resume text
                    extracted from PDFs, your account email address, and purchase
                    metadata needed to confirm and restore access to premium reports.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-medium text-white">How we use it</h2>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    Submitted content is used to generate AI analysis, improve report
                    delivery reliability, and let you reopen saved reports you have
                    purchased. We do not sell your personal data.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-medium text-white">Storage and retention</h2>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    Analysis results and purchased reports are stored in our database so
                    they can be retrieved from your account. You should avoid submitting
                    highly sensitive information that is not relevant to your work
                    history or role.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-medium text-white">Third-party services</h2>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    We rely on external providers for AI processing, hosting, database
                    storage, and payment processing. Those providers may process data as
                    needed to perform their services on our behalf.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-medium text-white">Contact</h2>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    If you need account or data help, contact the operator of this site
                    through the support channel listed on the product or deployment.
                </p>
            </section>
        </main>
    );
}
