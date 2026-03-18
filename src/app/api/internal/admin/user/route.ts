import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { findProfessionalSubscriptionByCustomerId, findStripeCustomerByEmail } from "@/lib/stripe";
import { getQuotaInfo } from "@/lib/quota";
import { getUser, getUserByEmail, getUserTasks } from "@/lib/redis";
import { getRequestLocale } from "@/lib/i18n-api";
import { config } from "@/lib/config";
import type { AdminStripeSnapshot, AdminUserSnapshot } from "@/types";

function buildEmptyStripeSnapshot(): AdminStripeSnapshot {
  return {
    customerId: null,
    subscriptionStatus: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  };
}

function getSubscriptionCurrentPeriodEnd(
  subscription: unknown
): string | null {
  if (!subscription || typeof subscription !== "object") {
    return null;
  }

  const currentPeriodEnd = (subscription as { current_period_end?: unknown })
    .current_period_end;
  if (typeof currentPeriodEnd !== "number") {
    return null;
  }

  return new Date(currentPeriodEnd * 1000).toISOString();
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const locale = getRequestLocale(request);
  const unauthorizedResponse = requireAdmin(request, locale);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim() || "";
  const email = searchParams.get("email")?.trim() || "";

  if (!userId && !email) {
    return NextResponse.json(
      { error: "Provide either userId or email." },
      { status: 400 }
    );
  }

  try {
    const user = userId ? await getUser(userId) : await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const quota = await getQuotaInfo(user.id);
    const recentTasks = (await getUserTasks(user.id)).slice(0, 10).map((task) => ({
      id: task.id,
      status: task.status,
      priority: task.priority,
      progress: task.progress,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      errorMessage: task.errorMessage ?? null,
      internalErrorMessage: task.internalErrorMessage ?? null,
      failureStage: task.failureStage ?? null,
    }));
    let stripe = buildEmptyStripeSnapshot();

    if (config.stripe.isEnabled && user.email) {
      try {
        const customer = await findStripeCustomerByEmail(user.email);
        if (customer) {
          const subscription = await findProfessionalSubscriptionByCustomerId(
            customer.id
          );
          stripe = {
            customerId: customer.id,
            subscriptionStatus: subscription?.status ?? null,
            cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
            currentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription),
          };
        }
      } catch (error) {
        console.error("Admin user lookup Stripe enrichment failed:", error);
      }
    }

    const snapshot: AdminUserSnapshot = {
      user,
      quota,
      stripe,
      recentTasks,
    };

    return NextResponse.json(snapshot, { status: 200 });
  } catch (error) {
    console.error("Admin user lookup failed:", error);
    return NextResponse.json(
      { error: "Failed to load user" },
      { status: 500 }
    );
  }
}
