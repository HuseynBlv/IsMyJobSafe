import mongoose from "mongoose";

const AnalysisSchema = new mongoose.Schema(
    {
        profileText: { type: String, required: true },
        targetRole: { type: String, default: null },
        result: { type: mongoose.Schema.Types.Mixed, required: true },
    },
    { timestamps: true }
);

export const Analysis =
    mongoose.models.Analysis || mongoose.model("Analysis", AnalysisSchema);
