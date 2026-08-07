import {
  checkText,
  checkImage,
  CONTENT_REJECTED_MESSAGE,
  MODERATION_SCORE_THRESHOLD,
} from "@/lib/moderation";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
  delete process.env.OPENAI_API_KEY;
});

function mockModerationResponse(result: {
  flagged?: boolean;
  categories?: Record<string, boolean>;
  category_scores?: Record<string, number>;
}) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ results: [result] }),
  });
}

describe("checkText", () => {
  it("fail-opens when OPENAI_API_KEY is missing", async () => {
    const result = await checkText("hello");
    expect(result.passed).toBe(true);
    expect(result.reason).toBe("missing_openai_api_key");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects when flagged is true", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    mockModerationResponse({
      flagged: true,
      categories: { sexual: true },
      category_scores: { sexual: 0.9 },
    });

    const result = await checkText("bad prompt");
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("flagged");
    expect(CONTENT_REJECTED_MESSAGE).toMatch(/non-refundable/i);
  });

  it("rejects when any category score exceeds threshold", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    mockModerationResponse({
      flagged: false,
      category_scores: {
        sexual: MODERATION_SCORE_THRESHOLD + 0.01,
        hate: 0.1,
      },
    });

    const result = await checkText("borderline");
    expect(result.passed).toBe(false);
  });

  it("passes clean text", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    mockModerationResponse({
      flagged: false,
      category_scores: { sexual: 0.01 },
    });

    const result = await checkText("restore this family photo");
    expect(result.passed).toBe(true);
  });

  it("fail-opens on API error", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "boom",
    });

    const result = await checkText("hello");
    expect(result.passed).toBe(true);
    expect(result.reason).toBe("api_error_500");
  });
});

describe("checkImage", () => {
  it("sends image_url payload to omni-moderation-latest", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    mockModerationResponse({ flagged: false, category_scores: {} });

    await checkImage("https://cdn.example.com/photo.jpg");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/moderations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          model: "omni-moderation-latest",
          input: [
            {
              type: "image_url",
              image_url: { url: "https://cdn.example.com/photo.jpg" },
            },
          ],
        }),
      })
    );
  });

  it("rejects flagged images", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    mockModerationResponse({
      flagged: true,
      categories: { sexual: true },
    });

    const result = await checkImage("https://cdn.example.com/bad.jpg");
    expect(result.passed).toBe(false);
  });
});
