import {
  MODELS,
  ANIMATION_PARAMS,
  runModel,
  getReplicateClient,
} from "@/lib/replicate";

// ── Mock Replicate ──────────────────────────────────────────────────────────
const runMock = jest.fn();

jest.mock("replicate", () => {
  return jest.fn().mockImplementation(() => ({ run: runMock }));
});

// ── Mock config ─────────────────────────────────────────────────────────────
jest.mock("@/lib/config", () => ({
  config: {
    replicate: { apiToken: "test-token" },
  },
}));

// ── Mock retry to avoid real delays in tests ────────────────────────────────
jest.mock("@/lib/retry", () => ({
  withRetry: async <T>(fn: () => Promise<T>) => fn(),
}));

beforeEach(() => {
  runMock.mockReset();
});

// ── MODELS constant ─────────────────────────────────────────────────────────
describe("MODELS constant", () => {
  it("contains the three fixed model versions", () => {
    expect(MODELS.restoration).toBe("tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c");
    expect(MODELS.colorization).toBe("piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695");
    expect(MODELS.animation).toBe("stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438");
  });

  it("is readonly (frozen at type level via as const)", () => {
    expect(Object.keys(MODELS)).toEqual(["restoration", "colorization", "animation"]);
  });
});

// ── ANIMATION_PARAMS constant ───────────────────────────────────────────────
describe("ANIMATION_PARAMS constant", () => {
  it("has the correct fixed values", () => {
    expect(ANIMATION_PARAMS).toEqual({
      cond_aug: 0.02,
      decoding_t: 7,
      video_length: "14_frames_with_svd",
      sizing_strategy: "maintain_aspect_ratio",
      motion_bucket_id: 127,
      frames_per_second: 6,
    });
  });
});

// ── runModel ────────────────────────────────────────────────────────────────
describe("runModel", () => {
  it("calls replicate.run with the correct model version for restoration", async () => {
    runMock.mockResolvedValueOnce("https://output.url/restored.jpg");

    const result = await runModel("restoration", { img: "https://input.url/photo.jpg" });

    expect(result).toBe("https://output.url/restored.jpg");
    expect(runMock).toHaveBeenCalledWith(
      "tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c",
      { input: { img: "https://input.url/photo.jpg" } }
    );
  });

  it("calls replicate.run with the correct model version for colorization", async () => {
    runMock.mockResolvedValueOnce("https://output.url/colorized.jpg");

    const result = await runModel("colorization", { image: "https://input.url/photo.jpg" });

    expect(result).toBe("https://output.url/colorized.jpg");
    expect(runMock).toHaveBeenCalledWith(
      "piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695",
      { input: { image: "https://input.url/photo.jpg" } }
    );
  });

  it("merges ANIMATION_PARAMS for animation model with precedence", async () => {
    runMock.mockResolvedValueOnce("https://output.url/animation.mp4");

    // Caller tries to override frames_per_second and motion_bucket_id — should be ignored
    const result = await runModel("animation", {
      input_image: "https://input.url/photo.jpg",
      frames_per_second: 30,
      motion_bucket_id: 50,
    });

    expect(result).toBe("https://output.url/animation.mp4");
    expect(runMock).toHaveBeenCalledWith(
      "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
      {
        input: {
          input_image: "https://input.url/photo.jpg",
          // ANIMATION_PARAMS override caller values
          cond_aug: 0.02,
          decoding_t: 7,
          video_length: "14_frames_with_svd",
          sizing_strategy: "maintain_aspect_ratio",
          motion_bucket_id: 127,
          frames_per_second: 6,
        },
      }
    );
  });

  it("does NOT merge ANIMATION_PARAMS for non-animation models", async () => {
    runMock.mockResolvedValueOnce("https://output.url/restored.jpg");

    await runModel("restoration", { img: "https://input.url/photo.jpg" });

    const callInput = runMock.mock.calls[0][1].input;
    expect(callInput).not.toHaveProperty("motion_bucket_id");
    expect(callInput).not.toHaveProperty("frames_per_second");
    expect(callInput).not.toHaveProperty("cond_aug");
    expect(callInput).not.toHaveProperty("video_length");
  });

  it("handles array output (returns first element)", async () => {
    runMock.mockResolvedValueOnce(["https://output.url/result.jpg", "https://other.url"]);

    const result = await runModel("restoration", { image: "https://input.url/photo.jpg" });

    expect(result).toBe("https://output.url/result.jpg");
  });

  it("handles FileOutput objects (Replicate SDK v1.x)", async () => {
    // FileOutput has toString() returning URL but JSON.stringify gives {}
    const fileOutput = { toString: () => "https://output.url/result.jpg" };
    runMock.mockResolvedValueOnce(fileOutput);

    const result = await runModel("restoration", { img: "https://input.url/photo.jpg" });

    expect(result).toBe("https://output.url/result.jpg");
  });

  it("handles object output with 'output' field", async () => {
    runMock.mockResolvedValueOnce({ output: "https://output.url/result.jpg" });

    const result = await runModel("restoration", { image: "https://input.url/photo.jpg" });

    expect(result).toBe("https://output.url/result.jpg");
  });

  it("handles object output with 'url' field", async () => {
    runMock.mockResolvedValueOnce({ url: "https://output.url/result.jpg" });

    const result = await runModel("restoration", { image: "https://input.url/photo.jpg" });

    expect(result).toBe("https://output.url/result.jpg");
  });

  it("throws on unexpected output format", async () => {
    runMock.mockResolvedValueOnce(42);

    await expect(
      runModel("restoration", { image: "https://input.url/photo.jpg" })
    ).rejects.toThrow('Unexpected output format from model "restoration": 42');
  });

  it("throws on empty array output", async () => {
    runMock.mockResolvedValueOnce([]);

    await expect(
      runModel("restoration", { image: "https://input.url/photo.jpg" })
    ).rejects.toThrow('Unexpected output format from model "restoration"');
  });

  it("propagates Replicate API errors", async () => {
    runMock.mockRejectedValueOnce(new Error("Replicate API error"));

    await expect(
      runModel("restoration", { image: "https://input.url/photo.jpg" })
    ).rejects.toThrow("Replicate API error");
  });
});
