/**
 * POST /api/webhook/paddle
 *
 * Receives Paddle Billing webhook events, verifies the signature,
 * and upserts the Subscription record in MongoDB.
 *
 * Critical: we must read the RAW body (arrayBuffer) before any parsing,
 * otherwise the HMAC won't match.
 */

import { NextRequest, NextResponse } from "next/server";
import { EventName } from "@paddle/paddle-node-sdk";
import { paddle } from "@/lib/paddle";
import { connectDB } from "@/lib/db";
import { Subscription } from "@/models/Subscription";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
    // 1. Read raw body — must happen BEFORE any JSON parsing
    const rawBody = await request.text();
    const signature = request.headers.get("paddle-signature") ?? "";

    // 2. Verify webhook signature
    let event;
    try {
        event = await paddle.webhooks.unmarshal(rawBody, env.PADDLE_WEBHOOK_SECRET, signature);
    } catch {
        console.error("[webhook/paddle] Signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (!event) {
        return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    }

    await connectDB();

    try {
        switch (event.eventType) {
            // ── Subscription events ─────────────────────────────────
            case EventName.SubscriptionActivated:
            case EventName.SubscriptionUpdated: {
                const sub = event.data;
                const email =
                    (sub.customData as Record<string, string> | null)?.email ?? "";
                const customerId = sub.customerId ?? "";
                const periodEnd = sub.currentBillingPeriod?.endsAt
                    ? new Date(sub.currentBillingPeriod.endsAt)
                    : undefined;

                // Map Paddle status → our status
                const statusMap: Record<string, string> = {
                    active: "active",
                    trialing: "trialing",
                    past_due: "past_due",
                    canceled: "cancelled",
                    cancelled: "cancelled",
                    paused: "cancelled",
                };
                const status = statusMap[sub.status] ?? "past_due";

                if (email && customerId) {
                    await Subscription.findOneAndUpdate(
                        { email: email.toLowerCase() },
                        {
                            email: email.toLowerCase(),
                            paddleCustomerId: customerId,
                            paddleSubscriptionId: sub.id,
                            status,
                            currentPeriodEnd: periodEnd,
                        },
                        { upsert: true, new: true }
                    );
                }
                break;
            }

            case EventName.SubscriptionCanceled: {
                const sub = event.data;
                await Subscription.findOneAndUpdate(
                    { paddleSubscriptionId: sub.id },
                    { status: "cancelled" }
                );
                break;
            }

            // ── One-time purchase (transaction.completed) ───────────
            case EventName.TransactionCompleted: {
                const tx = event.data;
                const email =
                    (tx.customData as Record<string, string> | null)?.email ?? "";
                const customerId = tx.customerId ?? "";

                if (email && customerId) {
                    await Subscription.findOneAndUpdate(
                        { email: email.toLowerCase() },
                        {
                            email: email.toLowerCase(),
                            paddleCustomerId: customerId,
                            paddleTransactionId: tx.id,
                            status: "active",
                            // One-time: no expiry
                            currentPeriodEnd: undefined,
                        },
                        { upsert: true, new: true }
                    );
                }
                break;
            }

            default:
                // Unhandled events are silently acknowledged
                break;
        }
    } catch (err) {
        console.error("[webhook/paddle] DB error:", err);
        // Return 500 so Paddle retries delivery
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    // Always 200 — Paddle treats non-2xx as failures and retries
    return NextResponse.json({ received: true });
}
