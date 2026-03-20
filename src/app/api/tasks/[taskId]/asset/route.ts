import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getTaskOwnedByUser } from "@/lib/redis";
import { getObjectFromR2, r2BodyToWebStream } from "@/lib/r2";
import {
  getTaskAssetFilename,
  isTaskAssetKind,
  resolveTaskAssetKey,
} from "@/lib/task-assets";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

export const runtime = "nodejs";

interface TaskAssetRouteContext {
  params: {
    taskId: string;
  };
}

function normalizeRangeHeader(value: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed.startsWith("bytes=")) {
    return null;
  }

  return trimmed;
}

export async function GET(
  request: NextRequest,
  { params }: TaskAssetRouteContext
) {
  const locale = getRequestLocale(request);
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

  const kindParam = request.nextUrl.searchParams.get("kind")?.trim() ?? "";
  if (!isTaskAssetKind(kindParam)) {
    return NextResponse.json(
      { error: getErrorMessage("taskNotFound", locale) },
      { status: 404 }
    );
  }

  const task = await getTaskOwnedByUser(params.taskId, userId);
  if (!task) {
    return NextResponse.json(
      { error: getErrorMessage("taskNotFound", locale) },
      { status: 404 }
    );
  }

  const key = resolveTaskAssetKey(task, kindParam);
  if (!key) {
    return NextResponse.json(
      { error: getErrorMessage("taskNotFound", locale) },
      { status: 404 }
    );
  }

  const range = normalizeRangeHeader(request.headers.get("range"));
  const shouldDownload = request.nextUrl.searchParams.get("download") === "1";

  try {
    const object = await getObjectFromR2(key, range ? { range } : {});
    const stream = r2BodyToWebStream(object.Body);

    if (!stream) {
      return NextResponse.json(
        { error: getErrorMessage("taskNotFound", locale) },
        { status: 404 }
      );
    }

    const headers = new Headers();
    headers.set("Cache-Control", "private, no-store, max-age=0");

    if (object.ContentType) {
      headers.set("Content-Type", object.ContentType);
    }

    if (typeof object.ContentLength === "number") {
      headers.set("Content-Length", String(object.ContentLength));
    }

    if (object.ETag) {
      headers.set("ETag", object.ETag);
    }

    if (object.LastModified) {
      headers.set("Last-Modified", object.LastModified.toUTCString());
    }

    if (object.AcceptRanges) {
      headers.set("Accept-Ranges", object.AcceptRanges);
    } else {
      headers.set("Accept-Ranges", "bytes");
    }

    if (object.ContentRange) {
      headers.set("Content-Range", object.ContentRange);
    }

    if (shouldDownload) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${getTaskAssetFilename(kindParam)}"`
      );
    }

    return new Response(stream, {
      status: object.ContentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error("Task asset load failed:", {
      taskId: params.taskId,
      kind: kindParam,
      error,
    });

    return NextResponse.json(
      { error: getErrorMessage("taskNotFound", locale) },
      { status: 404 }
    );
  }
}
