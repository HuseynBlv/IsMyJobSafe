import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { MonitoringEvent } from "@/models/MonitoringEvent";

export const metadata: Metadata = {
    title: "Monitoring Debug | IsMyJobSafe",
    description: "Internal monitoring event viewer.",
    robots: {
        index: false,
        follow: false,
    },
};

interface MonitoringPageProps {
    searchParams: Promise<{
        key?: string;
    }>;
}

function formatTimestamp(value: Date) {
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "medium",
    }).format(value);
}

export default async function MonitoringDebugPage({
    searchParams,
}: MonitoringPageProps) {
    const adminKey = process.env.ADMIN_MONITORING_KEY?.trim();
    const { key } = await searchParams;

    if (!adminKey) {
        return (
            <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
                <div className="rounded-3xl border border-amber-400/20 bg-amber-400/[0.06] p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
                        Monitoring Disabled
                    </p>
                    <h1 className="mt-3 text-2xl font-semibold text-white">
                        Set `ADMIN_MONITORING_KEY` to enable this page
                    </h1>
                    <p className="mt-3 text-sm leading-7 text-white/65 sm:text-base">
                        This debug page is intentionally locked behind a shared secret.
                        Add `ADMIN_MONITORING_KEY` to your environment, then open
                        `/debug/monitoring?key=your-secret`.
                    </p>
                </div>
            </main>
        );
    }

    if (!key || key !== adminKey) {
        notFound();
    }

    await connectDB();

    const eventDocs = await MonitoringEvent.find({})
        .select("event level message metadata createdAt")
        .sort({ createdAt: -1 })
        .limit(50);

    const events = eventDocs.map((doc) => ({
        id: doc._id.toString(),
        event: doc.event,
        level: doc.level,
        message: doc.message,
        metadata: doc.metadata,
        createdAt: doc.createdAt,
    }));

    return (
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
            <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                    Internal Debug
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                    Recent Monitoring Events
                </h1>
                <p className="text-sm leading-7 text-white/65 sm:text-base">
                    Showing the 50 most recent funnel and error events stored in
                    MongoDB.
                </p>
            </section>

            <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                {events.length === 0 ? (
                    <div className="px-6 py-8 text-sm text-white/60">
                        No monitoring events have been recorded yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                            <thead className="bg-white/[0.02] text-white/60">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Time</th>
                                    <th className="px-4 py-3 font-medium">Event</th>
                                    <th className="px-4 py-3 font-medium">Level</th>
                                    <th className="px-4 py-3 font-medium">Message</th>
                                    <th className="px-4 py-3 font-medium">Metadata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {events.map((event) => (
                                    <tr key={event.id} className="align-top">
                                        <td className="px-4 py-4 text-white/70">
                                            {formatTimestamp(event.createdAt)}
                                        </td>
                                        <td className="px-4 py-4 text-white">
                                            {event.event}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span
                                                className={
                                                    event.level === "error"
                                                        ? "rounded-full border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs font-medium text-red-200"
                                                        : "rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-200"
                                                }
                                            >
                                                {event.level}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-white/70">
                                            {event.message ?? "—"}
                                        </td>
                                        <td className="px-4 py-4 text-white/60">
                                            <pre className="max-w-xl overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6">
                                                {JSON.stringify(event.metadata ?? {}, null, 2)}
                                            </pre>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}
