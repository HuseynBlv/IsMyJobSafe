import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Report } from "@/models/Report";
import { Subscription } from "@/models/Subscription";

export async function GET(request: NextRequest) {
    if (
        process.env.DEV_PREMIUM_BYPASS === "true" &&
        process.env.NODE_ENV !== "production"
    ) {
        return NextResponse.json({ active: true, status: "active" });
    }

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ active: false, status: "unauthenticated" });
    }

    const analysisId = request.nextUrl.searchParams.get("analysisId")?.trim();

    await connectDB();

    if (analysisId) {
        const report = await Report.findOne({
            sourceAnalysisId: analysisId,
            $or: [{ userId: user.id }, { userEmail: user.email }],
        })
            .select("_id createdAt")
            .lean();

        return NextResponse.json({
            active: Boolean(report),
            status: report ? "owned" : "not_owned",
            reportCreatedAt: report ? report.createdAt : null,
        });
    }

    const [report, subscription] = await Promise.all([
        Report.findOne({
            $or: [{ userId: user.id }, { userEmail: user.email }],
        })
            .select("_id")
            .lean(),
        Subscription.findOne({ email: user.email })
            .select("status currentPeriodEnd")
            .lean(),
    ]);

    const subscriptionActive =
        Boolean(subscription) &&
        (subscription!.status === "active" || subscription!.status === "trialing") &&
        (!subscription!.currentPeriodEnd || subscription!.currentPeriodEnd > new Date());

    return NextResponse.json({
        active: Boolean(report) || subscriptionActive,
        status: report ? "owned" : subscription?.status ?? "none",
        hasReports: Boolean(report),
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    });
}
