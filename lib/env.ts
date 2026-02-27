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

    // Optional: used to detect sandbox mode server-side (legacy, can be removed if unused)
    PADDLE_ENV: (optionalEnv("NEXT_PUBLIC_PADDLE_ENV") ?? "sandbox") as
        | "sandbox"
        | "production",

    // LLM Provider
    LLM_PROVIDER: (optionalEnv("LLM_PROVIDER") ?? "anthropic") as "anthropic" | "groq",
    GROQ_API_KEY: optionalEnv("GROQ_API_KEY"),

    // Lemon Squeezy (Payments)
    LEMON_SQUEEZY_API_KEY: optionalEnv("LEMON_SQUEEZY_API_KEY"),
    LEMON_SQUEEZY_STORE_ID: optionalEnv("LEMON_SQUEEZY_STORE_ID"),
    LEMON_SQUEEZY_VARIANT_ID: optionalEnv("LEMON_SQUEEZY_VARIANT_ID"),
    LEMON_SQUEEZY_WEBHOOK_SECRET: optionalEnv("LEMON_SQUEEZY_WEBHOOK_SECRET"),
    LEMON_SQUEEZY_SUCCESS_URL: optionalEnv("LEMON_SQUEEZY_SUCCESS_URL"),
    LEMON_SQUEEZY_CHECKOUT_TEST_MODE:
        (optionalEnv("LEMON_SQUEEZY_CHECKOUT_TEST_MODE") ?? "false") === "true",
} as const;
