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

beforeEach(() => {
  runMock.mockReset();
});

// ── MODELS constant ─────────────────────────────────────────────────────────
describe("MODELS constant", () => {
  it("contains the three fixed model versions", () => {
    expect(MODELS.restoration).toBe("tencentarc/gfpgan:9283608cc6b7");
    expect(MODELS.colorization).toBe("piddnad/ddcolor:8ca1066c7138");
    expect(MODELS.animation).toBe("anotherframe/animate-diffusion:26d6c9f70b69");
  });

  it("is readonly (frozen at type level via as const)", () => {
    expect(Object.keys(MODELS)).toEqual(["restoration", "colorization", "animation"]);
  });
});

// ── ANIMATION_PARAMS constant ───────────────────────────────────────────────
describe("ANIMATION_PARAMS constant", () => {
  it("has the correct fixed values", () => {
    expect(ANIMATION_PARAMS).toEqual({
      motion_bucket_id: 1,
      fps: 24,
      duration: 4,
      output_format: "mp4",
    });
  });
});

// ── runModel ────────────────────────────────────────────────────────────────
describe("runModel", () => {
  it("calls replicate.run with the correct model version for restoration", async () => {
    runMock.mockResolvedValueOnce("https://output.url/restored.jpg");

    const result = await runModel("restoration", { image: "https://input.url/photo.jpg" });

    expect(result).toBe("https://output.url/restored.jpg");
    expect(runMock).toHaveBeenCalledWith(
      "tencentarc/gfpgan:9283608cc6b7",
      { input: { image: "https://input.url/photo.jpg" } }
    );
  });

  it("calls replicate.run with the correct model version for colorization", async () => {
    runMock.mockResolvedValueOnce("https://output.url/colorized.jpg");

    const result = await runModel("colorization", { image: "https://input.url/photo.jpg" });

    expect(result).toBe("https://output.url/colorized.jpg");
    expect(runMock).toHaveBeenCalledWith(
      "piddnad/ddcolor:8ca1066c7138",
      { input: { image: "https://input.url/photo.jpg" } }
    );
  });

  it("merges ANIMATION_PARAMS for animation model with precedence", async () => {
    runMock.mockResolvedValueOnce("https://output.url/animation.mp4");

    // Caller tries to override fps and duration — should be ignored
    const result = await runModel("animation", {
      image: "https://input.url/photo.jpg",
      fps: 60,
      duration: 10,
      output_format: "webm",
    });

    expect(result).toBe("https://output.url/animation.mp4");
    expect(runMock).toHaveBeenCalledWith(
      "anotherframe/animate-diffusion:26d6c9f70b69",
      {
        input: {
          image: "https://input.url/photo.jpg",
          // ANIMATION_PARAMS override caller values
          motion_bucket_id: 1,
          fps: 24,
          duration: 4,
          output_format: "mp4",
        },
      }
    );
  });

  it("does NOT merge ANIMATION_PARAMS for non-animation models", async () => {
    runMock.mockResolvedValueOnce("https://output.url/restored.jpg");

    await runModel("restoration", { image: "https://input.url/photo.jpg" });

    const callInput = runMock.mock.calls[0][1].input;
    expect(callInput).not.toHaveProperty("motion_bucket_id");
    expect(callInput).not.toHaveProperty("fps");
    expect(callInput).not.toHaveProperty("duration");
    expect(callInput).not.toHaveProperty("output_format");
  });

  it("handles array output (returns first element)", async () => {
    runMock.mockResolvedValueOnce(["https://output.url/result.jpg", "https://other.url"]);

    const result = await runModel("restoration", { image: "https://input.url/photo.jpg" });

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
    ).rejects.toThrow('Unexpected output format from model "restoration"');
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
