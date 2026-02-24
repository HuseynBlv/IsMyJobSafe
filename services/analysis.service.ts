/**
 * Analysis Service — orchestration layer.
 *
 * Responsibilities:
 * 1. Validate input (non-empty profile text)
 * 2. Call the LLM service
 * 3. Parse the raw JSON response
 * 4. Validate the parsed object against the schema
 * 5. Return a typed AnalysisResult
 */

import { callLLM } from "./llm.service";
import { safeValidateAnalysisResult } from "@/lib/validators";
import type { AnalysisResult } from "@/types/analysis";

const MIN_PROFILE_LENGTH = 20;
const MAX_PROFILE_LENGTH = 10_000;

export interface AnalysisSuccess {
    success: true;
    data: AnalysisResult;
}

export interface AnalysisFailure {
    success: false;
    error: string;
    code: "INVALID_INPUT" | "LLM_ERROR" | "PARSE_ERROR" | "VALIDATION_ERROR";
}

export type AnalysisOutcome = AnalysisSuccess | AnalysisFailure;

/**
 * Run the full replaceability analysis pipeline for a given profile text.
 */
export async function analyzeProfile(
    profileText: string
): Promise<AnalysisOutcome> {
    // --- 1. Input validation ---
    const trimmed = profileText?.trim() ?? "";

    if (trimmed.length < MIN_PROFILE_LENGTH) {
        return {
            success: false,
            code: "INVALID_INPUT",
            error: `Profile text is too short. Provide at least ${MIN_PROFILE_LENGTH} characters describing the role or background.`,
        };
    }

    if (trimmed.length > MAX_PROFILE_LENGTH) {
        return {
            success: false,
            code: "INVALID_INPUT",
            error: `Profile text exceeds the maximum allowed length of ${MAX_PROFILE_LENGTH} characters.`,
        };
    }

    // --- 2. LLM call ---
    let rawText: string;
    try {
        rawText = await callLLM(trimmed);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            code: "LLM_ERROR",
            error: `Claude API request failed: ${message}`,
        };
    }

    // --- 3. JSON parsing ---
    let parsed: unknown;
    try {
        // Strip any accidental markdown fences that Claude might emit
        const jsonText = rawText
            .replace(/^```(?:json)?\n?/i, "")
            .replace(/\n?```$/, "")
            .trim();
        parsed = JSON.parse(jsonText);
    } catch {
        return {
            success: false,
            code: "PARSE_ERROR",
            error: `Failed to parse Claude's response as JSON. Raw response: ${rawText.slice(0, 200)}`,
        };
    }

    // --- 4. Schema validation ---
    const validation = safeValidateAnalysisResult(parsed);
    if (!validation.success) {
        return {
            success: false,
            code: "VALIDATION_ERROR",
            error: validation.error,
        };
    }

    // --- 5. Return validated result ---
    return { success: true, data: validation.data };
}
