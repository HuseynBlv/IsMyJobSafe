/**
 * Zod schema and validation layer for the AnalysisResult.
 * This is the single source of truth for output shape validation.
 */

import { z } from "zod";
import type { AnalysisResult } from "@/types/analysis";

const RiskLevelSchema = z.enum(["low", "medium", "high"]);

export const AnalysisResultSchema = z.object({
    replaceability_score: z
        .number()
        .int()
        .min(0)
        .max(100),
    automation_risk: RiskLevelSchema,
    skill_defensibility_score: z
        .number()
        .int()
        .min(0)
        .max(100),
    market_saturation: RiskLevelSchema,
    reasons: z
        .array(z.string().min(1))
        .min(1)
        .max(10),
    recommended_upgrades: z
        .array(z.string().min(1))
        .min(1)
        .max(10),
    comparison_percentile: z.number().int().min(0).max(100),
    confidence: z.number().int().min(0).max(100),
});

export type ValidatedAnalysisResult = z.infer<typeof AnalysisResultSchema>;

/**
 * Parse and validate a raw object against the AnalysisResult schema.
 * Returns the validated result, or throws a descriptive ZodError.
 */
export function validateAnalysisResult(raw: unknown): AnalysisResult {
    const parsed = AnalysisResultSchema.parse(raw);
    return parsed as AnalysisResult;
}

/**
 * Safe variant — returns { success, data } or { success, error }.
 */
export function safeValidateAnalysisResult(raw: unknown):
    | { success: true; data: AnalysisResult }
    | { success: false; error: string } {
    const result = AnalysisResultSchema.safeParse(raw);
    if (result.success) {
        return { success: true, data: result.data as AnalysisResult };
    }
    const message = result.error.issues
        .map((e: import("zod").ZodIssue) => `${(e.path as (string | number)[]).join(".")}: ${e.message}`)
        .join("; ");
    return { success: false, error: `Validation failed: ${message}` };
}
