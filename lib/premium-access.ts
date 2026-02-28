import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest, type CurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Report } from "@/models/Report";

export interface PremiumAccessResult {
    user: CurrentUser | null;
    userKey: string;
}

export async function requireOwnedReport(
    request: NextRequest,
    analysisId: string
): Promise<
    | { ok: true; access: PremiumAccessResult }
    | { ok: false; response: NextResponse }
> {
    if (
        process.env.DEV_PREMIUM_BYPASS === "true" &&
        process.env.NODE_ENV !== "production"
    ) {
        return {
            ok: true,
            access: {
                user: null,
                userKey: "dev-bypass",
            },
        };
    }

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: "Authentication required." },
                { status: 401 }
            ),
        };
    }

    await connectDB();

    const report = await Report.findOne({
        sourceAnalysisId: analysisId,
        $or: [{ userId: user.id }, { userEmail: user.email }],
    })
        .select("_id")
        .lean();

    if (!report) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: "Purchase required for this premium report." },
                { status: 403 }
            ),
        };
    }

    return {
        ok: true,
        access: {
            user,
            userKey: user.id,
        },
    };
}
