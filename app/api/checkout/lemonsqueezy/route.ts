import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { env } from "@/lib/env";

interface CreateCheckoutRequestBody {
    analysisId?: string;
}

function requireLemonConfig() {
    const missing: string[] = [];
    if (!env.LEMON_SQUEEZY_API_KEY) missing.push("LEMON_SQUEEZY_API_KEY");
    if (!env.LEMON_SQUEEZY_STORE_ID) missing.push("LEMON_SQUEEZY_STORE_ID");
    if (!env.LEMON_SQUEEZY_VARIANT_ID) missing.push("LEMON_SQUEEZY_VARIANT_ID");

    if (missing.length > 0) {
        throw new Error(`Missing Lemon Squeezy config: ${missing.join(", ")}`);
    }

    return {
        apiKey: env.LEMON_SQUEEZY_API_KEY,
        storeId: env.LEMON_SQUEEZY_STORE_ID,
        variantId: env.LEMON_SQUEEZY_VARIANT_ID,
    };
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
        return NextResponse.json(
            { success: false, error: "Create an account or log in before checkout." },
            { status: 401 }
        );
    }

    let body: CreateCheckoutRequestBody;
    try {
        body = (await request.json()) as CreateCheckoutRequestBody;
    } catch {
        return NextResponse.json(
            { success: false, error: "Request body must be valid JSON." },
            { status: 400 }
        );
    }

    const analysisId = body.analysisId?.trim();
    if (!analysisId) {
        return NextResponse.json(
            { success: false, error: "Run a free analysis before purchasing the premium report." },
            { status: 400 }
        );
    }

    let config: ReturnType<typeof requireLemonConfig>;
    try {
        config = requireLemonConfig();
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Lemon Squeezy is not configured.",
            },
            { status: 500 }
        );
    }

    const successUrl =
        env.LEMON_SQUEEZY_SUCCESS_URL ||
        new URL("/payment/success", request.url).toString();

    const payload = {
        data: {
            type: "checkouts",
            attributes: {
                checkout_data: {
                    email: user.email,
                    custom: {
                        email: user.email,
                        user_id: user.id,
                        analysis_id: analysisId,
                        source: "upgrade-page",
                    },
                },
                checkout_options: {
                    embed: false,
                },
                product_options: {
                    redirect_url: successUrl,
                },
                test_mode: env.LEMON_SQUEEZY_CHECKOUT_TEST_MODE,
            },
            relationships: {
                store: {
                    data: {
                        type: "stores",
                        id: config.storeId,
                    },
                },
                variant: {
                    data: {
                        type: "variants",
                        id: config.variantId,
                    },
                },
            },
        },
    };

    let lsRes: Response;
    try {
        lsRes = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                Accept: "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
            },
            body: JSON.stringify(payload),
            cache: "no-store",
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: `Failed to reach Lemon Squeezy: ${error instanceof Error ? error.message : String(error)}`,
            },
            { status: 502 }
        );
    }

    let lsJson: unknown;
    try {
        lsJson = await lsRes.json();
    } catch {
        return NextResponse.json(
            { success: false, error: "Invalid response from Lemon Squeezy." },
            { status: 502 }
        );
    }

    if (!lsRes.ok) {
        const message =
            typeof lsJson === "object" &&
            lsJson !== null &&
            "errors" in lsJson &&
            Array.isArray((lsJson as { errors?: unknown[] }).errors)
                ? ((lsJson as { errors: Array<{ detail?: string }> }).errors
                    .map((entry) => entry.detail)
                    .filter(Boolean)
                    .join("; ") || "Checkout creation failed.")
                : "Checkout creation failed.";

        return NextResponse.json({ success: false, error: message }, { status: 502 });
    }

    const checkoutUrl =
        (lsJson as {
            data?: { attributes?: { url?: string } };
        })?.data?.attributes?.url;

    if (!checkoutUrl) {
        return NextResponse.json(
            { success: false, error: "Lemon Squeezy checkout URL missing in response." },
            { status: 502 }
        );
    }

    return NextResponse.json({ success: true, checkoutUrl });
}
