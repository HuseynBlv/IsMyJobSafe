import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { RateLimitBucket } from "@/models/RateLimitBucket";

interface RateLimitOptions {
    keyPrefix: string;
    limit: number;
    windowMs: number;
}

const TTL_BUFFER_MS = 60_000;

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

export async function enforceRateLimit(
    request: NextRequest,
    options: RateLimitOptions
): Promise<NextResponse | null> {
    const now = Date.now();
    const clientIp = getClientIp(request);
    const bucketKey = `${options.keyPrefix}:${clientIp}`;
    const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
    const resetAt = windowStart + options.windowMs;

    await connectDB();

    const bucket = await RateLimitBucket.findOneAndUpdate(
        { key: bucketKey, windowStart },
        {
            $inc: { count: 1 },
            $setOnInsert: {
                key: bucketKey,
                windowStart,
                expiresAt: new Date(resetAt + TTL_BUFFER_MS),
            },
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        }
    ).lean<{ count: number } | null>();

    if (!bucket) {
        return null;
    }

    if (bucket.count > options.limit) {
        const retryAfterSeconds = Math.max(
            1,
            Math.ceil((resetAt - now) / 1000)
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

    return null;
}
