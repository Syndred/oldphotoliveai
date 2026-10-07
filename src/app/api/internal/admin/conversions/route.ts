import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getRequestLocale } from "@/lib/i18n-api";
import { getRedisClient } from "@/lib/redis";

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request, getRequestLocale(request));
  if (unauthorized) return unauthorized;
  const requestedDays = Number(request.nextUrl.searchParams.get("days") ?? 14);
  const days = Number.isInteger(requestedDays) ? Math.max(1, Math.min(90, requestedDays)) : 14;
  try {
    const daily = await Promise.all(Array.from({ length: days }, async (_, index) => {
      const date = new Date(Date.now() - index * 86400000).toISOString().slice(0, 10);
      const counts = await getRedisClient().hgetall<Record<string, number>>(`conversion:${date}`);
      return {
        date,
        purchases: Number(counts?.purchases ?? 0),
        revenueMinorUsd: Number(counts?.revenue_minor_usd ?? 0),
        generationsCompleted: Number(counts?.generations_completed ?? 0),
        paidGenerationsCompleted: Number(counts?.paid_generations_completed ?? 0),
        hdRemakesCompleted: Number(counts?.hd_remakes_completed ?? 0),
        previewsCompleted: Number(counts?.preview_generations_completed ?? 0),
        singlePhotoPurchases: Number(counts?.single_photo_purchases ?? 0),
        creditUnlocks: Number(counts?.credit_unlocks ?? 0),
        resultDownloadRequests: Number(counts?.result_download_requests ?? 0),
        fulfillmentIssues: Number(counts?.fulfillment_issues ?? 0),
      };
    }));
    return NextResponse.json({ timezone: "UTC", scope: "since_instrumentation", daily }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load conversion counts" }, { status: 503 });
  }
}
