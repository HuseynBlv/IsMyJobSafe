/**
 * Validated environment variable access.
 * Throws at startup if a required variable is missing.
 */

function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

/** Optional — returns undefined instead of throwing */
function optionalEnv(key: string): string | undefined {
    return process.env[key];
}

export const env = {
    // Anthropic
    ANTHROPIC_API_KEY: requireEnv("ANTHROPIC_API_KEY"),

    // MongoDB
    MONGODB_URI: requireEnv("MONGODB_URI"),

    // Paddle (server-side only)
    PADDLE_API_KEY: requireEnv("PADDLE_API_KEY"),
    PADDLE_WEBHOOK_SECRET: requireEnv("PADDLE_WEBHOOK_SECRET"),
    PADDLE_PRICE_ID: requireEnv("PADDLE_PRICE_ID"),

    // Optional: used to detect sandbox mode server-side
    PADDLE_ENV: (optionalEnv("NEXT_PUBLIC_PADDLE_ENV") ?? "sandbox") as
        | "sandbox"
        | "production",

    // LLM Provider
    LLM_PROVIDER: (optionalEnv("LLM_PROVIDER") ?? "anthropic") as "anthropic" | "groq",
    GROQ_API_KEY: optionalEnv("GROQ_API_KEY"),
} as const;
