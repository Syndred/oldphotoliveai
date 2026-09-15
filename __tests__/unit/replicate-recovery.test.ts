import type { Task, ProviderInvocation } from "@/types";

const mockGet = jest.fn();
const mockFetch = jest.fn();
const mockReserveSpend = jest.fn();
const mockGetTaskForExecution = jest.fn();
const mockUpdateInvocation = jest.fn();
const originalFetch = global.fetch;

jest.mock("replicate", () =>
  jest.fn().mockImplementation(() => ({
    predictions: { get: mockGet, cancel: jest.fn() },
  }))
);
jest.mock("@/lib/config", () => ({
  config: { replicate: { apiToken: "test-token" } },
}));
jest.mock("@/lib/replicate-spend", () => ({
  assertAndReserveReplicateSpend: (...args: unknown[]) => mockReserveSpend(...args),
}));
jest.mock("@/lib/task-execution", () => {
  class WorkerOwnershipLostError extends Error {
    constructor() {
      super("Worker execution ownership lost");
      this.name = "WorkerOwnershipLostError";
    }
  }
  return {
    WorkerOwnershipLostError,
    getTaskForExecution: (...args: unknown[]) => mockGetTaskForExecution(...args),
    updateTaskProviderInvocationFenced: (...args: unknown[]) =>
      mockUpdateInvocation(...args),
  };
});

import {
  ProviderCreationUnknownError,
  ReplicatePredictionCreateRejectedError,
  runModel,
} from "@/lib/replicate";
import { WorkerOwnershipLostError } from "@/lib/task-execution";

const TASK_ID = "task-1";
const STAGE = "restoring" as const;
const OLD_TOKEN = "old-token";
const NEW_TOKEN = "new-token";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: TASK_ID,
    userId: "user-1",
    status: "restoring",
    priority: "normal",
    workflow: "restore",
    originalImageKey: "tasks/task-1/original.jpg",
    restoredImageKey: null,
    colorizedImageKey: null,
    animationVideoKey: null,
    errorMessage: null,
    internalErrorMessage: null,
    failureStage: null,
    progress: 25,
    createdAt: "2026-09-15T00:00:00.000Z",
    completedAt: null,
    executionToken: OLD_TOKEN,
    providerInvocations: {},
    ...overrides,
  };
}

function prediction(overrides: Record<string, unknown> = {}) {
  return {
    id: "prediction-1",
    status: "succeeded",
    output: "https://output.test/restored.jpg",
    ...overrides,
  };
}

function predictionResponse(overrides: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify(prediction(overrides)), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

function context(executionToken = OLD_TOKEN) {
  return {
    taskId: TASK_ID,
    stage: STAGE,
    executionToken,
    signal: new AbortController().signal,
  };
}

describe("recoverable Replicate predictions", () => {
  let currentTask: Task;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as typeof fetch;
    mockFetch.mockResolvedValue(
      predictionResponse({ status: "starting", output: undefined })
    );
    currentTask = makeTask();
    mockReserveSpend.mockResolvedValue(undefined);
    mockGetTaskForExecution.mockImplementation(
      async (_taskId: string, executionToken: string) => {
        if (currentTask.executionToken !== executionToken) {
          throw new WorkerOwnershipLostError(TASK_ID);
        }
        return structuredClone(currentTask);
      }
    );
    mockUpdateInvocation.mockImplementation(
      async (
        _taskId: string,
        executionToken: string,
        stage: "restoring",
        invocation: ProviderInvocation
      ) => {
        if (currentTask.executionToken !== executionToken) {
          throw new WorkerOwnershipLostError(TASK_ID);
        }
        currentTask.providerInvocations = {
          ...currentTask.providerInvocations,
          [stage]: invocation,
        };
      }
    );
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("creates once, persists the prediction ID, then polls that prediction", async () => {
    mockGet.mockResolvedValue(prediction());

    await expect(
      runModel("restoration", { img: "https://input.test/photo.jpg" }, context())
    ).resolves.toBe("https://output.test/restored.jpg");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("prediction-1", {
      signal: expect.any(AbortSignal),
    });
    expect(mockUpdateInvocation.mock.calls.map((call) => call[3].status)).toEqual([
      "provider_creation_started",
      "active",
      "succeeded",
    ]);
    expect(mockUpdateInvocation.mock.calls[1][3]).toMatchObject({
      predictionId: "prediction-1",
    });
  });

  it("resumes an existing prediction ID without another provider create", async () => {
    currentTask = makeTask({
      executionToken: NEW_TOKEN,
      providerInvocations: {
        restoring: {
          status: "active",
          modelKey: "restoration",
          predictionId: "prediction-existing",
          updatedAt: "2026-09-15T00:00:01.000Z",
        },
      },
    });
    mockGet.mockResolvedValue(
      prediction({ id: "prediction-existing", status: "succeeded" })
    );

    await expect(
      runModel("restoration", { img: "unused-on-resume" }, context(NEW_TOKEN))
    ).resolves.toBe("https://output.test/restored.jpg");

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockReserveSpend).not.toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledWith("prediction-existing", {
      signal: expect.any(AbortSignal),
    });
  });

  it("resumes the saved prediction ID after the creator is interrupted", async () => {
    const oldController = new AbortController();
    const newController = new AbortController();
    mockFetch.mockResolvedValue(
      predictionResponse({
        id: "prediction-saved",
        status: "starting",
        output: undefined,
      })
    );
    mockGet.mockImplementation(
      async (_predictionId: string, options: { signal: AbortSignal }) => {
        if (options.signal === oldController.signal) {
          return new Promise((_resolve, reject) => {
            options.signal.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true }
            );
          });
        }
        return prediction({ id: "prediction-saved", status: "succeeded" });
      }
    );

    const oldRun = runModel(
      "restoration",
      { img: "https://input.test/photo.jpg" },
      { ...context(OLD_TOKEN), signal: oldController.signal }
    );
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(currentTask.providerInvocations?.restoring).toMatchObject({
      status: "active",
      predictionId: "prediction-saved",
    });

    currentTask.executionToken = NEW_TOKEN;
    oldController.abort();
    await expect(oldRun).rejects.toMatchObject({ name: "WorkerOwnershipLostError" });

    await expect(
      runModel(
        "restoration",
        { img: "unused-on-resume" },
        { ...context(NEW_TOKEN), signal: newController.signal }
      )
    ).resolves.toBe("https://output.test/restored.jpg");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenLastCalledWith("prediction-saved", {
      signal: newController.signal,
    });
  });

  it("does not create twice when an old create response arrives after recovery", async () => {
    let resolveOldCreate!: (value: Response) => void;
    mockFetch.mockImplementation(
      () => new Promise((resolve) => { resolveOldCreate = resolve; })
    );

    const oldRun = runModel(
      "restoration",
      { img: "https://input.test/photo.jpg" },
      context(OLD_TOKEN)
    );
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    currentTask.executionToken = NEW_TOKEN;
    const recoveredRun = runModel(
      "restoration",
      { img: "https://input.test/photo.jpg" },
      context(NEW_TOKEN)
    );
    await expect(recoveredRun).rejects.toBeInstanceOf(ProviderCreationUnknownError);

    resolveOldCreate(
      predictionResponse({ status: "starting", output: undefined })
    );
    await expect(oldRun).rejects.toMatchObject({ name: "WorkerOwnershipLostError" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(currentTask.executionToken).toBe(NEW_TOKEN);
    expect(currentTask.providerInvocations?.restoring?.status).toBe("creation_unknown");
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("marks an unknown create result and never automatically resubmits it", async () => {
    mockFetch.mockRejectedValue(new Error("socket closed after request write"));

    await expect(
      runModel("restoration", { img: "https://input.test/photo.jpg" }, context())
    ).rejects.toBeInstanceOf(ProviderCreationUnknownError);
    expect(currentTask.providerInvocations?.restoring?.status).toBe("creation_unknown");

    await expect(
      runModel("restoration", { img: "https://input.test/photo.jpg" }, context())
    ).rejects.toBeInstanceOf(ProviderCreationUnknownError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockReserveSpend).toHaveBeenCalledTimes(1);
  });

  it("submits a create POST only once when the response is lost", async () => {
    mockFetch.mockRejectedValue(new Error("connection reset after upload"));

    await expect(
      runModel("restoration", { img: "https://input.test/photo.jpg" }, context())
    ).rejects.toBeInstanceOf(ProviderCreationUnknownError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps a definitive HTTP rejection retryable and classified", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "invalid version" }), {
        status: 422,
        statusText: "Unprocessable Entity",
      })
    );

    await expect(
      runModel("restoration", { img: "https://input.test/photo.jpg" }, context())
    ).rejects.toBeInstanceOf(ReplicatePredictionCreateRejectedError);

    expect(currentTask.providerInvocations?.restoring?.status).toBe("failed");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not enter the ambiguous-create state when spend reservation fails", async () => {
    mockReserveSpend.mockRejectedValue(new Error("REPLICATE_SPEND_LIMIT:50/50"));

    await expect(
      runModel("restoration", { img: "https://input.test/photo.jpg" }, context())
    ).rejects.toThrow("REPLICATE_SPEND_LIMIT");

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockUpdateInvocation).not.toHaveBeenCalled();
  });

  it("surfaces a definitive rejection even if its safe marker write fails", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "invalid version" }), {
        status: 422,
        statusText: "Unprocessable Entity",
      })
    );
    mockUpdateInvocation.mockImplementationOnce(
      async (
        _taskId: string,
        _executionToken: string,
        stage: "restoring",
        invocation: ProviderInvocation
      ) => {
        currentTask.providerInvocations = {
          ...currentTask.providerInvocations,
          [stage]: invocation,
        };
      }
    );
    mockUpdateInvocation.mockRejectedValueOnce(new Error("Redis unavailable"));

    await expect(
      runModel("restoration", { img: "https://input.test/photo.jpg" }, context())
    ).rejects.toBeInstanceOf(ReplicatePredictionCreateRejectedError);
    expect(currentTask.providerInvocations?.restoring?.status).toBe(
      "provider_creation_started"
    );
  });

  it("stays manual-review safe if persisting the prediction ID fails", async () => {
    mockUpdateInvocation.mockImplementationOnce(
      async (
        _taskId: string,
        _executionToken: string,
        stage: "restoring",
        invocation: ProviderInvocation
      ) => {
        currentTask.providerInvocations = {
          ...currentTask.providerInvocations,
          [stage]: invocation,
        };
      }
    );
    mockUpdateInvocation.mockRejectedValueOnce(new Error("Redis unavailable"));
    mockUpdateInvocation.mockRejectedValueOnce(new Error("Redis still unavailable"));
    mockUpdateInvocation.mockRejectedValueOnce(new Error("Redis remains unavailable"));

    await expect(
      runModel("restoration", { img: "https://input.test/photo.jpg" }, context())
    ).rejects.toBeInstanceOf(ProviderCreationUnknownError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(currentTask.providerInvocations?.restoring?.status).toBe(
      "provider_creation_started"
    );
  });

  it("continues polling when a known ID is durable after active-write retries", async () => {
    mockGet.mockResolvedValue(prediction());
    mockUpdateInvocation.mockImplementationOnce(
      async (
        _taskId: string,
        _executionToken: string,
        stage: "restoring",
        invocation: ProviderInvocation
      ) => {
        currentTask.providerInvocations = {
          ...currentTask.providerInvocations,
          [stage]: invocation,
        };
      }
    );
    mockUpdateInvocation.mockRejectedValueOnce(new Error("Redis unavailable"));
    mockUpdateInvocation.mockRejectedValueOnce(new Error("Redis still unavailable"));

    await expect(
      runModel("restoration", { img: "https://input.test/photo.jpg" }, context())
    ).resolves.toBe("https://output.test/restored.jpg");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("prediction-1", {
      signal: expect.any(AbortSignal),
    });
    expect(currentTask.providerInvocations?.restoring).toMatchObject({
      status: "succeeded",
      predictionId: "prediction-1",
    });
  });

  it("stays manual-review safe if persisting creation_unknown also fails", async () => {
    mockFetch.mockRejectedValue(new Error("response lost"));
    mockUpdateInvocation.mockImplementationOnce(
      async (
        _taskId: string,
        _executionToken: string,
        stage: "restoring",
        invocation: ProviderInvocation
      ) => {
        currentTask.providerInvocations = {
          ...currentTask.providerInvocations,
          [stage]: invocation,
        };
      }
    );
    mockUpdateInvocation.mockRejectedValueOnce(new Error("Redis unavailable"));

    await expect(
      runModel("restoration", { img: "https://input.test/photo.jpg" }, context())
    ).rejects.toBeInstanceOf(ProviderCreationUnknownError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(currentTask.providerInvocations?.restoring?.status).toBe(
      "provider_creation_started"
    );
  });
});
