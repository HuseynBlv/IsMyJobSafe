/**
 * middleware.ts
 *
 * Protects /api/premium/* routes.
 * Reads x-user-email from the request header, then queries MongoDB
 * (via the internal /api/subscription/status route) to confirm the
 * subscription is active.  Returns 403 if not.
 *
 * NOTE: Next.js Edge Runtime cannot import mongoose directly, so we
 * call the internal status API instead.
 */

import { NextRequest, NextResponse } from "next/server";

export const config = {
    matcher: "/api/premium/:path*",
};

export async function middleware(request: NextRequest) {
    const email = request.headers.get("x-user-email")?.toLowerCase().trim();

    if (!email || !email.includes("@")) {
        return NextResponse.json(
            { error: "x-user-email header is required." },
            { status: 401 }
        );
    }

    // Call the internal status endpoint (same origin)
    const statusUrl = new URL(
        `/api/subscription/status?email=${encodeURIComponent(email)}`,
        request.url
    );

    let active = false;
    try {
        const res = await fetch(statusUrl.toString());
        if (res.ok) {
            const body = await res.json();
            active = body.active === true;
        }
    } catch {
        // Network error — fail closed
        return NextResponse.json({ error: "Unable to verify subscription." }, { status: 503 });
    }

    if (!active) {
        return NextResponse.json(
            { error: "Active subscription required." },
            { status: 403 }
        );
    }

    return NextResponse.next();
}
