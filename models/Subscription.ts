import mongoose, { Schema, model, models, type Document } from "mongoose";

export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing";

export interface ISubscription extends Document {
    email: string;
    paddleCustomerId?: string; // Optional (legacy/fallback)
    paddleSubscriptionId?: string;
    paddleTransactionId?: string;
    gumroadSaleId?: string;    // New for Gumroad
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
            sparse: true, // Make sparse to allow missing values
        },
        paddleSubscriptionId: {
            type: String,
            sparse: true,
        },
        paddleTransactionId: {
            type: String,
            sparse: true,
        },
        gumroadSaleId: {
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

export const Subscription =
    (models.Subscription as mongoose.Model<ISubscription>) ??
    model<ISubscription>("Subscription", SubscriptionSchema);
