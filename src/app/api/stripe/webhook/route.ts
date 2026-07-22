// Stripe Webhook Handler
// Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 18.5

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { config } from "@/lib/config";
import { getRedisClient, getUserByEmail, updateUserTier } from "@/lib/redis";
import { addCredits, initializeFreeQuota } from "@/lib/quota";
import { sendPaymentEmail } from "@/lib/email";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";
import {
  CREDIT_PACK_EXPIRATION_DAYS,
  getCreditPack,
  isCreditPackPlan,
  LEGACY_PAY_AS_YOU_GO_CREDITS,
} from "@/lib/billing";

const EMAIL_EVENT_TTL_SECONDS = 3 * 24 * 60 * 60;
const PROCESSED_EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

function getProcessedWebhookKey(eventId: string): string {
  return `stripe:webhook:processed:${eventId}`;
}

function getFulfilledCheckoutSessionKey(sessionId: string): string {
  return `stripe:checkout:fulfilled:${sessionId}`;
}

async function claimWebhookEvent(eventId: string): Promise<boolean> {
  const redis = getRedisClient();
  const result = await redis.set(getProcessedWebhookKey(eventId), "1", {
    nx: true,
    ex: PROCESSED_EVENT_TTL_SECONDS,
  });
  return result === "OK";
}

async function releaseWebhookEventClaim(eventId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(getProcessedWebhookKey(eventId));
}

async function claimCheckoutSessionFulfillment(
  sessionId: string
): Promise<boolean> {
  const redis = getRedisClient();
  const result = await redis.set(getFulfilledCheckoutSessionKey(sessionId), "1", {
    nx: true,
    ex: PROCESSED_EVENT_TTL_SECONDS,
  });
  return result === "OK";
}

async function releaseCheckoutSessionFulfillmentClaim(
  sessionId: string
): Promise<void> {
  const redis = getRedisClient();
  await redis.del(getFulfilledCheckoutSessionKey(sessionId));
}

async function shouldSendWebhookEmail(eventId: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = `email:webhook:${eventId}`;
  const result = await redis.set(key, "1", {
    nx: true,
    ex: EMAIL_EVENT_TTL_SECONDS,
  });
  return result === "OK";
}

async function downgradeUserToFreePlan(userId: string): Promise<void> {
  await updateUserTier(userId, "free");
  await initializeFreeQuota(userId);
}

async function fulfillCheckoutSession(
  eventId: string,
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;

  if (!userId || !plan) {
    console.error("Missing metadata in checkout session:", session.id);
    return;
  }

  if (session.payment_status && session.payment_status !== "paid") {
    console.warn("Skipping unpaid checkout session:", session.id);
    return;
  }

  const shouldFulfill = await claimCheckoutSessionFulfillment(session.id);
  if (!shouldFulfill) {
    return;
  }

  try {
    if (isCreditPackPlan(plan)) {
      const pack = getCreditPack(plan);
      await addCredits(userId, pack.credits, CREDIT_PACK_EXPIRATION_DAYS);
      await updateUserTier(userId, "pay_as_you_go");
    } else if (plan === "pay_as_you_go") {
      // Legacy one-credit purchases created before credit packs existed.
      await addCredits(userId, LEGACY_PAY_AS_YOU_GO_CREDITS, 30);
      await updateUserTier(userId, "pay_as_you_go");
    } else if (plan === "professional") {
      // Set tier to professional (Req 6.6)
      await updateUserTier(userId, "professional");
    }

    const email =
      session.customer_details?.email ?? session.customer_email ?? null;
    if (email && (await shouldSendWebhookEmail(eventId))) {
      sendPaymentEmail({
        to: email,
        type: "payment_success",
        plan,
      }).catch((error) => {
        console.error("Failed to send payment success email:", error);
      });
    }
  } catch (error) {
    await releaseCheckoutSessionFulfillmentClaim(session.id);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  
  // Check if Stripe is enabled
  if (!config.stripe.isEnabled) {
    return NextResponse.json(
      { error: getErrorMessage("paymentUnavailable", locale) },
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
    const shouldProcess = await claimWebhookEvent(event.id);
    if (!shouldProcess) {
      return NextResponse.json({ received: true });
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await fulfillCheckoutSession(event.id, session);
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email =
          session.customer_details?.email ?? session.customer_email ?? null;
        const plan = session.metadata?.plan ?? "pay_as_you_go";

        if (email && (await shouldSendWebhookEmail(event.id))) {
          sendPaymentEmail({
            to: email,
            type: "payment_failed",
            plan,
          }).catch((error) => {
            console.error("Failed to send payment failure email:", error);
          });
        }

        break;
      }

      case "invoice.payment_failed": {
        // Subscription renewal failed - downgrade to free (Req 6.7)
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionRef =
          invoice.parent?.subscription_details?.subscription ?? null;
        let userId: string | null = null;

        if (subscriptionRef) {
          // Get the customer's userId from subscription metadata
          let subscriptionObj: Stripe.Subscription;
          if (typeof subscriptionRef === "string") {
            subscriptionObj =
              await stripe.subscriptions.retrieve(subscriptionRef);
          } else {
            subscriptionObj = subscriptionRef;
          }

          userId = subscriptionObj.metadata?.userId ?? null;
        }

        if (!userId && invoice.customer_email) {
          const user = await getUserByEmail(invoice.customer_email);
          userId = user?.id ?? null;
        }

        if (userId) {
          await downgradeUserToFreePlan(userId);
        }

        const customerEmail = invoice.customer_email;
        if (customerEmail && (await shouldSendWebhookEmail(event.id))) {
          sendPaymentEmail({
            to: customerEmail,
            type: "payment_failed",
            plan: "professional",
          }).catch((error) => {
            console.error("Failed to send payment failure email:", error);
          });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId: string | null = subscription.metadata?.userId ?? null;

        if (!userId) {
          const customerRef = subscription.customer;
          let customerEmail: string | null = null;

          if (typeof customerRef === "string") {
            const customer = await stripe.customers.retrieve(customerRef);
            if (!("deleted" in customer)) {
              customerEmail = customer.email ?? null;
            }
          } else if (customerRef && !("deleted" in customerRef)) {
            customerEmail = customerRef.email ?? null;
          }

          if (customerEmail) {
            const user = await getUserByEmail(customerEmail);
            userId = user?.id ?? null;
          }
        }

        if (userId) {
          await downgradeUserToFreePlan(userId);
        }

        break;
      }

      default:
        // Unhandled event type - ignore
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    await releaseWebhookEventClaim(event.id);
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: getErrorMessage("paymentFailed", locale, { reason: "Processing failed" }) },
      { status: 500 }
    );
  }
}
