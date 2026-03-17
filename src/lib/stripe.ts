// Stripe Client Configuration
// Requirements: 6.1

import Stripe from "stripe";
import { config } from "./config";

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(config.stripe.secretKey, {
      // @ts-expect-error -- installed Stripe SDK expects newer API version
      apiVersion: "2025-05-28.basil",
      typescript: true,
    });
  }
  return stripeInstance;
}

export async function findStripeCustomerByEmail(
  email: string
): Promise<Stripe.Customer | null> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) {
    return null;
  }

  const stripe = getStripeClient();
  const customers = await stripe.customers.list({
    email: normalizedEmail,
    limit: 1,
  });

  return customers.data[0] ?? null;
}

export async function getOrCreateStripeCustomer(params: {
  email: string;
  userId: string;
  name?: string;
}): Promise<Stripe.Customer> {
  const existingCustomer = await findStripeCustomerByEmail(params.email);
  if (existingCustomer) {
    return existingCustomer;
  }

  const stripe = getStripeClient();
  return stripe.customers.create({
    email: params.email.trim(),
    ...(params.name ? { name: params.name.trim() } : {}),
    metadata: {
      userId: params.userId,
    },
  });
}

export async function findProfessionalSubscriptionByCustomerId(
  customerId: string
): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient();
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  const professionalPriceId = config.stripe.priceIds.professional;
  const professionalSubscriptions = subscriptions.data
    .filter((subscription) => {
      if (
        subscription.status === "canceled" ||
        subscription.status === "incomplete_expired"
      ) {
        return false;
      }

      return subscription.items.data.some((item) => {
        return (
          item.price.id === professionalPriceId ||
          item.price.lookup_key === "oldphotoliveai_professional_monthly_usd_v2"
        );
      });
    })
    .sort((a, b) => b.created - a.created);

  return professionalSubscriptions[0] ?? null;
}
