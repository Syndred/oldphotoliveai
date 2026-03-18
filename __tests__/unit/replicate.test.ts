import {
  MODELS,
  ANIMATION_PARAMS,
  ANIMATION_VARIANTS,
  runModel,
} from "@/lib/replicate";

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
  it("contains the fixed model versions", () => {
    expect(MODELS.restoration).toBe(
      "tencentarc/gfpgan:21c4d9d8e427bab060aff58f43823260e33b3620de1f87e8418a1df9b05f7b55"
    );
    expect(MODELS.restorationPremium).toBe(
      "microsoft/bringing-old-photos-back-to-life:c75db81db6cbd809d93cc3b7e7a088a351a3349c9fa02b6d393e35e0d51ba799"
    );
    expect(MODELS.colorization).toBe(
      "piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695"
    );
    expect(MODELS.animationFree).toBe(
      "bytedance/seedance-1-lite:cf47c0693227ff7221d3efea90e442335f4de350bc04080db7f59e7cd5b694d6"
    );
    expect(MODELS.animationPaid).toBe(
      "bytedance/seedance-1-lite:cf47c0693227ff7221d3efea90e442335f4de350bc04080db7f59e7cd5b694d6"
    );
    expect(MODELS.animationPremium).toBe(
      "bytedance/seedance-1-pro:edcd35c62d96dcd88a9f32a2d6e06f961ff4ef2d32b5b973f6a9d2b80382cb0e"
    );
  });

  it("is readonly (frozen at type level via as const)", () => {
    expect(Object.keys(MODELS)).toEqual([
      "restoration",
      "restorationPremium",
      "colorization",
      "animationFree",
      "animationPaid",
      "animationPremium",
    ]);
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

describe("ANIMATION_VARIANTS constant", () => {
  it("uses tier-specific video resolutions", () => {
    expect(ANIMATION_VARIANTS).toEqual({
      animationFree: { resolution: "480p" },
      animationPaid: { resolution: "720p" },
      animationPremium: { resolution: "1080p" },
    });
  });
});

describe("runModel", () => {
  it("calls replicate.run with the correct model version for restoration", async () => {
    runMock.mockResolvedValueOnce("https://output.url/restored.jpg");

    const result = await runModel("restoration", {
      img: "https://input.url/photo.jpg",
      version: "v1.4",
      scale: 1,
    });

    expect(result).toBe("https://output.url/restored.jpg");
    expect(runMock).toHaveBeenCalledWith(
      "tencentarc/gfpgan:21c4d9d8e427bab060aff58f43823260e33b3620de1f87e8418a1df9b05f7b55",
      {
        input: {
          img: "https://input.url/photo.jpg",
          version: "v1.4",
          scale: 1,
        },
      }
    );
  });

  it("calls replicate.run with the correct model version for premium restoration", async () => {
    runMock.mockResolvedValueOnce("https://output.url/restored-premium.jpg");

    const result = await runModel("restorationPremium", {
      image: "https://input.url/photo.jpg",
      with_scratch: true,
    });

    expect(result).toBe("https://output.url/restored-premium.jpg");
    expect(runMock).toHaveBeenCalledWith(
      "microsoft/bringing-old-photos-back-to-life:c75db81db6cbd809d93cc3b7e7a088a351a3349c9fa02b6d393e35e0d51ba799",
      {
        input: {
          image: "https://input.url/photo.jpg",
          with_scratch: true,
        },
      }
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

  it("merges animation defaults and paid resolution with precedence", async () => {
    runMock.mockResolvedValueOnce("https://output.url/animation.mp4");

    const result = await runModel("animationPaid", {
      image: "https://input.url/photo.jpg",
      duration: 4,
    });

    expect(result).toBe("https://output.url/animation.mp4");
    expect(runMock).toHaveBeenCalledWith(
      "bytedance/seedance-1-lite:cf47c0693227ff7221d3efea90e442335f4de350bc04080db7f59e7cd5b694d6",
      {
        input: {
          image: "https://input.url/photo.jpg",
          duration: 2,
          fps: 24,
          resolution: "720p",
          camera_fixed: true,
          prompt:
            "natural subtle smile, gentle blink, tiny head nod, preserve identity and facial details",
        },
      }
    );
  });

  it("normalizes input_image to image for premium animation model", async () => {
    runMock.mockResolvedValueOnce("https://output.url/animation.mp4");

    await runModel("animationPremium", {
      input_image: "https://input.url/photo.jpg",
    });

    expect(runMock).toHaveBeenCalledWith(
      "bytedance/seedance-1-pro:edcd35c62d96dcd88a9f32a2d6e06f961ff4ef2d32b5b973f6a9d2b80382cb0e",
      expect.objectContaining({
        input: expect.objectContaining({
          image: "https://input.url/photo.jpg",
          duration: 2,
          resolution: "1080p",
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
