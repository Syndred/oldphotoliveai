import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listRecentUsers } from "@/lib/redis";
import { getRequestLocale } from "@/lib/i18n-api";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const locale = getRequestLocale(request);
  const unauthorizedResponse = requireAdmin(request, locale);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { searchParams } = new URL(request.url);
  const limitValue = Number.parseInt(searchParams.get("limit") ?? "10", 10);
  const limit =
    Number.isInteger(limitValue) && limitValue > 0
      ? Math.min(limitValue, 50)
      : 10;

  try {
    const users = await listRecentUsers(limit);
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("Admin recent users lookup failed:", error);
    return NextResponse.json(
      { error: "Failed to load recent users" },
      { status: 500 }
    );
  }
}
