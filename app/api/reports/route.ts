import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Report } from "@/models/Report";

export async function GET(request: NextRequest) {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
        return NextResponse.json(
            { success: false, error: "Authentication required." },
            { status: 401 }
        );
    }

    await connectDB();

    const reports = await Report.find({
        $or: [{ userId: user.id }, { userEmail: user.email }],
    })
        .sort({ createdAt: -1 })
        .select("_id sourceAnalysisId reportData paymentId createdAt")
        .lean();

    return NextResponse.json({
        success: true,
        reports: reports.map((report) => ({
            id: report._id.toString(),
            analysisId: report.sourceAnalysisId.toString(),
            paymentId: report.paymentId,
            createdAt: report.createdAt,
            reportData: report.reportData,
        })),
    });
}
