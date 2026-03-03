import { connectDB } from "@/lib/db";
import {
    MonitoringEvent,
    type MonitoringEventLevel,
    type MonitoringEventName,
} from "@/models/MonitoringEvent";

interface MonitoringPayload {
    event: MonitoringEventName;
    level?: MonitoringEventLevel;
    message?: string | null;
    metadata?: Record<string, unknown>;
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined) {
    if (!metadata) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(metadata).filter(([, value]) => value !== undefined)
    );
}

async function writeMonitoringEvent(payload: MonitoringPayload) {
    const level = payload.level ?? "info";
    const message = payload.message ?? null;
    const metadata = sanitizeMetadata(payload.metadata);

    try {
        await connectDB();
        await MonitoringEvent.create({
            event: payload.event,
            level,
            message,
            metadata,
        });
    } catch (error) {
        console.error("[monitoring] Failed to persist event:", error);
    }

    if (level === "error") {
        console.error("[monitoring:event]", payload.event, message, metadata);
        return;
    }

    console.info("[monitoring:event]", payload.event, metadata);
}

export async function trackFunnelEvent(
    event: Extract<
        MonitoringEventName,
        "analysis_started" | "analysis_completed" | "checkout_started" | "checkout_completed"
    >,
    metadata?: Record<string, unknown>
) {
    await writeMonitoringEvent({
        event,
        level: "info",
        metadata,
    });
}

export async function trackWebhookFailure(
    provider: "lemonsqueezy" | "gumroad",
    message: string,
    metadata?: Record<string, unknown>
) {
    await writeMonitoringEvent({
        event: "webhook_failed",
        level: "error",
        message,
        metadata: {
            provider,
            ...metadata,
        },
    });
}

export async function captureServerError(
    context: string,
    error: unknown,
    metadata?: Record<string, unknown>
) {
    const message =
        error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";

    await writeMonitoringEvent({
        event: "server_error",
        level: "error",
        message,
        metadata: {
            context,
            ...metadata,
        },
    });
}
