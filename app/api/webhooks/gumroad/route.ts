import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Subscription } from "@/models/Subscription";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        // Extract relevant fields sent by Gumroad webhook
        const email = formData.get("email") as string;
        const sale_id = formData.get("sale_id") as string;
        // Optionally, check short_product_id if you want to verify it's the right product.

        if (!email || !sale_id) {
            return NextResponse.json({ error: "Missing email or sale_id" }, { status: 400 });
        }

        await connectDB();

        // Ensure email is lowercased to match schema
        const normalizedEmail = email.toLowerCase().trim();

        // Check if subscription already exists for this email
        const existingSub = await Subscription.findOne({ email: normalizedEmail });

        if (existingSub) {
            // Update to active and attach the sale ID
            existingSub.status = "active";
            existingSub.gumroadSaleId = sale_id;
            await existingSub.save();
        } else {
            // Create a new active subscription
            await Subscription.create({
                email: normalizedEmail,
                gumroadSaleId: sale_id,
                status: "active",
            });
        }

        return NextResponse.json({ success: true, message: "Subscription activated" });
    } catch (error) {
        console.error("[Gumroad Webhook] Error processing request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
