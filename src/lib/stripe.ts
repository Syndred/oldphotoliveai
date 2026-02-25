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
