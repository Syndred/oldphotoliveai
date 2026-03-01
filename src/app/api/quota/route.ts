// Quota Query API Route
// Requirements: 5.7, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getQuotaInfo } from "@/lib/quota";
import { getUser } from "@/lib/redis";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

export async function GET(request: NextRequest) {
  const locale = getRequestLocale(request);

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const userId = token?.userId as string | undefined;

    if (!userId) {
      return NextResponse.json(
        { error: getErrorMessage("unauthorized", locale) },
        { status: 401 }
      );
    }

    const [quota, user] = await Promise.all([getQuotaInfo(userId), getUser(userId)]);
    if (!user) {
      return NextResponse.json(
        { error: getErrorMessage("unauthorized", locale) },
        { status: 404 }
      );
    }

    const normalizedQuota =
      user.tier === "pay_as_you_go"
        ? {
            ...quota,
            tier: "pay_as_you_go" as const,
            dailyLimit: null,
            resetAt: null,
            remaining: quota.credits,
          }
        : user.tier === "professional"
          ? {
              ...quota,
              tier: "professional" as const,
              dailyLimit: null,
              resetAt: null,
            }
          : {
              ...quota,
              tier: "free" as const,
            };

    return NextResponse.json(normalizedQuota, { status: 200 });
  } catch (error) {
    console.error("Get quota failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("quotaExceeded", locale) },
      { status: 500 }
    );
  }
}
