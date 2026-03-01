import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { initializeFreeQuota, ensureFreeQuotaInitialized } from "@/lib/quota";
import { getUser, getUserByEmail, updateUserTier } from "@/lib/redis";
import type { UserTier } from "@/types";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

interface UpdateTierBody {
  userId?: string;
  email?: string;
  tier?: string;
}

function isUserTier(value: string): value is UserTier {
  return value === "free" || value === "pay_as_you_go" || value === "professional";
}

function getAdminKeyFromRequest(request: NextRequest): string {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return request.headers.get("x-admin-key")?.trim() || "";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const locale = getRequestLocale(request);
  const configuredKey = config.admin.apiKey;
  if (!configuredKey) {
    return NextResponse.json(
      { error: "ADMIN_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const requestKey = getAdminKeyFromRequest(request);
  if (!requestKey || requestKey !== configuredKey) {
    return NextResponse.json(
      { error: getErrorMessage("unauthorized", locale) },
      { status: 401 }
    );
  }

  let body: UpdateTierBody;
  try {
    body = (await request.json()) as UpdateTierBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const userId = body.userId?.trim();
  const email = body.email?.trim();
  const tier = body.tier?.trim();
  if ((!userId && !email) || !tier || !isUserTier(tier)) {
    return NextResponse.json(
      { error: "Invalid payload. Expected { tier, userId? , email? } and either userId or email." },
      { status: 400 }
    );
  }

  try {
    const user = userId ? await getUser(userId) : await getUserByEmail(email!);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const targetUserId = user.id;

    await updateUserTier(targetUserId, tier);
    if (tier === "free") {
      if (user.tier === "free") {
        await ensureFreeQuotaInitialized(targetUserId);
      } else {
        await initializeFreeQuota(targetUserId);
      }
    }

    return NextResponse.json(
      {
        userId: targetUserId,
        email: user.email,
        previousTier: user.tier,
        tier,
        updated: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin tier update failed:", error);
    return NextResponse.json(
      { error: "Failed to update tier" },
      { status: 500 }
    );
  }
}
