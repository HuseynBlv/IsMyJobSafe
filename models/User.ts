import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const User =
    (models.User as mongoose.Model<IUser>) ?? model<IUser>("User", UserSchema);
