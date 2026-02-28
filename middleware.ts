import { NextResponse } from "next/server";

export const config = {
    matcher: "/api/premium/:path*",
};

export function middleware() {
    // Premium route validation is handled inside the route handlers now so
    // authentication can use signed cookies instead of legacy client headers.
    return NextResponse.next();
}
