/**
 * GET /api/subscription/status?email=user@example.com
 *
 * Returns the active subscription status for a given email.
 * Used client-side to gate premium feature reveals.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Subscription } from "@/models/Subscription";

export async function GET(request: NextRequest) {
    // ── Dev bypass ───────────────────────────────────────────────────────────
    if (
        process.env.DEV_PREMIUM_BYPASS === "true" &&
        process.env.NODE_ENV !== "production"
    ) {
        return NextResponse.json({ active: true, status: "active" });
    }

    const email = request.nextUrl.searchParams.get("email")?.toLowerCase().trim();

    if (!email || !email.includes("@")) {
        return NextResponse.json(
            { error: "Valid email query parameter required." },
            { status: 400 }
        );
    }

    await connectDB();

    const record = await Subscription.findOne({ email }).select("status currentPeriodEnd").lean();

    if (!record) {
        return NextResponse.json({ active: false, status: "none" });
    }

    // For subscriptions with expiry, confirm period hasn't ended
    const isActive =
        record.status === "active" &&
        (!record.currentPeriodEnd || record.currentPeriodEnd > new Date());

    return NextResponse.json({
        active: isActive,
        status: record.status,
        currentPeriodEnd: record.currentPeriodEnd ?? null,
    });
}
