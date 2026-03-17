import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { addCredits, clearCredits, getQuotaInfo } from "@/lib/quota";
import { getUser, getUserByEmail } from "@/lib/redis";
import { getRequestLocale } from "@/lib/i18n-api";

interface GrantCreditsBody {
  userId?: string;
  email?: string;
  credits?: number;
  expirationDays?: number;
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const locale = getRequestLocale(request);
  const unauthorizedResponse = requireAdmin(request, locale);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let body: GrantCreditsBody;
  try {
    body = (await request.json()) as GrantCreditsBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const userId = body.userId?.trim();
  const email = body.email?.trim();
  const credits = parsePositiveInt(body.credits);
  const expirationDays = body.expirationDays ?? 30;

  if ((!userId && !email) || credits === null) {
    return NextResponse.json(
      { error: "Invalid payload. Expected { credits, userId? , email? } and either userId or email." },
      { status: 400 }
    );
  }

  if (
    typeof expirationDays !== "number" ||
    !Number.isInteger(expirationDays) ||
    expirationDays <= 0
  ) {
    return NextResponse.json(
      { error: "expirationDays must be a positive integer" },
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

    await addCredits(user.id, credits, expirationDays);
    const quota = await getQuotaInfo(user.id);

    return NextResponse.json(
      {
        userId: user.id,
        email: user.email,
        grantedCredits: credits,
        expirationDays,
        quota,
        updated: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin credits update failed:", error);
    return NextResponse.json(
      { error: "Failed to grant credits" },
      { status: 500 }
    );
  }
}

interface ClearCreditsBody {
  userId?: string;
  email?: string;
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const locale = getRequestLocale(request);
  const unauthorizedResponse = requireAdmin(request, locale);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let body: ClearCreditsBody;
  try {
    body = (await request.json()) as ClearCreditsBody;
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

    await clearCredits(user.id);
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
    console.error("Admin credits clear failed:", error);
    return NextResponse.json(
      { error: "Failed to clear credits" },
      { status: 500 }
    );
  }
}
