import Stripe from "stripe";

const APP_NAME = "OldPhotoLive AI";
const APP_ID = "oldphotoliveai";
const API_VERSION = "2026-01-28.clover";

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

const STARTER_PACK = {
  productName: `${APP_NAME} Starter Pack`,
  lookupKey: `${APP_ID}_starter_pack_10_credits_usd_v1`,
  unitAmount: 499,
  currency: "usd",
  metadata: {
    app: APP_ID,
    plan: "starter_pack",
    credits: "10",
  },
};

const FAMILY_PACK = {
  productName: `${APP_NAME} Family Pack`,
  lookupKey: `${APP_ID}_family_pack_25_credits_usd_v1`,
  unitAmount: 999,
  currency: "usd",
  metadata: {
    app: APP_ID,
    plan: "family_pack",
    credits: "25",
  },
};

const ARCHIVE_PACK = {
  productName: `${APP_NAME} Archive Pack`,
  lookupKey: `${APP_ID}_archive_pack_60_credits_usd_v1`,
  unitAmount: 1999,
  currency: "usd",
  metadata: {
    app: APP_ID,
    plan: "archive_pack",
    credits: "60",
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
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
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
      needsApiVersionUpdate: existing.api_version !== API_VERSION,
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
    needsApiVersionUpdate: false,
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

  const [payAsYouGo, starterPack, familyPack, archivePack, professional, webhook] = await Promise.all([
    ensurePrice(stripe, PAY_AS_YOU_GO),
    ensurePrice(stripe, STARTER_PACK),
    ensurePrice(stripe, FAMILY_PACK),
    ensurePrice(stripe, ARCHIVE_PACK),
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
  if (webhook.needsApiVersionUpdate) {
    console.log(
      `# Webhook endpoint API version is ${webhook.endpoint.api_version ?? "account default"}; update it to ${API_VERSION} in Stripe Dashboard if you are upgrading webhook versions.`
    );
  }

  console.log("");
  console.log("Environment values:");
  console.log(`STRIPE_PRICE_PAY_AS_YOU_GO=${payAsYouGo.price.id}`);
  console.log(`STRIPE_PRICE_STARTER_PACK=${starterPack.price.id}`);
  console.log(`STRIPE_PRICE_FAMILY_PACK=${familyPack.price.id}`);
  console.log(`STRIPE_PRICE_ARCHIVE_PACK=${archivePack.price.id}`);
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
