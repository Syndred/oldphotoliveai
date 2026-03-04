import { uploadToR2, getR2CdnUrl, deleteFromR2, deleteTaskFiles, getS3Client } from "@/lib/r2";

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
