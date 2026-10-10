// Stripe Checkout API
// Requirements: 6.1, 6.2, 18.5

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { getToken } from "next-auth/jwt";
import { getStripeClient, getOrCreateStripeCustomer } from "@/lib/stripe";
import { config } from "@/lib/config";
import { TaskCheckoutReviewRequiredError, getTaskCheckoutReviewResponse } from "@/lib/task-download";
import { assertPhotoOrderSourceExists, getPhotoOrderOwnedByUser, isPhotoOrderId, reservePhotoOrderCheckout, recoverPhotoOrderCheckoutSession, expirePhotoOrderCheckout } from "@/lib/photo-order";
import { schedulePipelineWakeupForStatus } from "@/lib/worker-wakeup";
import { fulfillPaidCheckout } from "@/lib/checkout-fulfillment";
import { getUser } from "@/lib/redis";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";
import {
  SINGLE_PHOTO,
  isCheckoutPlan,
  type CheckoutPlan,
  getCreditPack,
  isCreditPackPlan,
} from "@/lib/billing";

import { checkoutLocale, safeCheckoutReturnTo, safeCheckoutTaskId, pricingCheckoutPath } from "@/lib/checkout-context";

type Plan = CheckoutPlan;

function getProfessionalPriceId(): string {
  return config.stripe.priceIds.professional;
}

function getLineItem(plan: Plan): Stripe.Checkout.SessionCreateParams.LineItem {
  if (isCreditPackPlan(plan) || plan === "single_photo") {
    const pack = plan === "single_photo" ? SINGLE_PHOTO : getCreditPack(plan);
    return {
      quantity: 1,
      price_data: {
        currency: pack.currency,
        unit_amount: pack.unitAmount,
        product_data: {
          name: pack.name,
          metadata: {
            plan,
            ...(isCreditPackPlan(plan) ? { credits: String(getCreditPack(plan).credits) } : { scope: "result" }),
          },
        },
      },
    };
  }

  return { price: getProfessionalPriceId(), quantity: 1 };
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

  try {
    // Auth check (middleware handles this, but double-check)
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.userId) {
      return NextResponse.json(
        { error: getErrorMessage("unauthorized", locale) },
        { status: 401 }
      );
    }
    const userId = String(token.userId);
    const customerEmail =
      typeof token.email === "string" && token.email.trim()
        ? token.email
        : undefined;
    const customerName =
      typeof token.name === "string" && token.name.trim()
        ? token.name
        : undefined;

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return NextResponse.json({ error: getErrorMessage("checkoutFailed", locale) }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: getErrorMessage("checkoutFailed", locale) }, { status: 400 });
    const { plan } = body as { plan?: string };
    const paymentLocale = body.locale ? checkoutLocale(body.locale) : locale;
    const context = { taskId: safeCheckoutTaskId(body.taskId), returnTo: safeCheckoutReturnTo(body.returnTo, paymentLocale) };

    if (!plan || !isCheckoutPlan(plan)) {
      return NextResponse.json(
        { error: getErrorMessage("checkoutFailed", locale) },
        { status: 400 }
      );
    }

    const user = await getUser(userId);
    if ((isCreditPackPlan(plan) || plan === "single_photo") && user?.tier === "professional") {
      return NextResponse.json(
        {
          error: getErrorMessage(
            "professionalAlreadyIncludesCredits",
            locale
          ),
        },
        { status: 409 }
      );
    }

    if (plan === "single_photo") return NextResponse.json({ code: "PLAN_RETIRED", error: "This offer is no longer available. Upload a photo to start a new order." }, { status: 410 });

    if (plan === "single_run") {
      if (!user || !isPhotoOrderId(body.orderId)) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      let order = await getPhotoOrderOwnedByUser(body.orderId, userId);
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      for (let attempt = 0; attempt < 2; attempt++) {
        if (order.status === "paid" && order.paidSessionId) return NextResponse.json({ url: `${config.nextauth.url}${pricingCheckoutPath(paymentLocale, {}, { orderId: order.id, session_id: order.paidSessionId })}` });
        if (order.status === "expired") return NextResponse.json({ code: "ORDER_EXPIRED", error: "This order has expired. Please upload your photo again." }, { status: 410 });
        if (order.status !== "unpaid") throw new TaskCheckoutReviewRequiredError();
        // Once Stripe creation has begun, recover it even if the source later
        // becomes unavailable: creating another order would risk a second charge.
        if (!order.checkout) await assertPhotoOrderSourceExists(order.imageKey);
        order = await reservePhotoOrderCheckout(order, customerEmail);
        const session = await recoverPhotoOrderCheckoutSession(order);
        if (session.payment_status === "paid") {
          await fulfillPaidCheckout(session);
          schedulePipelineWakeupForStatus("pending");
          return NextResponse.json({ url: `${config.nextauth.url}${pricingCheckoutPath(paymentLocale, {}, { orderId: order.id, session_id: session.id })}` });
        }
        if (session.status === "expired" && session.payment_status === "unpaid") {
          await expirePhotoOrderCheckout(order, session);
          order = (await getPhotoOrderOwnedByUser(order.id, userId))!;
          if (!order) throw new TaskCheckoutReviewRequiredError();
          continue;
        }
        if (session.status !== "open" || !session.url) return NextResponse.json({ code: "PAYMENT_PROCESSING", error: getErrorMessage("checkoutFailed", locale) }, { status: 409 });
        return NextResponse.json({ url: session.url });
      }
      return NextResponse.json({ code: "CHECKOUT_EXPIRED", error: getErrorMessage("checkoutFailed", locale) }, { status: 409 });
    }

    const stripe = getStripeClient();
    const priceId = getProfessionalPriceId();

    if (plan === "professional" && !priceId) {
      return NextResponse.json(
        { error: getErrorMessage("paymentUnavailable", locale) },
        { status: 503 }
      );
    }

    const mode = plan === "professional" ? "subscription" : "payment";
    const customer = customerEmail
      ? await getOrCreateStripeCustomer({
          email: customerEmail,
          userId,
          name: customerName,
        })
      : null;

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [getLineItem(plan)],
      success_url: `${config.nextauth.url}${pricingCheckoutPath(paymentLocale, context)}${context.taskId || context.returnTo ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.nextauth.url}${pricingCheckoutPath(paymentLocale, context, { cancelled: "true", plan })}`,
      client_reference_id: userId,
      ...(customer
        ? { customer: customer.id }
        : { customer_email: customerEmail }),
      metadata: {
        userId,
        plan,
        product: "oldphotoliveai",
        locale: paymentLocale,
        ...(context.taskId ? { taskId: context.taskId } : {}),
        ...(context.returnTo ? { returnTo: context.returnTo } : {}),
        ...(isCreditPackPlan(plan)
          ? { credits: String(getCreditPack(plan).credits) }
          : {}),
      },
      ...(mode === "subscription"
        ? {
            subscription_data: {
              metadata: {
                userId,
                plan,
              },
            },
          }
        : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof TaskCheckoutReviewRequiredError) return NextResponse.json(getTaskCheckoutReviewResponse(locale), { status: 409 });
    console.error(JSON.stringify({ message: "stripe_checkout_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    return NextResponse.json(
      { error: getErrorMessage("checkoutFailed", locale) },
      { status: 500 }
    );
  }
}
