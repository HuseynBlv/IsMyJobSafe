import mongoose from "mongoose";

const MarketComparisonSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        analysisId: { type: mongoose.Schema.Types.ObjectId, ref: "Analysis", required: true },
        comparison: { type: mongoose.Schema.Types.Mixed, required: true },
    },
    { timestamps: true }
);

MarketComparisonSchema.index({ userId: 1, analysisId: 1 }, { unique: true });

export const MarketComparison =
    mongoose.models.MarketComparison ||
    mongoose.model("MarketComparison", MarketComparisonSchema);
