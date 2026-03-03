import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Use | IsMyJobSafe",
    description: "Terms governing access to IsMyJobSafe and its AI-generated reports.",
};

export default function TermsPage() {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
            <section className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                    Terms of Use
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Rules for using IsMyJobSafe
                </h1>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    By using IsMyJobSafe, you agree to use the service lawfully and to
                    provide only content you have the right to submit.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-medium text-white">Service scope</h2>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    IsMyJobSafe provides AI-generated career analysis for informational
                    purposes only. Reports are not financial, legal, employment, or
                    recruiting advice.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-medium text-white">Account responsibility</h2>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    You are responsible for maintaining the confidentiality of your
                    account credentials and for activity that occurs under your account.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-medium text-white">Payments</h2>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    Premium reports are sold as one-time purchases. Access is granted
                    after payment confirmation and is tied to the account and report
                    associated with the transaction.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-medium text-white">Acceptable use</h2>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    You must not abuse the service, attempt to bypass rate limits,
                    interfere with normal platform operation, or use the product to
                    violate the rights of others.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-medium text-white">No guarantees</h2>
                <p className="text-sm leading-7 text-white/70 sm:text-base">
                    AI-generated outputs may be incomplete or inaccurate. We do not
                    guarantee any employment outcome, salary result, or career decision.
                </p>
            </section>
        </main>
    );
}
