import { POST } from "@/app/api/upload/route";
import { NextRequest } from "next/server";

// ── Mock dependencies ───────────────────────────────────────────────────────

const mockUploadToR2 = jest.fn().mockResolvedValue("tasks/uuid/photo.jpg");
const mockGetR2CdnUrl = jest.fn().mockReturnValue("https://cdn.example.com/tasks/uuid/photo.jpg");

jest.mock("@/lib/r2", () => ({
  uploadToR2: (...args: unknown[]) => mockUploadToR2(...args),
  getR2CdnUrl: (...args: unknown[]) => mockGetR2CdnUrl(...args),
}));

jest.mock("@/lib/config", () => ({
  config: {
    r2: {
      accountId: "test",
      accessKeyId: "test",
      secretAccessKey: "test",
      bucketName: "test-bucket",
      publicDomain: "cdn.example.com",
    },
  },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function createFileRequest(file?: File): NextRequest {
  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  }
  return new NextRequest("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  });
}

function createTestFile(
  name: string,
  type: string,
  sizeBytes: number
): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type });
}

// ── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUploadToR2.mockReset().mockResolvedValue("tasks/uuid/photo.jpg");
  mockGetR2CdnUrl.mockReset().mockReturnValue("https://cdn.example.com/tasks/uuid/photo.jpg");
});

describe("POST /api/upload", () => {
  it("returns 400 when no file is provided", async () => {
    const req = createFileRequest();
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("请选择要上传的文件");
  });

  it("returns 400 for unsupported file type", async () => {
    const file = createTestFile("doc.pdf", "application/pdf", 1024);
    const req = createFileRequest(file);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("请上传 JPEG、PNG 或 WebP 格式的图片");
  });

  it("returns 400 for file exceeding 10MB", async () => {
    const file = createTestFile("big.jpg", "image/jpeg", 11 * 1024 * 1024);
    const req = createFileRequest(file);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("文件大小不能超过 10MB");
  });

  it("returns 200 with url and key for valid JPEG upload", async () => {
    const file = createTestFile("photo.jpg", "image/jpeg", 5000);
    const req = createFileRequest(file);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("url");
    expect(body).toHaveProperty("key");
    expect(mockUploadToR2).toHaveBeenCalledTimes(1);
    expect(mockGetR2CdnUrl).toHaveBeenCalledTimes(1);
  });

  it("returns 200 for valid PNG upload", async () => {
    const file = createTestFile("image.png", "image/png", 2000);
    const req = createFileRequest(file);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockUploadToR2).toHaveBeenCalledTimes(1);
  });

  it("returns 200 for valid WebP upload", async () => {
    const file = createTestFile("image.webp", "image/webp", 3000);
    const req = createFileRequest(file);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockUploadToR2).toHaveBeenCalledTimes(1);
  });

  it("passes correct arguments to uploadToR2", async () => {
    const file = createTestFile("test.png", "image/png", 1024);
    const req = createFileRequest(file);
    await POST(req);

    expect(mockUploadToR2).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining("test.png"),
      "image/png"
    );
  });

  it("returns 500 when R2 upload fails", async () => {
    mockUploadToR2.mockRejectedValueOnce(new Error("R2 connection error"));

    const file = createTestFile("photo.jpg", "image/jpeg", 1024);
    const req = createFileRequest(file);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("上传失败，请稍后重试");
  });

  it("accepts a file exactly at 10MB", async () => {
    const file = createTestFile("exact.jpg", "image/jpeg", 10 * 1024 * 1024);
    const req = createFileRequest(file);
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});
