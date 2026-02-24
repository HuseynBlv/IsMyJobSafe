/**
 * POST /api/premium/protection-plan
 *
 * Protected by middleware.ts — requires an active subscription
 * and a valid `x-user-email` header.
 *
 * Request body:  { "analysisId": "<MongoDB ObjectId string>" }
 * Response body: { "success": true, "plan": <QuarterPlan[]>, "cached": boolean }
 *             or { "success": false, "error": "<message>" }
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Analysis } from "@/models/Analysis";
import { ProtectionPlan } from "@/models/ProtectionPlan";
import { groq } from "@/lib/groq";
import {
    PREMIUM_PLAN_SYSTEM_PROMPT,
    buildPremiumPlanUserPrompt,
} from "@/lib/prompts";
import type { AnalysisResult } from "@/types/analysis";

export async function POST(request: NextRequest) {
    // --- 1. Parse body ---
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, error: "Request body must be valid JSON." },
            { status: 400 }
        );
    }

    const { analysisId } =
        (body as { analysisId?: string }) ?? {};

    if (!analysisId || typeof analysisId !== "string") {
        return NextResponse.json(
            { success: false, error: "analysisId is required." },
            { status: 400 }
        );
    }

    // email is guaranteed by middleware
    const userId = request.headers
        .get("x-user-email")!
        .toLowerCase()
        .trim();

    await connectDB();

    // --- 2. Check cache first (avoid re-generating) ---
    const existing = await ProtectionPlan.findOne({
        userId,
        analysisId,
    }).lean();

    if (existing) {
        return NextResponse.json({
            success: true,
            plan: existing.planJson,
            cached: true,
        });
    }

    // --- 3. Load stored analysis ---
    const analysisDoc = await Analysis.findById(analysisId).lean();
    if (!analysisDoc) {
        return NextResponse.json(
            { success: false, error: "Analysis not found." },
            { status: 404 }
        );
    }

    const result = analysisDoc.result as AnalysisResult;

    // --- 4. Call Groq ---
    let rawText: string;
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
            messages: [
                { role: "system", content: PREMIUM_PLAN_SYSTEM_PROMPT },
                {
                    role: "user",
                    content: buildPremiumPlanUserPrompt(
                        result.replaceability_score,
                        result.automation_risk,
                        result.reasons ?? [],
                        result.recommended_upgrades ?? []
                    ),
                },
            ],
        });
        rawText = completion.choices[0]?.message?.content ?? "";
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
            { success: false, error: `Groq API error: ${msg}` },
            { status: 502 }
        );
    }

    // --- 5. Parse JSON response ---
    let parsed: { quarters: QuarterPlan[] };
    try {
        const jsonText = rawText
            .replace(/^```(?:json)?\n?/i, "")
            .replace(/\n?```$/, "")
            .trim();
        parsed = JSON.parse(jsonText);
        if (!Array.isArray(parsed?.quarters) || parsed.quarters.length !== 4) {
            throw new Error("Invalid plan structure.");
        }
    } catch {
        return NextResponse.json(
            {
                success: false,
                error: `Failed to parse Groq response. Raw: ${rawText.slice(0, 200)}`,
            },
            { status: 422 }
        );
    }

    // --- 6. Cache in MongoDB ---
    try {
        await ProtectionPlan.create({
            userId,
            analysisId,
            planJson: parsed.quarters,
        });
    } catch (dbErr) {
        // Non-fatal — return the plan even if caching fails
        console.error("[protection-plan] DB save error:", dbErr);
    }

    return NextResponse.json({
        success: true,
        plan: parsed.quarters,
        cached: false,
    });
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface QuarterPlan {
    quarter: 1 | 2 | 3 | 4;
    objective: string;
    skill_focus: string;
    project_suggestion: string;
    career_positioning: string;
}
