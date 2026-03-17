import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getQuotaInfo, resetFreeQuota } from "@/lib/quota";
import { getUser, getUserByEmail } from "@/lib/redis";
import { getRequestLocale } from "@/lib/i18n-api";

interface ResetQuotaBody {
  userId?: string;
  email?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const locale = getRequestLocale(request);
  const unauthorizedResponse = requireAdmin(request, locale);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let body: ResetQuotaBody;
  try {
    body = (await request.json()) as ResetQuotaBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const userId = body.userId?.trim();
  const email = body.email?.trim();
  if (!userId && !email) {
    return NextResponse.json(
      { error: "Invalid payload. Expected { userId? , email? } and either userId or email." },
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

    await resetFreeQuota(user.id);
    const quota = await getQuotaInfo(user.id);

    return NextResponse.json(
      {
        userId: user.id,
        email: user.email,
        quota,
        updated: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin quota reset failed:", error);
    return NextResponse.json(
      { error: "Failed to reset free quota" },
      { status: 500 }
    );
  }
}
