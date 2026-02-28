import { MODELS, ANIMATION_PARAMS, runModel } from "@/lib/replicate";

const runMock = jest.fn();

jest.mock("replicate", () => {
  return jest.fn().mockImplementation(() => ({ run: runMock }));
});

jest.mock("@/lib/config", () => ({
  config: {
    replicate: { apiToken: "test-token" },
  },
}));

jest.mock("@/lib/retry", () => ({
  withRetry: async <T>(fn: () => Promise<T>) => fn(),
}));

beforeEach(() => {
  runMock.mockReset();
});

describe("MODELS constant", () => {
  it("contains the three fixed model versions", () => {
    expect(MODELS.restoration).toBe(
      "sczhou/codeformer:cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2"
    );
    expect(MODELS.colorization).toBe(
      "piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695"
    );
    expect(MODELS.animation).toBe(
      "bytedance/seedance-1-lite:78c9c4b0a7056c911b0483f58349b9931aff30d6465e7ab665e6c852949ce6d5"
    );
  });

  it("is readonly (frozen at type level via as const)", () => {
    expect(Object.keys(MODELS)).toEqual(["restoration", "colorization", "animation"]);
  });
});

describe("ANIMATION_PARAMS constant", () => {
  it("has the correct fixed values", () => {
    expect(ANIMATION_PARAMS).toEqual({
      duration: 2,
      fps: 24,
      camera_fixed: true,
      prompt:
        "natural subtle smile, gentle blink, tiny head nod, preserve identity and facial details",
    });
  });
});

describe("runModel", () => {
  it("calls replicate.run with the correct model version for restoration", async () => {
    runMock.mockResolvedValueOnce("https://output.url/restored.jpg");

    const result = await runModel("restoration", {
      image: "https://input.url/photo.jpg",
    });

    expect(result).toBe("https://output.url/restored.jpg");
    expect(runMock).toHaveBeenCalledWith(
      "sczhou/codeformer:cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2",
      { input: { image: "https://input.url/photo.jpg" } }
    );
  });

  it("calls replicate.run with the correct model version for colorization", async () => {
    runMock.mockResolvedValueOnce("https://output.url/colorized.jpg");

    const result = await runModel("colorization", {
      image: "https://input.url/photo.jpg",
    });

    expect(result).toBe("https://output.url/colorized.jpg");
    expect(runMock).toHaveBeenCalledWith(
      "piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695",
      { input: { image: "https://input.url/photo.jpg" } }
    );
  });

  it("merges ANIMATION_PARAMS for animation model with precedence", async () => {
    runMock.mockResolvedValueOnce("https://output.url/animation.mp4");

    const result = await runModel("animation", {
      image: "https://input.url/photo.jpg",
      duration: 4,
    });

    expect(result).toBe("https://output.url/animation.mp4");
    expect(runMock).toHaveBeenCalledWith(
      "bytedance/seedance-1-lite:78c9c4b0a7056c911b0483f58349b9931aff30d6465e7ab665e6c852949ce6d5",
      {
        input: {
          image: "https://input.url/photo.jpg",
          duration: 2,
          fps: 24,
          camera_fixed: true,
          prompt:
            "natural subtle smile, gentle blink, tiny head nod, preserve identity and facial details",
        },
      }
    );
  });

  it("normalizes input_image to image for animation model", async () => {
    runMock.mockResolvedValueOnce("https://output.url/animation.mp4");

    await runModel("animation", {
      input_image: "https://input.url/photo.jpg",
    });

    expect(runMock).toHaveBeenCalledWith(
      "bytedance/seedance-1-lite:78c9c4b0a7056c911b0483f58349b9931aff30d6465e7ab665e6c852949ce6d5",
      expect.objectContaining({
        input: expect.objectContaining({
          image: "https://input.url/photo.jpg",
          duration: 2,
        }),
      })
    );
    expect(runMock.mock.calls[0][1].input).not.toHaveProperty("input_image");
  });

  it("does NOT merge ANIMATION_PARAMS for non-animation models", async () => {
    runMock.mockResolvedValueOnce("https://output.url/restored.jpg");

    await runModel("restoration", { img: "https://input.url/photo.jpg" });

    const callInput = runMock.mock.calls[0][1].input;
    expect(callInput).not.toHaveProperty("duration");
  });

  it("handles array output (returns first element)", async () => {
    runMock.mockResolvedValueOnce(["https://output.url/result.jpg", "https://other.url"]);

    const result = await runModel("restoration", { image: "https://input.url/photo.jpg" });

    expect(result).toBe("https://output.url/result.jpg");
  });

  it("handles FileOutput objects (Replicate SDK v1.x)", async () => {
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
