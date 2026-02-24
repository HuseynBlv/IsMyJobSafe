"use client";

/**
 * PaddleCheckout
 *
 * Encapsulates the Paddle.js overlay checkout.
 * - Initialises Paddle once (dev-mode guard via ref)
 * - Passes the user email as custom_data so webhooks can link the
 *   purchase to the correct account
 *
 * Required env vars (public, exposed to the browser):
 *   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
 *   NEXT_PUBLIC_PADDLE_ENV          ("sandbox" | "production")
 *   NEXT_PUBLIC_PADDLE_PRICE_ID
 */

import { useRef, useState } from "react";
import type { Paddle } from "@paddle/paddle-js";

interface Props {
    email: string;
    onSuccess?: () => void;
    children?: React.ReactNode;
    className?: string;
}

export default function PaddleCheckout({ email, onSuccess, children, className }: Props) {
    const paddleRef = useRef<Paddle | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function ensurePaddle(): Promise<Paddle> {
        if (paddleRef.current) return paddleRef.current;

        const { initializePaddle } = await import("@paddle/paddle-js");

        const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
        const environment = process.env.NEXT_PUBLIC_PADDLE_ENV as "sandbox" | "production" | undefined;

        if (!clientToken) {
            throw new Error("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set.");
        }

        const instance = await initializePaddle({
            token: clientToken,
            environment: environment === "production" ? "production" : "sandbox",
            eventCallback(ev) {
                if (ev.name === "checkout.completed" && onSuccess) {
                    onSuccess();
                }
            },
        });

        if (!instance) {
            throw new Error("Paddle failed to initialise.");
        }

        paddleRef.current = instance;
        return instance;
    }

    async function handleClick() {
        setError(null);
        setLoading(true);
        try {
            const paddle = await ensurePaddle();

            const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID;
            if (!priceId) {
                throw new Error("NEXT_PUBLIC_PADDLE_PRICE_ID is not set.");
            }

            await paddle.Checkout.open({
                items: [{ priceId, quantity: 1 }],
                ...(email ? { customer: { email } } : {}),
                customData: { email },
            });
        } catch (err) {
            console.error("[PaddleCheckout]", err);
            setError(err instanceof Error ? err.message : "Checkout failed.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <button
                id="paddle-checkout-btn"
                onClick={handleClick}
                disabled={loading}
                className={className}
                type="button"
            >
                {loading ? (
                    <span className="loading loading-spinner loading-sm" />
                ) : (
                    children ?? "Unlock Full Report — $9"
                )}
            </button>
            {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
            )}
        </div>
    );
}
