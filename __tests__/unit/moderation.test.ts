import {
  checkText,
  checkImage,
  CONTENT_REJECTED_MESSAGE,
  NSFW_IMAGE_MODEL,
  getModerationProvider,
} from "@/lib/moderation";

const runMock = jest.fn();

jest.mock("@/lib/replicate", () => ({
  getReplicateClient: () => ({ run: runMock }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
  runMock.mockReset();
  delete process.env.OPENAI_API_KEY;
  delete process.env.MODERATION_PROVIDER;
  process.env.REPLICATE_API_TOKEN = "r8_test";
});

describe("getModerationProvider", () => {
  it("defaults to replicate", () => {
    expect(getModerationProvider()).toBe("replicate");
  });
});

describe("checkText", () => {
  it("rejects blocklisted NSFW terms without calling APIs", async () => {
    const result = await checkText("make this photo look nsfw");
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("text_blocklist");
    expect(CONTENT_REJECTED_MESSAGE).toMatch(/non-refundable/i);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(runMock).not.toHaveBeenCalled();
  });

  it("passes clean text", async () => {
    const result = await checkText("restore this family photo");
    expect(result.passed).toBe(true);
  });
});

describe("checkImage (Replicate)", () => {
  it("passes normal images", async () => {
    runMock.mockResolvedValueOnce("normal");

    const result = await checkImage("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(true);
    expect(runMock).toHaveBeenCalledWith(NSFW_IMAGE_MODEL, {
      input: { image: "https://cdn.example.com/photo.jpg" },
    });
  });

  it("rejects nsfw images", async () => {
    runMock.mockResolvedValueOnce("nsfw");

    const result = await checkImage("https://cdn.example.com/bad.jpg");
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("replicate_nsfw");
  });

  it("fail-opens when Replicate throws", async () => {
    runMock.mockRejectedValueOnce(new Error("boom"));

    const result = await checkImage("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(true);
    expect(result.reason).toBe("replicate_moderation_request_failed");
  });
});

describe("checkImage (OpenAI provider)", () => {
  it("uses OpenAI when MODERATION_PROVIDER=openai", async () => {
    process.env.MODERATION_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ flagged: true, categories: { sexual: true } }],
      }),
    });

    const result = await checkImage("https://cdn.example.com/bad.jpg");
    expect(result.passed).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/moderations",
      expect.any(Object)
    );
    expect(runMock).not.toHaveBeenCalled();
  });
});
