/**
 * LLM Service — raw Claude API call.
 * Responsible only for calling Claude and returning the raw text response.
 * Error handling and parsing happen in the layer above.
 */

import { anthropic } from "@/lib/anthropic";
import { groq } from "@/lib/groq";
import { env } from "@/lib/env";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";

const CLAUDE_MODEL = "claude-sonnet-4-5"; // hypothetical model name from original file
const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_TOKENS = 1024;

/**
 * Calls the selected LLM provider with the given profile text.
 * Returns the raw response string (expected to be JSON).
 */
export async function callLLM(profileText: string): Promise<string> {
    const userMessage = {
        role: "user" as const,
        content: buildUserPrompt(profileText),
    };

    // ─── Groq (Llama 3) ────────────────────────────────────────────────
    if (env.LLM_PROVIDER === "groq") {
        if (!env.GROQ_API_KEY) {
            throw new Error("GROQ_API_KEY is missing but LLM_PROVIDER is set to 'groq'.");
        }
        if (!groq) {
            throw new Error("Groq client failed to initialize.");
        }

        const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                userMessage,
            ],
            max_tokens: MAX_TOKENS,
            temperature: 0.1,
            response_format: { type: "json_object" }, // Llama 3 supports JSON mode
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error("Unexpected response from Groq: no content");
        }
        return content.trim();
    }

    // ─── Anthropic (Claude) [Default] ──────────────────────────────────
    const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [userMessage],
    });

    // Extract text from the first content block
    const block = message.content[0];
    if (!block || block.type !== "text") {
        throw new Error("Unexpected response from Claude: no text block");
    }

    return block.text.trim();
}
import { PREMIUM_PLAN_SYSTEM_PROMPT, buildPremiumPlanUserPrompt } from "@/lib/prompts";

export async function callPremiumLLM(
    score: number,
    risk: string,
    reasons: string[],
    upgrades: string[]
): Promise<string> {
    const userMessage = {
        role: "user" as const,
        content: buildPremiumPlanUserPrompt(score, risk, reasons, upgrades),
    };

    if (env.LLM_PROVIDER === "groq") {
        if (!env.GROQ_API_KEY || !groq) {
            throw new Error("Groq client not initialized.");
        }

        const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [
                { role: "system", content: PREMIUM_PLAN_SYSTEM_PROMPT },
                userMessage,
            ],
            max_tokens: 2000,
            temperature: 0.2, // Slightly more creative for a 12-month plan
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        return content ? content.trim() : "";
    }

    // Anthropic
    const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        system: PREMIUM_PLAN_SYSTEM_PROMPT,
        messages: [userMessage],
    });

    const block = message.content[0];
    if (block?.type === "text") return block.text.trim();
    return "";
}
