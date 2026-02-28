import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

const SESSION_COOKIE = "ismyjobsafe_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface SessionPayload {
    sub: string;
    email: string;
}

export interface CurrentUser {
    id: string;
    email: string;
    createdAt: string;
}

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("Missing required environment variable: JWT_SECRET");
    }
    return secret;
}

export function getSessionCookieName() {
    return SESSION_COOKIE;
}

export async function hashPassword(password: string) {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
    return bcrypt.compare(password, passwordHash);
}

function signSessionToken(user: { id: string; email: string }) {
    return jwt.sign(
        { sub: user.id, email: user.email } satisfies SessionPayload,
        getJwtSecret(),
        { expiresIn: SESSION_MAX_AGE_SECONDS }
    );
}

function verifySessionToken(token: string): SessionPayload | null {
    try {
        const decoded = jwt.verify(token, getJwtSecret()) as SessionPayload;
        if (!decoded?.sub || !decoded?.email) {
            return null;
        }
        return decoded;
    } catch {
        return null;
    }
}

export function setSessionCookie(
    response: NextResponse,
    user: { id: string; email: string }
) {
    response.cookies.set({
        name: SESSION_COOKIE,
        value: signSessionToken(user),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
    });
}

export function clearSessionCookie(response: NextResponse) {
    response.cookies.set({
        name: SESSION_COOKIE,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });
}

export async function getCurrentUserFromRequest(
    request: NextRequest
): Promise<CurrentUser | null> {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
        return null;
    }

    const payload = verifySessionToken(token);
    if (!payload) {
        return null;
    }

    await connectDB();

    const user = await User.findById(payload.sub)
        .select("_id email createdAt")
        .lean<{ _id: { toString(): string }; email: string; createdAt: Date } | null>();

    if (!user) {
        return null;
    }

    return {
        id: user._id.toString(),
        email: user.email,
        createdAt: user.createdAt.toISOString(),
    };
}
