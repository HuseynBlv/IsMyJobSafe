/**
 * POST /api/analyze
 *
 * Request body:  { "profile": "<raw profile text>", "targetRole"?: "<optional role focus>" }
 * Response body: { "success": true, "data": <AnalysisResult> }
 *             or { "success": false, "error": "<message>" }
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeProfile } from "@/services/analysis.service";
import { connectDB } from "@/lib/db";
import { Analysis } from "@/models/Analysis";
import { enforceRateLimit } from "@/lib/rate-limit";
import { captureServerError, trackFunnelEvent } from "@/lib/monitoring";

export async function POST(request: NextRequest) {
    const rateLimitResponse = await enforceRateLimit(request, {
        keyPrefix: "analyze",
        limit: 8,
        windowMs: 60_000,
    });
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    // --- Parse request body ---
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, error: "Request body must be valid JSON." },
            { status: 400 }
        );
    }

    if (
        typeof body !== "object" ||
        body === null ||
        !("profile" in body) ||
        typeof (body as Record<string, unknown>).profile !== "string"
    ) {
        return NextResponse.json(
            {
                success: false,
                error: 'Request body must contain a "profile" string field.',
            },
            { status: 400 }
        );
    }

    const payload = body as { profile: string; targetRole?: unknown };
    const profile = payload.profile;
    const targetRole =
        typeof payload.targetRole === "string" && payload.targetRole.trim()
            ? payload.targetRole.trim().slice(0, 120)
            : null;

    await trackFunnelEvent("analysis_started", {
        hasTargetRole: Boolean(targetRole),
        profileLength: profile.length,
    });

    // --- Run analysis pipeline ---
    const outcome = await analyzeProfile(profile);

    if (!outcome.success) {
        const statusCode =
            outcome.code === "INVALID_INPUT"
                ? 400
                : outcome.code === "VALIDATION_ERROR" || outcome.code === "PARSE_ERROR"
                    ? 422
                    : 502;

        if (statusCode >= 500) {
            await captureServerError("analyze_profile_failed", outcome.error, {
                code: outcome.code,
            });
        }

        return NextResponse.json(
            { success: false, error: outcome.error },
            { status: statusCode }
        );
    }

    // --- Save to Database ---
    let analysisId = null;
    try {
        await connectDB();
        const analysisDoc = await Analysis.create({
            profileText: profile,
            targetRole,
            result: outcome.data,
        });
        analysisId = analysisDoc._id.toString();
    } catch (dbError) {
        console.error("[analyze] Failed to save analysis to DB:", dbError);
        await captureServerError("analyze_save_failed", dbError, {
            hasTargetRole: Boolean(targetRole),
        });
        return NextResponse.json(
            {
                success: false,
                error: "We couldn't save your analysis. Please try again.",
            },
            { status: 500 }
        );
    }

    await trackFunnelEvent("analysis_completed", {
        analysisId,
        hasTargetRole: Boolean(targetRole),
    });

    return NextResponse.json({ success: true, data: outcome.data, analysisId }, { status: 200 });
}

// Reject non-POST methods explicitly
export async function GET() {
    return NextResponse.json(
        { success: false, error: "Method not allowed. Use POST." },
        { status: 405 }
    );
}
