import {
  MODELS,
  ANIMATION_PARAMS,
  ANIMATION_VARIANTS,
  runModel,
} from "@/lib/replicate";

const getMock = jest.fn();
const fetchMock = jest.fn();
const originalFetch = global.fetch;

jest.mock("replicate", () =>
  jest.fn().mockImplementation(() => ({
    predictions: { get: getMock, cancel: jest.fn() },
  }))
);
jest.mock("@/lib/config", () => ({
  config: { replicate: { apiToken: "test-token" } },
}));
jest.mock("@/lib/replicate-spend", () => ({
  assertAndReserveReplicateSpend: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/task-execution", () => ({
  WorkerOwnershipLostError: class WorkerOwnershipLostError extends Error {},
  getTaskForExecution: jest.fn().mockResolvedValue({
    executionToken: "execution-token",
    providerInvocations: {},
  }),
  updateTaskProviderInvocationFenced: jest.fn().mockResolvedValue(undefined),
}));

const execution = {
  taskId: "task-1",
  stage: "restoring" as const,
  executionToken: "execution-token",
  signal: new AbortController().signal,
};

function createdPrediction() {
  return { id: "prediction-1", status: "starting" };
}

function completedPrediction(output: unknown) {
  return { id: "prediction-1", status: "succeeded", output };
}

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(
    new Response(JSON.stringify(createdPrediction()), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  );
  global.fetch = fetchMock as typeof fetch;
  getMock.mockReset();
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("Replicate constants", () => {
  it("contains the fixed model versions", () => {
    expect(MODELS).toEqual({
      restoration:
        "tencentarc/gfpgan:21c4d9d8e427bab060aff58f43823260e33b3620de1f87e8418a1df9b05f7b55",
      restorationPremium:
        "microsoft/bringing-old-photos-back-to-life:c75db81db6cbd809d93cc3b7e7a088a351a3349c9fa02b6d393e35e0d51ba799",
      colorization:
        "piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695",
      animationFree:
        "bytedance/seedance-1-lite:cf47c0693227ff7221d3efea90e442335f4de350bc04080db7f59e7cd5b694d6",
      animationPaid:
        "bytedance/seedance-1-lite:cf47c0693227ff7221d3efea90e442335f4de350bc04080db7f59e7cd5b694d6",
      animationPremium:
        "bytedance/seedance-1-pro:edcd35c62d96dcd88a9f32a2d6e06f961ff4ef2d32b5b973f6a9d2b80382cb0e",
    });
  });

  it("keeps fixed animation parameters and tier resolutions", () => {
    expect(ANIMATION_PARAMS).toEqual({
      duration: 4,
      fps: 24,
      camera_fixed: true,
      prompt:
        "natural subtle smile, gentle blink, tiny head nod, preserve identity and facial details",
    });
    expect(ANIMATION_VARIANTS).toEqual({
      animationFree: { resolution: "480p" },
      animationPaid: { resolution: "720p" },
      animationPremium: { resolution: "1080p" },
    });
  });
});

describe("runModel inputs and outputs", () => {
  it("creates the fixed restoration version", async () => {
    getMock.mockResolvedValue(completedPrediction("https://output.test/restored.jpg"));

    await expect(
      runModel(
        "restoration",
        { img: "https://input.test/photo.jpg", version: "v1.4", scale: 1 },
        execution
      )
    ).resolves.toBe("https://output.test/restored.jpg");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.replicate.com/v1/predictions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          version: MODELS.restoration,
          input: {
            img: "https://input.test/photo.jpg",
            version: "v1.4",
            scale: 1,
          },
        }),
        signal: execution.signal,
      })
    );
  });

  it("normalizes animation input and gives fixed settings precedence", async () => {
    getMock.mockResolvedValue(completedPrediction("https://output.test/animation.mp4"));

    await runModel(
      "animationPaid",
      {
        input_image: "https://input.test/photo.jpg",
        duration: 99,
        resolution: "144p",
      },
      { ...execution, stage: "animating" }
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      version: MODELS.animationPaid,
      input: {
        image: "https://input.test/photo.jpg",
        duration: 4,
        fps: 24,
        resolution: "720p",
        camera_fixed: true,
        prompt: ANIMATION_PARAMS.prompt,
      },
    });
    expect(request.signal).toBe(execution.signal);
  });

  it.each([
    ["plain string", "https://output.test/result.jpg"],
    ["array", ["https://output.test/result.jpg", "https://other.test/result.jpg"]],
    ["output field", { output: "https://output.test/result.jpg" }],
    ["url field", { url: "https://output.test/result.jpg" }],
    ["FileOutput", { toString: (): string => "https://output.test/result.jpg" }],
  ])("parses %s output", async (_label, output) => {
    getMock.mockResolvedValue(completedPrediction(output));

    await expect(
      runModel("restoration", { img: "https://input.test/photo.jpg" }, execution)
    ).resolves.toBe("https://output.test/result.jpg");
  });

  it("throws on an unexpected output format", async () => {
    getMock.mockResolvedValue(completedPrediction(42));

    await expect(
      runModel("restoration", { img: "https://input.test/photo.jpg" }, execution)
    ).rejects.toThrow('Unexpected output format from model "restoration": 42');
  });
});
