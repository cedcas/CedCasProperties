import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe is not configured on this server." }, { status: 503 });
    }

    const stripe = new Stripe(secretKey);
    const { amount, currency = "php", metadata = {} } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Stripe amounts are in centavos (smallest currency unit)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe PaymentIntent error:", err);
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
}
