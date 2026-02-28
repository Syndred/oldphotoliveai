import { resolveTaskErrorMessage } from "@/lib/task-error";

const enErrors: Record<string, string> = {
  processingFailedGeneric: "Processing failed. Please try again.",
  sourceImageUnreachable: "Source image is unavailable.",
  modelConfigError: "AI model configuration error.",
  intermediateDownloadFailed: "Failed to download intermediate result.",
  serviceBusy: "Service is temporarily busy.",
  taskNotFound: "Task not found.",
};

function tErrors(key: string): string {
  return enErrors[key] ?? key;
}

describe("resolveTaskErrorMessage", () => {
  it("falls back to generic processing error when message is empty", () => {
    expect(resolveTaskErrorMessage("", tErrors)).toBe(
      "Processing failed. Please try again."
    );
  });

  it("maps source image unreachable code", () => {
    expect(
      resolveTaskErrorMessage("SOURCE_IMAGE_UNREACHABLE:404 Not Found", tErrors)
    ).toBe("Source image is unavailable.");
  });

  it("maps source image unreachable legacy message", () => {
    expect(
      resolveTaskErrorMessage(
        "Source image URL is unreachable (403 Forbidden). Please re-upload.",
        tErrors
      )
    ).toBe("Source image is unavailable.");
  });

  it("maps busy and throttled errors", () => {
    expect(
      resolveTaskErrorMessage("Service is temporarily busy. Please try again.", tErrors)
    ).toBe("Service is temporarily busy.");
    expect(resolveTaskErrorMessage("429 too many requests", tErrors)).toBe(
      "Service is temporarily busy."
    );
  });

  it("maps model config errors", () => {
    expect(
      resolveTaskErrorMessage("AI model configuration error.", tErrors)
    ).toBe("AI model configuration error.");
  });

  it("maps intermediate download failures", () => {
    expect(
      resolveTaskErrorMessage(
        "Failed to download intermediate result. Please try again.",
        tErrors
      )
    ).toBe("Failed to download intermediate result.");
  });

  it("maps task and user not found errors", () => {
    expect(resolveTaskErrorMessage("Task not found: abc", tErrors)).toBe(
      "Task not found."
    );
    expect(resolveTaskErrorMessage("User not found: user-1", tErrors)).toBe(
      "Task not found."
    );
  });

  it("preserves unknown messages", () => {
    expect(resolveTaskErrorMessage("Model timeout", tErrors)).toBe("Model timeout");
  });
});
