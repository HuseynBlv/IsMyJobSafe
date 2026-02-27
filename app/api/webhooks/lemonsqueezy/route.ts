import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Subscription } from "@/models/Subscription";
import { env } from "@/lib/env";

interface LemonWebhookPayload {
    meta?: {
        event_name?: string;
        custom_data?: Record<string, unknown>;
    };
    data?: {
        id?: string;
        attributes?: {
            identifier?: string;
            user_email?: string;
            customer_id?: number | string | null;
            status?: string;
        };
    };
}

function verifySignature(rawBody: string, signatureHeader: string, secret: string): boolean {
    const digest = crypto
        .createHmac("sha256", secret)
        .update(rawBody, "utf8")
        .digest("hex");

    const expected = Buffer.from(digest, "hex");
    const received = Buffer.from(signatureHeader, "hex");

    if (expected.length !== received.length) {
        return false;
    }

    return crypto.timingSafeEqual(expected, received);
}

function normalizeEmail(payload: LemonWebhookPayload): string | null {
    const raw =
        payload.data?.attributes?.user_email ??
        (typeof payload.meta?.custom_data?.email === "string"
            ? payload.meta.custom_data.email
            : null);

    if (!raw || typeof raw !== "string") {
        return null;
    }

    const email = raw.toLowerCase().trim();
    return email.includes("@") ? email : null;
}

export async function POST(request: NextRequest) {
    if (!env.LEMON_SQUEEZY_WEBHOOK_SECRET) {
        return NextResponse.json(
            { success: false, error: "LEMON_SQUEEZY_WEBHOOK_SECRET is not configured." },
            { status: 500 }
        );
    }

    const signature = request.headers.get("x-signature");
    if (!signature) {
        return NextResponse.json({ success: false, error: "Missing x-signature header." }, { status: 401 });
    }

    let rawBody: string;
    try {
        rawBody = await request.text();
    } catch {
        return NextResponse.json({ success: false, error: "Unable to read request body." }, { status: 400 });
    }

    if (!verifySignature(rawBody, signature, env.LEMON_SQUEEZY_WEBHOOK_SECRET)) {
        return NextResponse.json({ success: false, error: "Invalid webhook signature." }, { status: 401 });
    }

    let payload: LemonWebhookPayload;
    try {
        payload = JSON.parse(rawBody) as LemonWebhookPayload;
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON payload." }, { status: 400 });
    }

    const eventName = payload.meta?.event_name;
    const email = normalizeEmail(payload);

    if (!eventName) {
        return NextResponse.json({ success: false, error: "Missing event name." }, { status: 400 });
    }

    // Ignore events we don't need for one-time checkout unlocks.
    if (!["order_created", "order_refunded", "subscription_created", "subscription_updated", "subscription_cancelled", "subscription_expired"].includes(eventName)) {
        return NextResponse.json({ success: true, ignored: true, event: eventName });
    }

    if (!email) {
        return NextResponse.json(
            { success: false, error: "Webhook payload missing a valid customer email." },
            { status: 400 }
        );
    }

    try {
        await connectDB();

        const entityId = payload.data?.id ? String(payload.data.id) : undefined;
        const isSubscriptionEvent = eventName.startsWith("subscription_");
        const lemonOrderId = !isSubscriptionEvent ? entityId : undefined;
        const lemonSubscriptionId = isSubscriptionEvent ? entityId : undefined;
        const lemonOrderIdentifier = payload.data?.attributes?.identifier;
        const lemonCustomerId =
            payload.data?.attributes?.customer_id != null
                ? String(payload.data.attributes.customer_id)
                : undefined;

        let mappedStatus: "active" | "cancelled" | "past_due" | "trialing" | null = null;
        if (eventName === "order_created") {
            mappedStatus = "active";
        } else if (
            eventName === "subscription_created" ||
            eventName === "subscription_updated"
        ) {
            const lsStatus = payload.data?.attributes?.status ?? "";
            mappedStatus =
                lsStatus === "active"
                    ? "active"
                    : lsStatus === "on_trial"
                        ? "trialing"
                        : lsStatus === "past_due" || lsStatus === "unpaid"
                            ? "past_due"
                            : lsStatus === "cancelled" || lsStatus === "expired"
                                ? "cancelled"
                                : null;
        } else if (
            eventName === "order_refunded" ||
            eventName === "subscription_cancelled" ||
            eventName === "subscription_expired"
        ) {
            mappedStatus = "cancelled";
        }

        if (!mappedStatus) {
            return NextResponse.json({ success: true, ignored: true, event: eventName });
        }

        await Subscription.findOneAndUpdate(
            { email },
            {
                $set: {
                    email,
                    status: mappedStatus,
                    paymentProvider: "lemonsqueezy",
                    ...(lemonOrderId ? { lemonOrderId } : {}),
                    ...(lemonSubscriptionId ? { lemonSubscriptionId } : {}),
                    ...(lemonOrderIdentifier ? { lemonOrderIdentifier } : {}),
                    ...(lemonCustomerId ? { lemonCustomerId } : {}),
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return NextResponse.json({ success: true, event: eventName, email });
    } catch (error) {
        console.error("[Lemon Squeezy Webhook] Error processing event:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
