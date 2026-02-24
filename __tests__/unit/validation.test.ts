import {
  validateFile,
  generateStorageKey,
  getFileExtension,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/validation";

// ── Helper: create a mock File ──────────────────────────────────────────────

function createMockFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

// ── validateFile ────────────────────────────────────────────────────────────

describe("validateFile", () => {
  it.each([
    ["image/jpeg", "photo.jpg"],
    ["image/png", "photo.png"],
    ["image/webp", "photo.webp"],
  ])("accepts valid type %s", (type, name) => {
    const file = createMockFile(name, 1024, type);
    expect(validateFile(file)).toEqual({ valid: true });
  });

  it.each([
    "image/gif",
    "image/bmp",
    "image/tiff",
    "application/pdf",
    "text/plain",
    "",
  ])("rejects invalid type %s", (type) => {
    const file = createMockFile("file.bin", 1024, type);
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("accepts a file exactly at 10MB", () => {
    const file = createMockFile("photo.jpg", MAX_FILE_SIZE, "image/jpeg");
    expect(validateFile(file)).toEqual({ valid: true });
  });

  it("rejects a file that is 10MB + 1 byte", () => {
    const file = createMockFile("photo.jpg", MAX_FILE_SIZE + 1, "image/jpeg");
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("accepts a zero-byte file with valid type", () => {
    const file = createMockFile("empty.png", 0, "image/png");
    expect(validateFile(file)).toEqual({ valid: true });
  });

  it("rejects invalid type even if size is valid", () => {
    const file = createMockFile("doc.pdf", 100, "application/pdf");
    expect(validateFile(file).valid).toBe(false);
  });

  it("rejects oversized file even if type is valid", () => {
    const file = createMockFile("big.jpg", MAX_FILE_SIZE + 1000, "image/jpeg");
    expect(validateFile(file).valid).toBe(false);
  });
});

// ── getFileExtension ────────────────────────────────────────────────────────

describe("getFileExtension", () => {
  it("extracts .jpg extension", () => {
    expect(getFileExtension("photo.jpg")).toBe(".jpg");
  });

  it("extracts .png extension", () => {
    expect(getFileExtension("image.png")).toBe(".png");
  });

  it("extracts .webp extension", () => {
    expect(getFileExtension("pic.webp")).toBe(".webp");
  });

  it("handles multiple dots — returns last extension", () => {
    expect(getFileExtension("my.photo.backup.jpg")).toBe(".jpg");
  });

  it("returns empty string for no extension", () => {
    expect(getFileExtension("README")).toBe("");
  });

  it("returns empty string when dot is at the end", () => {
    expect(getFileExtension("file.")).toBe("");
  });
});

// ── generateStorageKey ──────────────────────────────────────────────────────

describe("generateStorageKey", () => {
  it("produces a key in tasks/{uuid}/{filename} format", () => {
    const key = generateStorageKey("photo.jpg");
    expect(key).toMatch(/^tasks\/[0-9a-f-]{36}\/photo\.jpg$/);
  });

  it("preserves the original filename", () => {
    const key = generateStorageKey("my image (1).png");
    expect(key).toContain("my image (1).png");
    expect(key).toMatch(/^tasks\/[0-9a-f-]{36}\//);
  });

  it("generates unique keys for the same filename", () => {
    const keys = new Set(
      Array.from({ length: 50 }, () => generateStorageKey("photo.jpg"))
    );
    expect(keys.size).toBe(50);
  });

  it("generates unique keys for different filenames", () => {
    const key1 = generateStorageKey("a.jpg");
    const key2 = generateStorageKey("b.png");
    expect(key1).not.toBe(key2);
  });
});

// ── Constants ───────────────────────────────────────────────────────────────

describe("constants", () => {
  it("SUPPORTED_MIME_TYPES contains exactly jpeg, png, webp", () => {
    expect([...SUPPORTED_MIME_TYPES]).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("MAX_FILE_SIZE is 10MB", () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });
});
