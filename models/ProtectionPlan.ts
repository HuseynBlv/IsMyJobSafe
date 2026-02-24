import mongoose from "mongoose";

const ProtectionPlanSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true }, // user email
        analysisId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Analysis",
            required: true,
        },
        planJson: { type: mongoose.Schema.Types.Mixed, required: true },
    },
    { timestamps: true }
);

// Compound index to quickly look up a cached plan by user + analysis
ProtectionPlanSchema.index({ userId: 1, analysisId: 1 }, { unique: true });

export const ProtectionPlan =
    mongoose.models.ProtectionPlan ||
    mongoose.model("ProtectionPlan", ProtectionPlanSchema);
