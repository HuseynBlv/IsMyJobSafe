/**
 * Mongoose connection singleton.
 * Reuses a single connection across hot-reloads in Next.js dev mode.
 */

import mongoose from "mongoose";
import { env } from "./env";

declare global {
    // eslint-disable-next-line no-var
    var _mongooseConn: mongoose.Connection | undefined;
}

let connectionPromise: Promise<mongoose.Connection> | null = null;

export async function connectDB(): Promise<mongoose.Connection> {
    // Return the cached connection if already established
    if (global._mongooseConn?.readyState === 1) {
        return global._mongooseConn;
    }

    if (!connectionPromise) {
        connectionPromise = mongoose
            .connect(env.MONGODB_URI, {
                bufferCommands: false,
            })
            .then((m) => {
                global._mongooseConn = m.connection;
                return m.connection;
            });
    }

    return connectionPromise;
}
