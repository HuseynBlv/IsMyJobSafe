/**
 * Singleton Anthropic client.
 * Reuses a single instance across hot-reloads in dev.
 */

import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

const globalForAnthropic = globalThis as typeof globalThis & {
    _anthropicClient?: Anthropic;
};

export const anthropic =
    globalForAnthropic._anthropicClient ??
    new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

if (process.env.NODE_ENV !== "production") {
    globalForAnthropic._anthropicClient = anthropic;
}
