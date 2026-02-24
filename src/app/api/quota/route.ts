// Quota Query API Route
// Requirements: 5.7

import { NextResponse } from "next/server";
import { getQuotaInfo } from "@/lib/quota";

// Hardcoded test user ID (same as tasks route, skip auth for MVP testing)
const DEFAULT_TEST_USER_ID = "test-user-001";

export async function GET() {
  try {
    const quota = await getQuotaInfo(DEFAULT_TEST_USER_ID);
    return NextResponse.json(quota, { status: 200 });
  } catch (error) {
    console.error("Get quota failed:", error);
    return NextResponse.json(
      { error: "Failed to get quota info" },
      { status: 500 }
    );
  }
}
