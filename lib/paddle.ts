/**
 * Paddle server-side singleton.
 * Uses @paddle/paddle-node-sdk for API calls and webhook verification.
 */

import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import { env } from "./env";

const globalForPaddle = globalThis as typeof globalThis & {
    _paddleClient?: Paddle;
};

export const paddle =
    globalForPaddle._paddleClient ??
    new Paddle(env.PADDLE_API_KEY, {
        environment:
            env.PADDLE_ENV === "production"
                ? Environment.production
                : Environment.sandbox,
    });

if (process.env.NODE_ENV !== "production") {
    globalForPaddle._paddleClient = paddle;
}
