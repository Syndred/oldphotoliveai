import Stripe from "stripe";

const APP_NAME = "OldPhotoLive AI";
const APP_ID = "oldphotoliveai";
const API_VERSION = "2025-05-28.basil";

const PAY_AS_YOU_GO = {
  productName: `${APP_NAME} Pay As You Go`,
  lookupKey: `${APP_ID}_pay_as_you_go_1_credit_usd_v2`,
  unitAmount: 99,
  currency: "usd",
  metadata: {
    app: APP_ID,
    plan: "pay_as_you_go",
    credits: "1",
  },
};

const PROFESSIONAL = {
  productName: `${APP_NAME} Professional`,
  lookupKey: `${APP_ID}_professional_monthly_usd_v2`,
  unitAmount: 1999,
  currency: "usd",
  recurring: {
    interval: "month",
    interval_count: 1,
  },
  metadata: {
    app: APP_ID,
    plan: "professional",
  },
};

const ENABLED_EVENTS = [
  "checkout.session.completed",
  "invoice.payment_failed",
  "customer.subscription.deleted",
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function ensureProduct(stripe, productName, metadata) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find((product) => product.name === productName);

  if (existing) {
    return { product: existing, created: false };
  }

  const product = await stripe.products.create({
    name: productName,
    metadata,
  });

  return { product, created: true };
}

async function ensurePrice(stripe, definition) {
  const existingPrices = await stripe.prices.list({
    active: true,
    lookup_keys: [definition.lookupKey],
    limit: 1,
  });

  const existing = existingPrices.data[0];
  if (existing) {
    return { price: existing, created: false };
  }

  const { product } = await ensureProduct(
    stripe,
    definition.productName,
    definition.metadata
  );

  const price = await stripe.prices.create({
    currency: definition.currency,
    unit_amount: definition.unitAmount,
    product: product.id,
    lookup_key: definition.lookupKey,
    metadata: definition.metadata,
    ...(definition.recurring ? { recurring: definition.recurring } : {}),
  });

  return { price, created: true };
}

async function ensureWebhookEndpoint(stripe, webhookUrl) {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = endpoints.data.find((endpoint) => endpoint.url === webhookUrl);

  if (existing) {
    const enabledEvents = Array.from(
      new Set([...existing.enabled_events, ...ENABLED_EVENTS])
    );
    const needsUpdate =
      ENABLED_EVENTS.some((eventName) => !existing.enabled_events.includes(eventName));
    const endpoint = needsUpdate
      ? await stripe.webhookEndpoints.update(existing.id, {
          enabled_events: enabledEvents,
        })
      : existing;

    return {
      endpoint,
      secret: null,
      created: false,
      updated: needsUpdate,
    };
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: ENABLED_EVENTS,
    api_version: API_VERSION,
    metadata: {
      app: APP_ID,
    },
  });

  return {
    endpoint,
    secret: endpoint.secret,
    created: true,
    updated: false,
  };
}

async function main() {
  const secretKey = requireEnv("STRIPE_SECRET_KEY");
  const nextAuthUrl = requireEnv("NEXTAUTH_URL");
  const webhookUrl =
    process.env.STRIPE_WEBHOOK_URL || `${nextAuthUrl}/api/stripe/webhook`;

  const stripe = new Stripe(secretKey, {
    apiVersion: API_VERSION,
  });

  const [payAsYouGo, professional, webhook] = await Promise.all([
    ensurePrice(stripe, PAY_AS_YOU_GO),
    ensurePrice(stripe, PROFESSIONAL),
    ensureWebhookEndpoint(stripe, webhookUrl),
  ]);

  console.log(
    payAsYouGo.created
      ? `Created pay-as-you-go price: ${payAsYouGo.price.id}`
      : `Reused pay-as-you-go price: ${payAsYouGo.price.id}`
  );
  console.log(
    professional.created
      ? `Created professional price: ${professional.price.id}`
      : `Reused professional price: ${professional.price.id}`
  );
  console.log(
    webhook.created
      ? `Created webhook endpoint: ${webhook.endpoint.id}`
      : webhook.updated
        ? `Updated webhook endpoint: ${webhook.endpoint.id}`
        : `Reused webhook endpoint: ${webhook.endpoint.id}`
  );

  console.log("");
  console.log("Environment values:");
  console.log(`STRIPE_PRICE_PAY_AS_YOU_GO=${payAsYouGo.price.id}`);
  console.log(`STRIPE_PRICE_PROFESSIONAL=${professional.price.id}`);

  if (webhook.secret) {
    console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
  } else {
    console.log(
      "# STRIPE_WEBHOOK_SECRET was not returned because the webhook endpoint already existed."
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
