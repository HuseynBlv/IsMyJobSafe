import { NextRequest, NextResponse } from "next/server";

interface RateLimitOptions {
    keyPrefix: string;
    limit: number;
    windowMs: number;
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

declare global {
    var _rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore = global._rateLimitStore ?? new Map<string, RateLimitEntry>();

if (!global._rateLimitStore) {
    global._rateLimitStore = rateLimitStore;
}

function getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const firstIp = forwardedFor.split(",")[0]?.trim();
        if (firstIp) {
            return firstIp;
        }
    }

    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) {
        return realIp;
    }

    return "unknown";
}

function cleanupExpiredEntries(now: number) {
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt <= now) {
            rateLimitStore.delete(key);
        }
    }
}

export function enforceRateLimit(
    request: NextRequest,
    options: RateLimitOptions
): NextResponse | null {
    const now = Date.now();
    cleanupExpiredEntries(now);

    const clientIp = getClientIp(request);
    const bucketKey = `${options.keyPrefix}:${clientIp}`;
    const existing = rateLimitStore.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
        rateLimitStore.set(bucketKey, {
            count: 1,
            resetAt: now + options.windowMs,
        });
        return null;
    }

    if (existing.count >= options.limit) {
        const retryAfterSeconds = Math.max(
            1,
            Math.ceil((existing.resetAt - now) / 1000)
        );
        const response = NextResponse.json(
            {
                success: false,
                error: "Too many requests. Please wait and try again.",
            },
            { status: 429 }
        );

        response.headers.set("Retry-After", String(retryAfterSeconds));
        return response;
    }

    existing.count += 1;
    rateLimitStore.set(bucketKey, existing);
    return null;
}
