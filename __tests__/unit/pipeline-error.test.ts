import { classifyPipelineFailure } from "@/lib/pipeline-error";

describe("classifyPipelineFailure", () => {
  it("returns a bounded source error without upstream details", () => {
    const result = classifyPipelineFailure(
      "SOURCE_IMAGE_UNREACHABLE:404 private-bucket.example/photo.jpg"
    );
    expect(result).toMatchObject({ failureCode: "source_unreachable", violation: false });
    expect(result.errorMessage).toContain("re-upload");
    expect(result.errorMessage).not.toContain("private-bucket");
  });

  it("keeps an inaccessible source classified as source failure even for HTTP 401", () => {
    expect(
      classifyPipelineFailure(
        "SOURCE_IMAGE_UNREACHABLE:401 private-bucket.example/photo.jpg"
      ).failureCode
    ).toBe("source_unreachable");
  });

  it.each([
    ["429 throttled", "service_busy"],
    ["401 Unauthenticated", "provider_auth"],
    ["Invalid version", "provider_config"],
    ["Download timeout after 30000ms", "download_failed"],
    ["unexpected vendor secret", "processing_failed"],
  ])("classifies %s as %s", (message, failureCode) => {
    expect(classifyPipelineFailure(message).failureCode).toBe(failureCode);
  });

  it("marks content policy failures as non-retryable violations", () => {
    expect(classifyPipelineFailure("private reason", { isViolation: true })).toEqual({
      errorMessage:
        "Your request could not be processed because it violates our content policy. Credits used for rejected or removed content are non-refundable.",
      failureCode: "content_rejected",
      violation: true,
    });
  });
});
