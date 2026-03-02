import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireOwnedReport } from "@/lib/premium-access";
import { Analysis } from "@/models/Analysis";
import { ProtectionPlan } from "@/models/ProtectionPlan";
import { groq } from "@/lib/groq";
import {
    PREMIUM_PLAN_SYSTEM_PROMPT,
    buildPremiumPlanUserPrompt,
} from "@/lib/prompts";
import type { AnalysisResult } from "@/types/analysis";
import type { QuarterImpact, QuarterPlan } from "@/types/protection-plan";

const PROTECTION_PLAN_VERSION = 2;

function isQuarterNumber(value: unknown): value is QuarterPlan["quarter"] {
    return value === 1 || value === 2 || value === 3 || value === 4;
}

function cleanString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeImpact(value: unknown): QuarterImpact {
    if (value === "high" || value === "medium" || value === "foundational") {
        return value;
    }
    return "medium";
}

function normalizeActions(value: unknown, legacy: Record<string, unknown>) {
    if (Array.isArray(value)) {
        const actions = value
            .map((item) => cleanString(item))
            .filter(Boolean)
            .slice(0, 3);
        if (actions.length === 3) {
            return actions as QuarterPlan["top_actions"];
        }
    }

    const fallback = [
        cleanString(legacy.skill_focus),
        cleanString(legacy.project_suggestion),
        cleanString(legacy.career_positioning),
    ].filter(Boolean);

    if (fallback.length === 3) {
        return fallback as QuarterPlan["top_actions"];
    }

    return null;
}

function normalizeQuarterPlan(input: unknown, index: number): QuarterPlan | null {
    if (!input || typeof input !== "object") {
        return null;
    }

    const raw = input as Record<string, unknown>;
    const quarter = raw.quarter;
    const objective = cleanString(raw.objective);
    const whyThisMatters =
        cleanString(raw.why_this_matters) ||
        cleanString(raw.skill_focus) ||
        cleanString(raw.project_suggestion);
    const measurableOutcome =
        cleanString(raw.measurable_outcome) ||
        cleanString(raw.project_suggestion) ||
        cleanString(raw.skill_focus);
    const careerPositioningMove =
        cleanString(raw.career_positioning_move) ||
        cleanString(raw.career_positioning);
    const topActions = normalizeActions(raw.top_actions, raw);

    if (
        !isQuarterNumber(quarter) ||
        quarter !== index + 1 ||
        !objective ||
        !whyThisMatters ||
        !topActions ||
        !measurableOutcome ||
        !careerPositioningMove
    ) {
        return null;
    }

    return {
        quarter,
        objective,
        why_this_matters: whyThisMatters,
        top_actions: topActions,
        measurable_outcome: measurableOutcome,
        estimated_impact: normalizeImpact(raw.estimated_impact),
        career_positioning_move: careerPositioningMove,
    };
}

function normalizePlan(input: unknown): QuarterPlan[] | null {
    if (!Array.isArray(input) || input.length !== 4) {
        return null;
    }

    const normalized = input.map((quarter, index) => normalizeQuarterPlan(quarter, index));
    if (normalized.some((quarter) => quarter === null)) {
        return null;
    }

    return normalized as QuarterPlan[];
}

function hasStructuredPlanShape(input: unknown) {
    if (!Array.isArray(input) || input.length !== 4) {
        return false;
    }

    return input.every((quarter) => {
        if (!quarter || typeof quarter !== "object") {
            return false;
        }

        const record = quarter as Record<string, unknown>;
        return (
            typeof record.why_this_matters === "string" &&
            Array.isArray(record.top_actions) &&
            record.top_actions.length === 3 &&
            typeof record.measurable_outcome === "string" &&
            typeof record.career_positioning_move === "string"
        );
    });
}

function inferRoleFocus(profileText: string, targetRole: string | null) {
    if (targetRole) {
        return targetRole.trim();
    }

    const firstMeaningfulLine = profileText
        .split("\n")
        .map((line) => line.trim())
        .find(Boolean);

    return (firstMeaningfulLine || "the current role described in the profile").slice(0, 120);
}

function buildWeakDimensions(result: AnalysisResult) {
    const signals: string[] = [];

    if (result.replaceability_score >= 70) {
        signals.push("Overall replaceability pressure is high, so the plan should prioritize fast defensibility gains.");
    } else if (result.replaceability_score >= 50) {
        signals.push("Replaceability pressure is moderate, so the plan should focus on compounding differentiation.");
    } else {
        signals.push("Replaceability pressure is lower, so the plan should reinforce durable advantages before they erode.");
    }

    if (result.automation_risk === "high") {
        signals.push("Automation pressure is high, which means repetitive and rules-based work should be reduced first.");
    } else if (result.automation_risk === "medium") {
        signals.push("Automation pressure is material, so the role needs stronger judgment-heavy and ownership-heavy work.");
    } else {
        signals.push("Automation pressure is lower, but the plan should still increase strategic ownership and reduce future exposure.");
    }

    if (result.skill_defensibility_score <= 40) {
        signals.push("Skill defensibility is weak, so the roadmap should build rarer, harder-to-substitute capabilities early.");
    } else if (result.skill_defensibility_score <= 65) {
        signals.push("Skill defensibility is average, so targeted specialization should become a priority.");
    } else {
        signals.push("Skill defensibility is already solid, so the roadmap should convert that into stronger market leverage.");
    }

    if (result.market_saturation === "high") {
        signals.push("Market competition is high, so visible differentiation and positioning matter more than generic skill-building.");
    } else if (result.market_saturation === "medium") {
        signals.push("Market competition is moderate, so the plan should combine credibility-building with stronger positioning.");
    } else {
        signals.push("Market competition is lower, so the plan can focus more on leverage and long-term moat building.");
    }

    if (result.comparison_percentile <= 40) {
        signals.push("Current market standing is below stronger peers, so the plan needs tangible proof-of-skill milestones.");
    }

    return signals;
}

export async function POST(request: NextRequest) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, error: "Request body must be valid JSON." },
            { status: 400 }
        );
    }

    const { analysisId } = (body as { analysisId?: string }) ?? {};

    if (!analysisId || typeof analysisId !== "string") {
        return NextResponse.json(
            { success: false, error: "analysisId is required." },
            { status: 400 }
        );
    }

    const access = await requireOwnedReport(request, analysisId);
    if (!access.ok) {
        return access.response;
    }

    const userId = access.access.userKey;

    await connectDB();

    const existing = await ProtectionPlan.findOne({
        userId,
        analysisId,
    }).lean();

    if (existing?.planVersion === PROTECTION_PLAN_VERSION && hasStructuredPlanShape(existing.planJson)) {
        const normalizedExisting = normalizePlan(existing.planJson);
        if (normalizedExisting) {
            return NextResponse.json({
                success: true,
                plan: normalizedExisting,
                cached: true,
            });
        }
    }

    const analysisDoc = await Analysis.findById(analysisId).lean();
    if (!analysisDoc) {
        return NextResponse.json(
            { success: false, error: "Analysis not found." },
            { status: 404 }
        );
    }

    const result = analysisDoc.result as AnalysisResult;
    const profileText = typeof analysisDoc.profileText === "string" ? analysisDoc.profileText : "";
    const targetRole = typeof analysisDoc.targetRole === "string" ? analysisDoc.targetRole : null;
    const roleFocus = inferRoleFocus(profileText, targetRole);
    const weakDimensions = buildWeakDimensions(result);

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
                        roleFocus,
                        profileText,
                        result.replaceability_score,
                        result.automation_risk,
                        result.reasons ?? [],
                        result.recommended_upgrades ?? [],
                        weakDimensions
                    ),
                },
            ],
        });
        rawText = completion.choices[0]?.message?.content ?? "";
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
            { success: false, error: `Groq API error: ${message}` },
            { status: 502 }
        );
    }

    let parsed: { quarters: QuarterPlan[] };
    try {
        const jsonText = rawText
            .replace(/^```(?:json)?\n?/i, "")
            .replace(/\n?```$/, "")
            .trim();
        const candidate = JSON.parse(jsonText);
        const normalized = normalizePlan(candidate?.quarters);
        if (!normalized) {
            throw new Error("Invalid plan structure.");
        }
        parsed = { quarters: normalized };
    } catch {
        return NextResponse.json(
            {
                success: false,
                error: `Failed to parse Groq response. Raw: ${rawText.slice(0, 200)}`,
            },
            { status: 422 }
        );
    }

    try {
        await ProtectionPlan.findOneAndUpdate(
            { userId, analysisId },
            {
                userId,
                analysisId,
                planVersion: PROTECTION_PLAN_VERSION,
                planJson: parsed.quarters,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (dbError) {
        console.error("[protection-plan] DB save error:", dbError);
    }

    return NextResponse.json({
        success: true,
        plan: parsed.quarters,
        cached: false,
    });
}
