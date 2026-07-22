export const CREDIT_PACK_EXPIRATION_DAYS = 365;

export const CREDIT_PACKS = {
  starter_pack: {
    credits: 5,
    displayPrice: "$4.99",
    lookupKey: "oldphotoliveai_starter_pack_5_credits_usd_v1",
  },
  family_pack: {
    credits: 12,
    displayPrice: "$9.99",
    lookupKey: "oldphotoliveai_family_pack_12_credits_usd_v1",
  },
  archive_pack: {
    credits: 30,
    displayPrice: "$19.99",
    lookupKey: "oldphotoliveai_archive_pack_30_credits_usd_v1",
  },
} as const;

export type CreditPackPlan = keyof typeof CREDIT_PACKS;

export const CREDIT_PACK_PLAN_IDS = Object.keys(
  CREDIT_PACKS
) as CreditPackPlan[];

export function isCreditPackPlan(value: string): value is CreditPackPlan {
  return CREDIT_PACK_PLAN_IDS.includes(value as CreditPackPlan);
}

export function getCreditPack(plan: CreditPackPlan) {
  return CREDIT_PACKS[plan];
}

// Legacy value kept so old checkout sessions/webhook retries still grant
// the amount promised by the old one-credit product.
export const LEGACY_PAY_AS_YOU_GO_CREDITS = 1;

export const PROFESSIONAL_MONTHLY_DISPLAY_PRICE = "$19.99";
