const mockSignUrl = jest.fn();
jest.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: (...args: unknown[]) => mockSignUrl(...args) }));
import { uploadToR2, getR2CdnUrl, deleteFromR2, deleteTaskFiles, getS3Client, uploadPrivateToR2, getPrivateObjectFromR2, getPrivateR2SignedUrl, headPrivateObjectFromR2, deletePrivateTaskFiles } from "@/lib/r2";

// ── Mock @aws-sdk/client-s3 ────────────────────────────────────────────────
const sendMock = jest.fn().mockResolvedValue({});

jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3");
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  };
});

// ── Mock config ─────────────────────────────────────────────────────────────
jest.mock("@/lib/config", () => ({
  config: {
    r2: {
      accountId: "test-account-id",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      bucketName: "test-bucket",
      publicDomain: "cdn.example.com",
    },
  },
}));

beforeEach(() => {
  sendMock.mockReset().mockResolvedValue({});
});

// ── getR2CdnUrl ────────────────────────────────────────────────────────────
describe("getR2CdnUrl", () => {
  it("returns the correct CDN URL for a given key", () => {
    expect(getR2CdnUrl("tasks/abc/original.jpg")).toBe(
      "https://cdn.example.com/tasks/abc/original.jpg"
    );
  });

  it("handles keys without slashes", () => {
    expect(getR2CdnUrl("photo.png")).toBe("https://cdn.example.com/photo.png");
  });

  it("URL-encodes unsafe filename characters", () => {
    expect(getR2CdnUrl("tasks/abc/my image (1).jfif")).toBe(
      "https://cdn.example.com/tasks/abc/my%20image%20(1).jfif"
    );
  });
});

// ── uploadToR2 ──────────────────────────────────────────────────────────────
describe("uploadToR2", () => {
  it("sends a PutObjectCommand with the correct params and returns the key", async () => {
    const buf = Buffer.from("fake-image-data");
    const key = "tasks/123/original.jpg";

    const result = await uploadToR2(buf, key, "image/jpeg");

    expect(result).toBe(key);
    expect(sendMock).toHaveBeenCalledTimes(1);

    const command = sendMock.mock.calls[0][0];
    expect(command.input).toEqual({
      Bucket: "test-bucket",
      Key: key,
      Body: buf,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=86400, stale-while-revalidate=604800",
    });
  });

  it("propagates S3 errors", async () => {
    sendMock.mockRejectedValueOnce(new Error("S3 upload failed"));

    await expect(
      uploadToR2(Buffer.from("x"), "k", "image/png")
    ).rejects.toThrow("S3 upload failed");
  });
});

// ── deleteFromR2 ────────────────────────────────────────────────────────────
describe("deleteFromR2", () => {
  it("sends a DeleteObjectCommand with the correct params", async () => {
    await deleteFromR2("tasks/123/original.jpg");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0];
    expect(command.input).toEqual({
      Bucket: "test-bucket",
      Key: "tasks/123/original.jpg",
    });
  });

  it("propagates S3 errors", async () => {
    sendMock.mockRejectedValueOnce(new Error("S3 delete failed"));

    await expect(deleteFromR2("k")).rejects.toThrow("S3 delete failed");
  });
});

// ── deleteTaskFiles ─────────────────────────────────────────────────────────
describe("deleteTaskFiles", () => {
  it("lists objects with the task prefix and deletes each one", async () => {
    // First call = ListObjectsV2, subsequent calls = DeleteObject
    sendMock
      .mockResolvedValueOnce({
        Contents: [
          { Key: "tasks/abc/original.jpg" },
          { Key: "tasks/abc/restored.jpg" },
          { Key: "tasks/abc/colorized.jpg" },
          { Key: "tasks/abc/animation.mp4" },
        ],
      })
      .mockResolvedValue({}); // delete calls

    await deleteTaskFiles("abc");

    // 1 list + 4 deletes
    expect(sendMock).toHaveBeenCalledTimes(5);

    // Verify the list command
    const listCmd = sendMock.mock.calls[0][0];
    expect(listCmd.input).toEqual({
      Bucket: "test-bucket",
      Prefix: "tasks/abc/",
    });

    // Verify delete commands were issued for each key
    const deleteKeys = sendMock.mock.calls
      .slice(1)
      .map((call: unknown[]) => (call[0] as { input: { Key: string } }).input.Key)
      .sort();
    expect(deleteKeys).toEqual([
      "tasks/abc/animation.mp4",
      "tasks/abc/colorized.jpg",
      "tasks/abc/original.jpg",
      "tasks/abc/restored.jpg",
    ]);
  });

  it("handles empty listing gracefully (no files to delete)", async () => {
    sendMock.mockResolvedValueOnce({ Contents: [] });

    await deleteTaskFiles("empty-task");

    // Only the list call, no deletes
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("handles undefined Contents gracefully", async () => {
    sendMock.mockResolvedValueOnce({});

    await deleteTaskFiles("no-contents");

    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});


describe("private master bucket", () => {
  const previousBucket = process.env.R2_PRIVATE_BUCKET_NAME;
  afterEach(() => {
    if (previousBucket === undefined) delete process.env.R2_PRIVATE_BUCKET_NAME;
    else process.env.R2_PRIVATE_BUCKET_NAME = previousBucket;
    delete process.env.R2_PRIVATE_ACCESS_KEY_ID;
    delete process.env.R2_PRIVATE_SECRET_ACCESS_KEY;
  });
  it("fails closed if the private bucket is missing or points at the public bucket", async () => {
    delete process.env.R2_PRIVATE_BUCKET_NAME;
    await expect(uploadPrivateToR2(Buffer.from("clean"), "key", "video/mp4")).rejects.toThrow("PRIVATE_MASTER_BUCKET_NOT_CONFIGURED");
    process.env.R2_PRIVATE_BUCKET_NAME = "test-bucket";
    await expect(getPrivateObjectFromR2("key")).rejects.toThrow("PRIVATE_MASTER_BUCKET_NOT_CONFIGURED");
    expect(sendMock).not.toHaveBeenCalled();
  });
  it("uploads clean masters only into the private bucket and disables caching", async () => {
    process.env.R2_PRIVATE_BUCKET_NAME = "private-masters";
    await uploadPrivateToR2(Buffer.from("clean"), "tasks/task/master.mp4", "video/mp4");
    expect(sendMock.mock.calls[0][0].input).toMatchObject({ Bucket: "private-masters", Key: "tasks/task/master.mp4", CacheControl: "private, no-store, max-age=0" });
  });
  it("uses private range reads and HEAD for authorized delivery/readiness checks", async () => {
    process.env.R2_PRIVATE_BUCKET_NAME = "private-masters";
    await getPrivateObjectFromR2("key", { range: "bytes=0-99" });
    await headPrivateObjectFromR2("key");
    expect(sendMock.mock.calls[0][0].input).toMatchObject({ Bucket: "private-masters", Key: "key", Range: "bytes=0-99" });
    expect(sendMock.mock.calls[1][0].input).toEqual({ Bucket: "private-masters", Key: "key" });
  });
  it("signs a limited server-side model input without using the public domain", async () => {
    process.env.R2_PRIVATE_BUCKET_NAME = "private-masters";
    mockSignUrl.mockResolvedValueOnce("https://s3.private/master?signature=server-only");
    expect(await getPrivateR2SignedUrl("master")).toContain("signature");
    expect(mockSignUrl.mock.calls[0][1].input).toEqual({ Bucket: "private-masters", Key: "master" });
    expect(mockSignUrl.mock.calls[0][2]).toEqual({ expiresIn: 900 });
  });
  it("cleans private objects including all listing pages without touching the public bucket", async () => {
    process.env.R2_PRIVATE_BUCKET_NAME = "private-masters";
    sendMock.mockResolvedValueOnce({ Contents: [{ Key: "tasks/task/master.jpg" }], IsTruncated: true, NextContinuationToken: "next" }).mockResolvedValueOnce({ Contents: [{ Key: "tasks/task/master.mp4" }] });
    await deletePrivateTaskFiles("task");
    expect(sendMock.mock.calls).toHaveLength(4);
    expect(sendMock.mock.calls.every(([command]) => command.input.Bucket === "private-masters")).toBe(true);
    expect(sendMock.mock.calls[1][0].input.ContinuationToken).toBe("next");
  });
  it("refuses incomplete private credentials instead of silently falling back", async () => {
    process.env.R2_PRIVATE_BUCKET_NAME = "private-masters";
    process.env.R2_PRIVATE_ACCESS_KEY_ID = "only-half";
    await expect(headPrivateObjectFromR2("key")).rejects.toThrow("PRIVATE_MASTER_CREDENTIALS_INCOMPLETE");
  });
});
