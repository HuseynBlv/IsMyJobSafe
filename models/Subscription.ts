/**
 * Subscription model.
 * Keyed by email (user identifier) and paddleCustomerId.
 */

import mongoose, { Schema, model, models, type Document } from "mongoose";

export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing";

export interface ISubscription extends Document {
    email: string;
    paddleCustomerId: string;
    paddleSubscriptionId?: string;
    paddleTransactionId?: string; // for one-time purchases
    status: SubscriptionStatus;
    currentPeriodEnd?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        paddleCustomerId: {
            type: String,
            required: true,
            index: true,
        },
        paddleSubscriptionId: {
            type: String,
            sparse: true,
        },
        paddleTransactionId: {
            type: String,
            sparse: true,
        },
        status: {
            type: String,
            enum: ["active", "cancelled", "past_due", "trialing"],
            required: true,
            default: "active",
        },
        currentPeriodEnd: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent model re-compilation during hot-reload
export const Subscription =
    (models.Subscription as mongoose.Model<ISubscription>) ??
    model<ISubscription>("Subscription", SubscriptionSchema);
