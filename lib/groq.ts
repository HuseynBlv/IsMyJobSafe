/**
 * Groq server-side client.
 * Uses groq-sdk for Llama 3 API calls.
 */

import Groq from "groq-sdk";
import { env } from "./env";

const globalForGroq = globalThis as typeof globalThis & {
    _groqClient?: Groq;
};

export const groq =
    globalForGroq._groqClient ??
    new Groq({
        apiKey: env.GROQ_API_KEY,
    });

if (process.env.NODE_ENV !== "production") {
    globalForGroq._groqClient = groq;
}
