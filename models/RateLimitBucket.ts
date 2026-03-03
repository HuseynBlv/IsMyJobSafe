import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IRateLimitBucket extends Document {
    key: string;
    windowStart: number;
    count: number;
    expiresAt: Date;
}

const RateLimitBucketSchema = new Schema<IRateLimitBucket>(
    {
        key: {
            type: String,
            required: true,
            index: true,
        },
        windowStart: {
            type: Number,
            required: true,
        },
        count: {
            type: Number,
            required: true,
            default: 0,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
    },
    {
        timestamps: false,
    }
);

RateLimitBucketSchema.index({ key: 1, windowStart: 1 }, { unique: true });
RateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitBucket =
    (models.RateLimitBucket as mongoose.Model<IRateLimitBucket>) ??
    model<IRateLimitBucket>("RateLimitBucket", RateLimitBucketSchema);
