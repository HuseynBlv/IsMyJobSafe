import mongoose from "mongoose";

const SalaryProjectionSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true }, // user email
        analysisId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Analysis",
            required: true,
        },
        salary: { type: Number, required: true },
        country: { type: String, required: true },
        projections: { type: mongoose.Schema.Types.Mixed, required: true }, // scenarios array
    },
    { timestamps: true }
);

// One projection per user per analysis (cache key)
SalaryProjectionSchema.index({ userId: 1, analysisId: 1 }, { unique: true });

export const SalaryProjection =
    mongoose.models.SalaryProjection ||
    mongoose.model("SalaryProjection", SalaryProjectionSchema);
