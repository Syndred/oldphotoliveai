// Stripe Webhook Handler
// Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 18.5

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { config } from "@/lib/config";
import { updateUserTier } from "@/lib/redis";
import { addCredits } from "@/lib/quota";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  
  // Check if Stripe is enabled
  if (!config.stripe.isEnabled) {
    return NextResponse.json(
      { error: "Payment feature is currently unavailable" },
      { status: 503 }
    );
  }

  const stripe = getStripeClient();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: getErrorMessage("paymentFailed", locale, { reason: "Missing signature" }) },
      { status: 400 }
    );
  }

  // Verify webhook signature (Req 6.8)
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripe.webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: getErrorMessage("paymentFailed", locale, { reason: "Invalid signature" }) },
      { status: 401 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (!userId || !plan) {
          console.error("Missing metadata in checkout session:", session.id);
          break;
        }

        if (plan === "pay_as_you_go") {
          // Add 5 credits, 30-day expiration (Req 6.5)
          await addCredits(userId, 5, 30);
          await updateUserTier(userId, "pay_as_you_go");
        } else if (plan === "professional") {
          // Set tier to professional (Req 6.6)
          await updateUserTier(userId, "professional");
        }

        break;
      }

      case "invoice.payment_failed": {
        // Subscription renewal failed - downgrade to free (Req 6.7)
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionRef =
          invoice.parent?.subscription_details?.subscription ?? null;

        if (subscriptionRef) {
          // Get the customer's userId from subscription metadata
          let subscriptionObj: Stripe.Subscription;
          if (typeof subscriptionRef === "string") {
            subscriptionObj =
              await stripe.subscriptions.retrieve(subscriptionRef);
          } else {
            subscriptionObj = subscriptionRef;
          }

          const userId = subscriptionObj.metadata?.userId;
          if (userId) {
            await updateUserTier(userId, "free");
          }
        }

        break;
      }

      default:
        // Unhandled event type - ignore
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: getErrorMessage("paymentFailed", locale, { reason: "Processing failed" }) },
      { status: 500 }
    );
  }
}
