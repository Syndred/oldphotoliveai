import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminCookieOptions,
  isAdminConfigured,
  isValidAdminKey,
} from "@/lib/admin";

interface AdminLoginBody {
  key?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value?.trim() || "";

  return NextResponse.json(
    {
      configured: isAdminConfigured(),
      authenticated: isValidAdminKey(cookieValue),
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_API_KEY is not configured" },
      { status: 503 }
    );
  }

  let body: AdminLoginBody;
  try {
    body = (await request.json()) as AdminLoginBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const key = body.key?.trim() || "";
  if (!isValidAdminKey(key)) {
    return NextResponse.json(
      { error: "Invalid admin key" },
      { status: 401 }
    );
  }

  const response = NextResponse.json(
    {
      configured: true,
      authenticated: true,
    },
    { status: 200 }
  );
  response.cookies.set(ADMIN_SESSION_COOKIE, key, getAdminCookieOptions());
  return response;
}

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json(
    {
      configured: isAdminConfigured(),
      authenticated: false,
    },
    { status: 200 }
  );
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminCookieOptions(),
    maxAge: 0,
  });
  return response;
}
