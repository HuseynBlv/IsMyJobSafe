/**
 * POST /api/premium/market-comparison
 *
 * Protected by middleware.ts — requires active subscription + x-user-email header.
 *
 * Request body:  { "analysisId": "..." }
 * Response body: { "success": true, "comparison": MarketComparisonResult, "cached": boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Analysis } from "@/models/Analysis";
import { MarketComparison } from "@/models/MarketComparison";
import { groq } from "@/lib/groq";
import {
    MARKET_COMPARISON_SYSTEM_PROMPT,
    buildMarketComparisonUserPrompt,
} from "@/lib/prompts";
import type { AnalysisResult } from "@/types/analysis";

export interface MarketComparisonResult {
    percentile: number;
    percentile_label: string;
    summary: string;
    strengths: Array<{ area: string; detail: string }>;
    weaknesses: Array<{ area: string; detail: string }>;
    positioning_advice: string;
}

export async function POST(request: NextRequest) {
    // ── 1. Parse & validate ──────────────────────────────────────────────────
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 }); }

    const { analysisId } = (body as { analysisId?: string }) ?? {};
    if (!analysisId || typeof analysisId !== "string") {
        return NextResponse.json({ success: false, error: "analysisId is required." }, { status: 400 });
    }

    const userId = request.headers.get("x-user-email")!.toLowerCase().trim();

    await connectDB();

    // ── 2. Cache check ───────────────────────────────────────────────────────
    const existing = await MarketComparison.findOne({ userId, analysisId }).lean();
    if (existing) {
        return NextResponse.json({ success: true, comparison: existing.comparison, cached: true });
    }

    // ── 3. Load stored analysis ──────────────────────────────────────────────
    const analysisDoc = await Analysis.findById(analysisId).lean();
    if (!analysisDoc) {
        return NextResponse.json({ success: false, error: "Analysis not found." }, { status: 404 });
    }

    const result = analysisDoc.result as AnalysisResult;
    const profile = analysisDoc.profileText as string;

    // ── 4. Call Groq ─────────────────────────────────────────────────────────
    let rawText: string;
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.35,
            messages: [
                { role: "system", content: MARKET_COMPARISON_SYSTEM_PROMPT },
                {
                    role: "user",
                    content: buildMarketComparisonUserPrompt(
                        result.replaceability_score,
                        result.skill_defensibility_score,
                        result.automation_risk,
                        result.market_saturation,
                        result.comparison_percentile,
                        result.reasons ?? [],
                        result.recommended_upgrades ?? [],
                        profile
                    ),
                },
            ],
        });
        rawText = completion.choices[0]?.message?.content ?? "";
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ success: false, error: `Groq API error: ${msg}` }, { status: 502 });
    }

    // ── 5. Parse & validate ──────────────────────────────────────────────────
    let parsed: MarketComparisonResult;
    try {
        const jsonText = rawText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
        parsed = JSON.parse(jsonText);
        if (
            typeof parsed?.percentile !== "number" ||
            !Array.isArray(parsed?.strengths) ||
            !Array.isArray(parsed?.weaknesses)
        ) {
            throw new Error("Invalid structure.");
        }
        // Clamp percentile to 0-100
        parsed.percentile = Math.max(0, Math.min(100, Math.round(parsed.percentile)));
    } catch {
        return NextResponse.json(
            { success: false, error: `Failed to parse Groq response. Raw: ${rawText.slice(0, 300)}` },
            { status: 422 }
        );
    }

    // ── 6. Cache ─────────────────────────────────────────────────────────────
    try {
        await MarketComparison.create({ userId, analysisId, comparison: parsed });
    } catch (dbErr) {
        console.error("[market-comparison] DB save error:", dbErr);
    }

    return NextResponse.json({ success: true, comparison: parsed, cached: false });
}
