// Upload API Route
// Requirements: 2.1, 2.2, 2.3, 2.5, 11.1, 18.5

import { NextRequest, NextResponse } from "next/server";
import { validateFile, generateStorageKey } from "@/lib/validation";
import { uploadToR2, getR2CdnUrl } from "@/lib/r2";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    // 1. Check file exists and is a File instance
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: getErrorMessage("uploadFailed", locale) },
        { status: 400 }
      );
    }

    // 2. Validate file type and size
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: getErrorMessage(validation.error!, locale) },
        { status: 400 }
      );
    }

    // 3. Generate unique storage key
    const key = generateStorageKey(file.name);

    // 4. Convert File to Buffer and upload to R2
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadToR2(buffer, key, file.type);

    // 5. Return CDN URL and key
    const url = getR2CdnUrl(key);
    return NextResponse.json({ url, key }, { status: 200 });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("uploadFailed", locale) },
      { status: 500 }
    );
  }
}
