import mongoose, { Schema, model, models, type Document } from "mongoose";

export type MonitoringEventName =
    | "analysis_started"
    | "analysis_completed"
    | "checkout_started"
    | "checkout_completed"
    | "webhook_failed"
    | "server_error";

export type MonitoringEventLevel = "info" | "error";

export interface IMonitoringEvent extends Document {
    event: MonitoringEventName;
    level: MonitoringEventLevel;
    message: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const MonitoringEventSchema = new Schema<IMonitoringEvent>(
    {
        event: {
            type: String,
            required: true,
            enum: [
                "analysis_started",
                "analysis_completed",
                "checkout_started",
                "checkout_completed",
                "webhook_failed",
                "server_error",
            ],
            index: true,
        },
        level: {
            type: String,
            required: true,
            enum: ["info", "error"],
            index: true,
        },
        message: {
            type: String,
            default: null,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

MonitoringEventSchema.index({ createdAt: -1 });
MonitoringEventSchema.index({ event: 1, createdAt: -1 });

export const MonitoringEvent =
    (models.MonitoringEvent as mongoose.Model<IMonitoringEvent>) ??
    model<IMonitoringEvent>("MonitoringEvent", MonitoringEventSchema);
