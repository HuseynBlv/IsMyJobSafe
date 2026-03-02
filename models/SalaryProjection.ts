import mongoose from "mongoose";

const SalaryProjectionSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
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

// Exact lookup index for the current salary + market input pair.
SalaryProjectionSchema.index({ userId: 1, analysisId: 1, salary: 1, country: 1 });

// Backward-compatible unique cache entry for older deployments. The route now
// overwrites this record when salary/country change so stale projections do not persist.
SalaryProjectionSchema.index({ userId: 1, analysisId: 1 }, { unique: true });

export const SalaryProjection =
    mongoose.models.SalaryProjection ||
    mongoose.model("SalaryProjection", SalaryProjectionSchema);

