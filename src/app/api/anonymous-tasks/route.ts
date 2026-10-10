import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage, getRequestLocale } from "@/lib/i18n-api";

/** Older clients must also purchase before a new generation can be queued. */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: getErrorMessage("paymentRequired", getRequestLocale(request)),
    code: "PAYMENT_REQUIRED",
    stage: "authorization",
    allowanceConsumed: false,
  }, { status: 402 });
}
