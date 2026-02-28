import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
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
    const password = body.password ?? "";

    if (!email || !password) {
        return NextResponse.json(
            { success: false, error: "Email and password are required." },
            { status: 400 }
        );
    }

    await connectDB();

    const user = await User.findOne({ email })
        .select("_id email passwordHash createdAt")
        .lean<{
            _id: { toString(): string };
            email: string;
            passwordHash: string;
            createdAt: Date;
        } | null>();

    if (!user) {
        return NextResponse.json(
            { success: false, error: "Invalid email or password." },
            { status: 401 }
        );
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
        return NextResponse.json(
            { success: false, error: "Invalid email or password." },
            { status: 401 }
        );
    }

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
