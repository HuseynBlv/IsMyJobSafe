import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireOwnedReport } from "@/lib/premium-access";
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
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
    }

    const { analysisId } = (body as { analysisId?: string }) ?? {};
    if (!analysisId || typeof analysisId !== "string") {
        return NextResponse.json({ success: false, error: "analysisId is required." }, { status: 400 });
    }

    const access = await requireOwnedReport(request, analysisId);
    if (!access.ok) {
        return access.response;
    }

    const userId = access.access.userKey;

    await connectDB();

    const existing = await MarketComparison.findOne({ userId, analysisId }).lean();
    if (existing) {
        return NextResponse.json({ success: true, comparison: existing.comparison, cached: true });
    }

    const analysisDoc = await Analysis.findById(analysisId).lean();
    if (!analysisDoc) {
        return NextResponse.json({ success: false, error: "Analysis not found." }, { status: 404 });
    }

    const result = analysisDoc.result as AnalysisResult;
    const profile = analysisDoc.profileText as string;

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
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ success: false, error: `Groq API error: ${message}` }, { status: 502 });
    }

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
        parsed.percentile = Math.max(0, Math.min(100, Math.round(parsed.percentile)));
    } catch {
        return NextResponse.json(
            { success: false, error: `Failed to parse Groq response. Raw: ${rawText.slice(0, 300)}` },
            { status: 422 }
        );
    }

    try {
        await MarketComparison.create({ userId, analysisId, comparison: parsed });
    } catch (dbError) {
        console.error("[market-comparison] DB save error:", dbError);
    }

    return NextResponse.json({ success: true, comparison: parsed, cached: false });
}
