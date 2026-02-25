/**
 * POST /api/premium/salary-projection
 *
 * Protected by middleware.ts — requires active subscription + x-user-email header.
 *
 * Request body:  { "analysisId": "...", "salary": 85000, "country": "United States" }
 * Response body: { "success": true, "scenarios": SalaryScenario[], "cached": boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Analysis } from "@/models/Analysis";
import { SalaryProjection } from "@/models/SalaryProjection";
import { groq } from "@/lib/groq";
import {
    SALARY_PROJECTION_SYSTEM_PROMPT,
    buildSalaryProjectionUserPrompt,
} from "@/lib/prompts";
import type { AnalysisResult } from "@/types/analysis";

export interface SalaryScenario {
    id: "no_change" | "moderate_upskill" | "ai_resistant_pivot";
    label: string;
    description: string;
    salary_now: number;
    salary_year_1: number;
    salary_year_3: number;
    risk_commentary: string;
}

export async function POST(request: NextRequest) {
    // ── 1. Parse & validate request body ────────────────────────────────────
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, error: "Request body must be valid JSON." },
            { status: 400 }
        );
    }

    const { analysisId, salary, country } = (body as {
        analysisId?: string;
        salary?: number;
        country?: string;
    }) ?? {};

    if (!analysisId || typeof analysisId !== "string") {
        return NextResponse.json({ success: false, error: "analysisId is required." }, { status: 400 });
    }
    if (!salary || typeof salary !== "number" || salary <= 0) {
        return NextResponse.json({ success: false, error: "salary must be a positive number." }, { status: 400 });
    }
    if (!country || typeof country !== "string" || country.trim().length === 0) {
        return NextResponse.json({ success: false, error: "country is required." }, { status: 400 });
    }

    const userId = request.headers.get("x-user-email")!.toLowerCase().trim();

    await connectDB();

    // ── 2. Cache check ───────────────────────────────────────────────────────
    const existing = await SalaryProjection.findOne({ userId, analysisId }).lean();
    if (existing) {
        return NextResponse.json({ success: true, scenarios: existing.projections, cached: true });
    }

    // ── 3. Load stored analysis ──────────────────────────────────────────────
    const analysisDoc = await Analysis.findById(analysisId).lean();
    if (!analysisDoc) {
        return NextResponse.json({ success: false, error: "Analysis not found." }, { status: 404 });
    }

    const result = analysisDoc.result as AnalysisResult;

    // ── 4. Call Groq ─────────────────────────────────────────────────────────
    let rawText: string;
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.4, // Lower temp = more consistent, grounded numbers
            messages: [
                { role: "system", content: SALARY_PROJECTION_SYSTEM_PROMPT },
                {
                    role: "user",
                    content: buildSalaryProjectionUserPrompt(
                        salary,
                        country.trim(),
                        result.replaceability_score,
                        result.automation_risk,
                        result.skill_defensibility_score,
                        result.recommended_upgrades ?? []
                    ),
                },
            ],
        });
        rawText = completion.choices[0]?.message?.content ?? "";
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ success: false, error: `Groq API error: ${msg}` }, { status: 502 });
    }

    // ── 5. Parse & validate response ─────────────────────────────────────────
    let parsed: { scenarios: SalaryScenario[] };
    try {
        const jsonText = rawText
            .replace(/^```(?:json)?\n?/i, "")
            .replace(/\n?```$/, "")
            .trim();
        parsed = JSON.parse(jsonText);

        if (
            !Array.isArray(parsed?.scenarios) ||
            parsed.scenarios.length !== 3 ||
            parsed.scenarios.some(
                (s) =>
                    typeof s.salary_now !== "number" ||
                    typeof s.salary_year_1 !== "number" ||
                    typeof s.salary_year_3 !== "number"
            )
        ) {
            throw new Error("Invalid scenario structure.");
        }
    } catch {
        return NextResponse.json(
            { success: false, error: `Failed to parse Groq response. Raw: ${rawText.slice(0, 300)}` },
            { status: 422 }
        );
    }

    // ── 6. Cache in MongoDB ──────────────────────────────────────────────────
    try {
        await SalaryProjection.create({
            userId,
            analysisId,
            salary,
            country: country.trim(),
            projections: parsed.scenarios,
        });
    } catch (dbErr) {
        console.error("[salary-projection] DB save error:", dbErr);
        // Non-fatal — still return result
    }

    return NextResponse.json({ success: true, scenarios: parsed.scenarios, cached: false });
}
