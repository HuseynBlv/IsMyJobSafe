import mongoose from "mongoose";

const AiSimulationSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        analysisId: { type: mongoose.Schema.Types.ObjectId, ref: "Analysis", required: true },
        simulation: { type: mongoose.Schema.Types.Mixed, required: true },
    },
    { timestamps: true }
);

AiSimulationSchema.index({ userId: 1, analysisId: 1 }, { unique: true });

export const AiSimulation =
    mongoose.models.AiSimulation ||
    mongoose.model("AiSimulation", AiSimulationSchema);
