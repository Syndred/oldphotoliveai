import { executePipeline } from "@/lib/pipeline";
import { getTask, updateTaskStatus, getUser } from "@/lib/redis";
import { runModel } from "@/lib/replicate";
import { uploadToR2, getR2CdnUrl } from "@/lib/r2";
import { applyImageWatermark, resizeImage } from "@/lib/watermark";
import type { Task, User } from "@/types";

const mockUuidV4 = jest.fn();

// ── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("@/lib/redis");
jest.mock("@/lib/replicate");
jest.mock("@/lib/r2");
jest.mock("@/lib/watermark");
jest.mock("uuid", () => ({
  v4: () => mockUuidV4(),
}));

const mockGetTask = getTask as jest.MockedFunction<typeof getTask>;
const mockUpdateTaskStatus = updateTaskStatus as jest.MockedFunction<typeof updateTaskStatus>;
const mockGetUser = getUser as jest.MockedFunction<typeof getUser>;
const mockRunModel = runModel as jest.MockedFunction<typeof runModel>;
const mockUploadToR2 = uploadToR2 as jest.MockedFunction<typeof uploadToR2>;
const mockGetR2CdnUrl = getR2CdnUrl as jest.MockedFunction<typeof getR2CdnUrl>;
const mockApplyImageWatermark = applyImageWatermark as jest.MockedFunction<typeof applyImageWatermark>;
const mockResizeImage = resizeImage as jest.MockedFunction<typeof resizeImage>;

// ── Mock fetch globally ─────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ── Helpers ─────────────────────────────────────────────────────────────────

const TASK_ID = "task-123";
const USER_ID = "user-456";
const ASSET_UUID = "asset-uuid";
const RESTORED_KEY = `tasks/${TASK_ID}/restored-${ASSET_UUID}.jpg`;
const COLORIZED_KEY = `tasks/${TASK_ID}/colorized-${ASSET_UUID}.jpg`;
const ANIMATION_KEY = `tasks/${TASK_ID}/animation-${ASSET_UUID}.mp4`;

function makeTask(overrides?: Partial<Task>): Task {
  return {
    id: TASK_ID,
    userId: USER_ID,
    status: "queued",
    priority: "normal",
    originalImageKey: "tasks/task-123/original.jpg",
    restoredImageKey: null,
    colorizedImageKey: null,
    animationVideoKey: null,
    errorMessage: null,
    internalErrorMessage: null,
    failureStage: null,
    progress: 5,
    createdAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  };
}

function makeUser(overrides?: Partial<User>): User {
  return {
    id: USER_ID,
    googleId: "google-789",
    email: "test@example.com",
    name: "Test User",
    avatarUrl: null,
    tier: "free",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const fakeImageBuffer = Buffer.from("fake-image-data");
const fakeVideoBuffer = Buffer.from("fake-video-data");

function mockSourceImageAccessible() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    statusText: "OK",
  });
}

function setupSuccessfulPipeline() {
  mockGetTask.mockResolvedValue(makeTask());
  mockGetUser.mockResolvedValue(makeUser());
  mockGetR2CdnUrl.mockImplementation((key: string) => `https://cdn.test.com/${key}`);
  mockUploadToR2.mockResolvedValue("key");
  mockResizeImage.mockResolvedValue(fakeImageBuffer);
  mockApplyImageWatermark.mockResolvedValue(fakeImageBuffer);

  // Replicate returns URLs for each step
  mockRunModel
    .mockResolvedValueOnce("https://replicate.com/restored.jpg")
    .mockResolvedValueOnce("https://replicate.com/colorized.jpg")
    .mockResolvedValueOnce("https://replicate.com/animation.mp4");

  mockSourceImageAccessible();

  // fetch downloads the output from Replicate
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeImageBuffer.buffer.slice(0)),
    })
    .mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeImageBuffer.buffer.slice(0)),
    })
    .mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeVideoBuffer.buffer.slice(0)),
    });
}

// ── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUuidV4.mockReset().mockReturnValue(ASSET_UUID);
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("executePipeline", () => {
  describe("successful pipeline execution", () => {
    it("completes all 3 steps and marks task as completed", async () => {
      setupSuccessfulPipeline();

      await executePipeline(TASK_ID);

      // Verify all 3 models were called in order
      expect(mockRunModel).toHaveBeenCalledTimes(3);
      expect(mockRunModel.mock.calls[0][0]).toBe("restoration");
      expect(mockRunModel.mock.calls[1][0]).toBe("colorization");
      expect(mockRunModel.mock.calls[2][0]).toBe("animationFree");

      // Verify final status is completed with animationVideoKey
      expect(mockUpdateTaskStatus).toHaveBeenLastCalledWith(
        TASK_ID,
        "completed",
        {
          animationVideoKey: ANIMATION_KEY,
          errorMessage: null,
          internalErrorMessage: null,
          failureStage: null,
        }
      );
    });

    it("updates status in correct order: restoring → colorizing → animating → completed", async () => {
      setupSuccessfulPipeline();

      await executePipeline(TASK_ID);

      const statusCalls = mockUpdateTaskStatus.mock.calls.map((c) => c[1]);
      expect(statusCalls).toEqual(["restoring", "colorizing", "animating", "completed"]);
    });

    it("stores intermediate results with correct R2 keys", async () => {
      setupSuccessfulPipeline();

      await executePipeline(TASK_ID);

      // Restored image uploaded
      expect(mockUploadToR2).toHaveBeenCalledWith(
        expect.any(Buffer),
        RESTORED_KEY,
        "image/jpeg"
      );
      // Colorized image uploaded
      expect(mockUploadToR2).toHaveBeenCalledWith(
        expect.any(Buffer),
        COLORIZED_KEY,
        "image/jpeg"
      );
      // Animation video uploaded
      expect(mockUploadToR2).toHaveBeenCalledWith(
        expect.any(Buffer),
        ANIMATION_KEY,
        "video/mp4"
      );
    });

    it("passes restoredImageKey when updating to colorizing", async () => {
      setupSuccessfulPipeline();

      await executePipeline(TASK_ID);

      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(
        TASK_ID,
        "colorizing",
        { restoredImageKey: RESTORED_KEY }
      );
    });

    it("passes colorizedImageKey when updating to animating", async () => {
      setupSuccessfulPipeline();

      await executePipeline(TASK_ID);

      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(
        TASK_ID,
        "animating",
        { colorizedImageKey: COLORIZED_KEY }
      );
    });

    it("uses restored CDN URL as input for colorization model", async () => {
      setupSuccessfulPipeline();

      await executePipeline(TASK_ID);

      expect(mockRunModel.mock.calls[1][1]).toEqual({
        image: `https://cdn.test.com/${RESTORED_KEY}`,
        model_size: "large",
      });
    });

    it("uses colorized CDN URL as input for animation model", async () => {
      setupSuccessfulPipeline();

      await executePipeline(TASK_ID);

      expect(mockRunModel.mock.calls[2][1]).toEqual({
        input_image: `https://cdn.test.com/${COLORIZED_KEY}`,
      });
    });
  });

  describe("tier settings", () => {
    it("uses the lightweight restoration model for free users", async () => {
      setupSuccessfulPipeline();
      mockGetUser.mockResolvedValue(makeUser({ tier: "free" }));

      await executePipeline(TASK_ID);

      expect(mockRunModel.mock.calls[0]).toEqual([
        "restoration",
        {
          img: "https://cdn.test.com/tasks/task-123/original.jpg",
          version: "v1.4",
          scale: 1,
        },
      ]);
    });

    it("uses the premium scratch-repair restoration model for pay_as_you_go users", async () => {
      setupSuccessfulPipeline();
      mockGetUser.mockResolvedValue(makeUser({ tier: "pay_as_you_go" }));

      await executePipeline(TASK_ID);

      expect(mockRunModel.mock.calls[0]).toEqual([
        "restorationPremium",
        {
          image: "https://cdn.test.com/tasks/task-123/original.jpg",
          with_scratch: true,
          HR: true,
        },
      ]);
      expect(mockRunModel.mock.calls[2][0]).toBe("animationPaid");
    });

    it("uses the premium scratch-repair restoration model for professional users", async () => {
      setupSuccessfulPipeline();
      mockGetUser.mockResolvedValue(makeUser({ tier: "professional" }));

      await executePipeline(TASK_ID);

      expect(mockRunModel.mock.calls[0]).toEqual([
        "restorationPremium",
        {
          image: "https://cdn.test.com/tasks/task-123/original.jpg",
          with_scratch: true,
          HR: true,
        },
      ]);
      expect(mockRunModel.mock.calls[2][0]).toBe("animationPremium");
    });

    it("applies watermark and resize for free users", async () => {
      setupSuccessfulPipeline();
      mockGetUser.mockResolvedValue(makeUser({ tier: "free" }));

      await executePipeline(TASK_ID);

      // resizeImage called for restored and colorized images (2 image steps)
      expect(mockResizeImage).toHaveBeenCalledTimes(2);
      expect(mockResizeImage).toHaveBeenCalledWith(expect.any(Buffer), "free");

      // watermark applied for free tier (2 image steps)
      expect(mockApplyImageWatermark).toHaveBeenCalledTimes(2);
    });

    it("resizes but does NOT watermark for pay_as_you_go users", async () => {
      setupSuccessfulPipeline();
      mockGetUser.mockResolvedValue(makeUser({ tier: "pay_as_you_go" }));

      await executePipeline(TASK_ID);

      expect(mockResizeImage).toHaveBeenCalledTimes(2);
      expect(mockResizeImage).toHaveBeenCalledWith(expect.any(Buffer), "pay_as_you_go");
      expect(mockApplyImageWatermark).not.toHaveBeenCalled();
    });

    it("resizes but does NOT watermark for professional users", async () => {
      setupSuccessfulPipeline();
      mockGetUser.mockResolvedValue(makeUser({ tier: "professional" }));

      await executePipeline(TASK_ID);

      expect(mockResizeImage).toHaveBeenCalledTimes(2);
      expect(mockResizeImage).toHaveBeenCalledWith(expect.any(Buffer), "professional");
      expect(mockApplyImageWatermark).not.toHaveBeenCalled();
    });
  });

  describe("failure at restoration step", () => {
    it("marks task as failed and does not execute colorization or animation", async () => {
      mockGetTask.mockResolvedValue(makeTask());
      mockGetUser.mockResolvedValue(makeUser());
      mockGetR2CdnUrl.mockReturnValue("https://cdn.test.com/original.jpg");
      mockRunModel.mockRejectedValueOnce(new Error("GFPGAN model failed"));
      mockSourceImageAccessible();

      await executePipeline(TASK_ID);

      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(TASK_ID, "restoring");
      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(TASK_ID, "failed", {
        errorMessage: "Processing failed. Please try again.",
        internalErrorMessage: "GFPGAN model failed",
        failureStage: "restoring",
      });
      // Only restoration model was called
      expect(mockRunModel).toHaveBeenCalledTimes(1);
      // No uploads happened
      expect(mockUploadToR2).not.toHaveBeenCalled();
    });

    it("surfaces model configuration errors for Replicate authentication failures", async () => {
      mockGetTask.mockResolvedValue(makeTask());
      mockGetUser.mockResolvedValue(makeUser());
      mockGetR2CdnUrl.mockReturnValue("https://cdn.test.com/original.jpg");
      mockRunModel.mockRejectedValueOnce(
        new Error("Request failed with status 401 Unauthorized: Unauthenticated")
      );
      mockSourceImageAccessible();

      await executePipeline(TASK_ID);

      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(TASK_ID, "failed", {
        errorMessage: "AI model configuration error. Please contact support.",
        internalErrorMessage:
          "Request failed with status 401 Unauthorized: Unauthenticated",
        failureStage: "restoring",
      });
    });
  });

  describe("failure at colorization step", () => {
    it("marks task as failed after restoration succeeds", async () => {
      mockGetTask.mockResolvedValue(makeTask());
      mockGetUser.mockResolvedValue(makeUser());
      mockGetR2CdnUrl.mockImplementation((key: string) => `https://cdn.test.com/${key}`);
      mockResizeImage.mockResolvedValue(fakeImageBuffer);
      mockApplyImageWatermark.mockResolvedValue(fakeImageBuffer);
      mockUploadToR2.mockResolvedValue("key");

      mockRunModel
        .mockResolvedValueOnce("https://replicate.com/restored.jpg")
        .mockRejectedValueOnce(new Error("DDColor model failed"));

      mockSourceImageAccessible();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(fakeImageBuffer.buffer.slice(0)),
        });

      await executePipeline(TASK_ID);

      // Restoration succeeded, colorization failed
      expect(mockRunModel).toHaveBeenCalledTimes(2);
      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(TASK_ID, "failed", {
        errorMessage: "Processing failed. Please try again.",
        internalErrorMessage: "DDColor model failed",
        failureStage: "colorizing",
      });
      // Only restored image was uploaded (1 upload)
      expect(mockUploadToR2).toHaveBeenCalledTimes(1);
    });
  });

  describe("failure at animation step", () => {
    it("marks task as failed after restoration and colorization succeed", async () => {
      mockGetTask.mockResolvedValue(makeTask());
      mockGetUser.mockResolvedValue(makeUser());
      mockGetR2CdnUrl.mockImplementation((key: string) => `https://cdn.test.com/${key}`);
      mockResizeImage.mockResolvedValue(fakeImageBuffer);
      mockApplyImageWatermark.mockResolvedValue(fakeImageBuffer);
      mockUploadToR2.mockResolvedValue("key");

      mockRunModel
        .mockResolvedValueOnce("https://replicate.com/restored.jpg")
        .mockResolvedValueOnce("https://replicate.com/colorized.jpg")
        .mockRejectedValueOnce(new Error("Animation model failed"));

      mockSourceImageAccessible();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(fakeImageBuffer.buffer.slice(0)),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(fakeImageBuffer.buffer.slice(0)),
        });

      await executePipeline(TASK_ID);

      expect(mockRunModel).toHaveBeenCalledTimes(3);
      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(TASK_ID, "failed", {
        errorMessage: "Processing failed. Please try again.",
        internalErrorMessage: "Animation model failed",
        failureStage: "animating",
      });
      // Restored + colorized uploaded, but not animation
      expect(mockUploadToR2).toHaveBeenCalledTimes(2);
    });
  });

  describe("retry resume behavior", () => {
    it("retries from animation when a colorized image already exists", async () => {
      mockGetTask.mockResolvedValue(
        makeTask({
          status: "failed",
          restoredImageKey: RESTORED_KEY,
          colorizedImageKey: COLORIZED_KEY,
        })
      );
      mockGetUser.mockResolvedValue(makeUser({ tier: "professional" }));
      mockGetR2CdnUrl.mockImplementation((key: string) => `https://cdn.test.com/${key}`);
      mockUploadToR2.mockResolvedValue("key");

      mockRunModel.mockResolvedValueOnce("https://replicate.com/animation.mp4");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeVideoBuffer.buffer.slice(0)),
      });

      await executePipeline(TASK_ID);

      expect(mockRunModel).toHaveBeenCalledTimes(1);
      expect(mockRunModel).toHaveBeenCalledWith("animationPremium", {
        input_image: `https://cdn.test.com/${COLORIZED_KEY}`,
      });
      expect(mockResizeImage).not.toHaveBeenCalled();
      expect(mockApplyImageWatermark).not.toHaveBeenCalled();
      expect(mockUpdateTaskStatus.mock.calls.map((call) => call[1])).toEqual([
        "animating",
        "completed",
      ]);
      expect(mockUploadToR2).toHaveBeenCalledTimes(1);
      expect(mockUploadToR2).toHaveBeenCalledWith(
        expect.any(Buffer),
        ANIMATION_KEY,
        "video/mp4"
      );
    });

    it("retries from colorization when only the restored image already exists", async () => {
      mockGetTask.mockResolvedValue(
        makeTask({
          status: "failed",
          restoredImageKey: RESTORED_KEY,
        })
      );
      mockGetUser.mockResolvedValue(makeUser({ tier: "pay_as_you_go" }));
      mockGetR2CdnUrl.mockImplementation((key: string) => `https://cdn.test.com/${key}`);
      mockUploadToR2.mockResolvedValue("key");
      mockResizeImage.mockResolvedValue(fakeImageBuffer);
      mockApplyImageWatermark.mockResolvedValue(fakeImageBuffer);

      mockRunModel
        .mockResolvedValueOnce("https://replicate.com/colorized.jpg")
        .mockResolvedValueOnce("https://replicate.com/animation.mp4");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(fakeImageBuffer.buffer.slice(0)),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(fakeVideoBuffer.buffer.slice(0)),
        });

      await executePipeline(TASK_ID);

      expect(mockRunModel).toHaveBeenCalledTimes(2);
      expect(mockRunModel.mock.calls[0]).toEqual([
        "colorization",
        {
          image: `https://cdn.test.com/${RESTORED_KEY}`,
          model_size: "large",
        },
      ]);
      expect(mockRunModel.mock.calls[1]).toEqual([
        "animationPaid",
        {
          input_image: `https://cdn.test.com/${COLORIZED_KEY}`,
        },
      ]);
      expect(mockUpdateTaskStatus.mock.calls.map((call) => call[1])).toEqual([
        "colorizing",
        "animating",
        "completed",
      ]);
      expect(mockResizeImage).toHaveBeenCalledTimes(1);
      expect(mockApplyImageWatermark).not.toHaveBeenCalled();
      expect(mockUploadToR2).toHaveBeenCalledTimes(2);
      expect(mockUploadToR2).toHaveBeenNthCalledWith(
        1,
        expect.any(Buffer),
        COLORIZED_KEY,
        "image/jpeg"
      );
      expect(mockUploadToR2).toHaveBeenNthCalledWith(
        2,
        expect.any(Buffer),
        ANIMATION_KEY,
        "video/mp4"
      );
    });
  });

  describe("edge cases", () => {
    it("throws when task is not found", async () => {
      mockGetTask.mockResolvedValue(null);

      await expect(executePipeline(TASK_ID)).rejects.toThrow(`Task not found: ${TASK_ID}`);
    });

    it("marks task as failed when user is not found", async () => {
      mockGetTask.mockResolvedValue(makeTask());
      mockGetUser.mockResolvedValue(null);

      await executePipeline(TASK_ID);

      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(TASK_ID, "failed", {
        errorMessage: `User not found: ${USER_ID}`,
      });
      expect(mockRunModel).not.toHaveBeenCalled();
    });

    it("handles fetch download failure gracefully", async () => {
      mockGetTask.mockResolvedValue(makeTask());
      mockGetUser.mockResolvedValue(makeUser());
      mockGetR2CdnUrl.mockReturnValue("https://cdn.test.com/original.jpg");
      mockRunModel.mockResolvedValueOnce("https://replicate.com/restored.jpg");

      mockSourceImageAccessible();
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        });

      await executePipeline(TASK_ID);

      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(TASK_ID, "failed", {
        errorMessage: "Failed to download intermediate result. Please try again.",
        internalErrorMessage:
          "Failed to download from https://replicate.com/restored.jpg: invalid response",
        failureStage: "restoring",
      });
    });

    it("handles non-Error thrown objects", async () => {
      mockGetTask.mockResolvedValue(makeTask());
      mockGetUser.mockResolvedValue(makeUser());
      mockGetR2CdnUrl.mockReturnValue("https://cdn.test.com/original.jpg");
      mockRunModel.mockRejectedValueOnce("string error");
      mockSourceImageAccessible();

      await executePipeline(TASK_ID);

      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(TASK_ID, "failed", {
        errorMessage: "Processing failed. Please try again.",
        internalErrorMessage: "string error",
        failureStage: "restoring",
      });
    });

    it("marks task as failed with actionable message when source image URL is unreachable", async () => {
      mockGetTask.mockResolvedValue(makeTask());
      mockGetUser.mockResolvedValue(makeUser());
      mockGetR2CdnUrl.mockReturnValue("https://cdn.test.com/original.jpg");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await executePipeline(TASK_ID);

      expect(mockRunModel).not.toHaveBeenCalled();
      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(TASK_ID, "failed", {
        errorMessage:
          "Source image URL is unreachable (404 Not Found). Please re-upload or check R2 bucket/domain configuration.",
        internalErrorMessage: "SOURCE_IMAGE_UNREACHABLE:404 Not Found",
        failureStage: "restoring",
      });
    });
  });
});
