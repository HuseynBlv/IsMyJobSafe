import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { User } from "@/models/User";

interface AuthBody {
    email?: string;
    password?: string;
}

function normalizeEmail(value?: string) {
    const email = value?.toLowerCase().trim() ?? "";
    return email.includes("@") ? email : "";
}

export async function POST(request: NextRequest) {
    let body: AuthBody;
    try {
        body = (await request.json()) as AuthBody;
    } catch {
        return NextResponse.json(
            { success: false, error: "Request body must be valid JSON." },
            { status: 400 }
        );
    }

    const email = normalizeEmail(body.email);
    const password = body.password?.trim() ?? "";

    if (!email) {
        return NextResponse.json(
            { success: false, error: "A valid email is required." },
            { status: 400 }
        );
    }

    if (password.length < 8) {
        return NextResponse.json(
            { success: false, error: "Password must be at least 8 characters." },
            { status: 400 }
        );
    }

    await connectDB();

    const existing = await User.findOne({ email }).select("_id").lean();
    if (existing) {
        return NextResponse.json(
            { success: false, error: "An account with this email already exists." },
            { status: 409 }
        );
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash });

    const response = NextResponse.json({
        success: true,
        user: {
            id: user._id.toString(),
            email: user.email,
            createdAt: user.createdAt.toISOString(),
        },
    });

    setSessionCookie(response, {
        id: user._id.toString(),
        email: user.email,
    });

    return response;
}
