import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        userEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        sourceAnalysisId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Analysis",
            required: true,
            index: true,
        },
        reportData: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        paymentId: {
            type: String,
            required: true,
            index: true,
        },
    },
    { timestamps: true }
);

ReportSchema.index({ userId: 1, createdAt: -1 });
ReportSchema.index({ userEmail: 1, createdAt: -1 });
ReportSchema.index({ paymentId: 1 }, { unique: true });

export const Report =
    mongoose.models.Report || mongoose.model("Report", ReportSchema);
