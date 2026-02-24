// Quota Query API Route
// Requirements: 5.7, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getQuotaInfo } from "@/lib/quota";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

// Hardcoded test user ID (same as tasks route, skip auth for MVP testing)
const DEFAULT_TEST_USER_ID = "test-user-001";

export async function GET(request: NextRequest) {
  const locale = getRequestLocale(request);

  try {
    const quota = await getQuotaInfo(DEFAULT_TEST_USER_ID);
    return NextResponse.json(quota, { status: 200 });
  } catch (error) {
    console.error("Get quota failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("quotaExceeded", locale) },
      { status: 500 }
    );
  }
}
