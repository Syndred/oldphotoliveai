// Quota Query API Route
// Requirements: 5.7, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getQuotaInfo } from "@/lib/quota";
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

    const quota = await getQuotaInfo(userId);
    return NextResponse.json(quota, { status: 200 });
  } catch (error) {
    console.error("Get quota failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("quotaExceeded", locale) },
      { status: 500 }
    );
  }
}
