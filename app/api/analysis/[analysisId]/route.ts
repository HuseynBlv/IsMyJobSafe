import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Analysis } from "@/models/Analysis";

interface Context {
    params: Promise<{
        analysisId: string;
    }>;
}

export async function GET(_request: NextRequest, context: Context) {
    const { analysisId } = await context.params;

    if (!analysisId || typeof analysisId !== "string") {
        return NextResponse.json(
            { success: false, error: "analysisId is required." },
            { status: 400 }
        );
    }

    await connectDB();

    const analysis = await Analysis.findById(analysisId)
        .select("_id result createdAt targetRole")
        .lean();

    if (!analysis) {
        return NextResponse.json(
            { success: false, error: "Analysis not found." },
            { status: 404 }
        );
    }

    return NextResponse.json({
        success: true,
        analysis: {
            id: analysis._id.toString(),
            result: analysis.result,
            createdAt: analysis.createdAt,
            targetRole: analysis.targetRole ?? null,
        },
    });
}
