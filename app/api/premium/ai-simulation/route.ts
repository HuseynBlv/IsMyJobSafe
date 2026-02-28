import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireOwnedReport } from "@/lib/premium-access";
import { Analysis } from "@/models/Analysis";
import { AiSimulation } from "@/models/AiSimulation";
import { groq } from "@/lib/groq";
import {
    AI_SIMULATION_SYSTEM_PROMPT,
    buildAiSimulationUserPrompt,
} from "@/lib/prompts";
import type { AnalysisResult } from "@/types/analysis";

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

    const existing = await AiSimulation.findOne({ userId, analysisId }).lean();
    if (existing) {
        return NextResponse.json({ success: true, simulation: existing.simulation, cached: true });
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
            temperature: 0.5,
            messages: [
                { role: "system", content: AI_SIMULATION_SYSTEM_PROMPT },
                {
                    role: "user",
                    content: buildAiSimulationUserPrompt(
                        result.replaceability_score,
                        result.automation_risk,
                        result.skill_defensibility_score,
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

    let parsed: SimulationResult;
    try {
        const jsonText = rawText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
        parsed = JSON.parse(jsonText);
        if (!Array.isArray(parsed?.years) || parsed.years.length !== 3) {
            throw new Error("Invalid shape.");
        }
    } catch {
        return NextResponse.json(
            { success: false, error: `Failed to parse Groq response. Raw: ${rawText.slice(0, 300)}` },
            { status: 422 }
        );
    }

    try {
        await AiSimulation.create({ userId, analysisId, simulation: parsed });
    } catch (dbError) {
        console.error("[ai-simulation] DB save error:", dbError);
    }

    return NextResponse.json({ success: true, simulation: parsed, cached: false });
}

export interface YearExposure {
    year: 1 | 2 | 3;
    exposure_level: "low" | "medium" | "high" | "critical";
    headline: string;
    key_change: string;
}

export interface TaskItem {
    task: string;
    reason: string;
}

export interface SimulationResult {
    summary: string;
    years: YearExposure[];
    tasks_at_risk: TaskItem[];
    tasks_safe: TaskItem[];
}
