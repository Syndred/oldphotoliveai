import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { createPreviewWatermarkPng } from "@/lib/watermark";

const MAX_VIDEO_BYTES = 120 * 1024 * 1024;
const ENCODING_TIMEOUT_MS = 45_000;

/** Burn the existing brand badge into the video bytes; CSS is not access control. */
export async function createVideoPreview(input: Buffer, signal?: AbortSignal): Promise<Buffer> {
  signal?.throwIfAborted();
  if (!ffmpegPath) throw new Error("VIDEO_PREVIEW_ENCODER_UNAVAILABLE");
  const executable = ffmpegPath;
  if (!input.length || input.length > MAX_VIDEO_BYTES) throw new Error("VIDEO_PREVIEW_INPUT_INVALID");
  const directory = await mkdtemp(path.join(tmpdir(), "oldphoto-preview-"));
  try {
    const inputPath = path.join(directory, "input.mp4");
    const badgePath = path.join(directory, "watermark.png");
    const outputPath = path.join(directory, "preview.mp4");
    const badge = await createPreviewWatermarkPng();
    await Promise.all([writeFile(inputPath, input), writeFile(badgePath, badge)]);
    signal?.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      const child = spawn(executable, [
        "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
        "-i", inputPath, "-i", badgePath,
        "-filter_complex_threads", "1",
        "-filter_complex", "[1:v:0][0:v:0]scale2ref=w=iw*0.82:h=ow/9.375[mark][base];[base][mark]overlay=(main_w-overlay_w)/2:main_h*0.75-overlay_h/2:format=auto,format=yuv420p[v]",
        "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
        "-threads", "1", "-c:a", "copy", "-movflags", "+faststart", outputPath,
      ], { stdio: "ignore" });
      let failure: Error | undefined;
      const abort = () => { failure = new Error("VIDEO_PREVIEW_ABORTED"); child.kill("SIGKILL"); };
      const timeout = setTimeout(() => { failure = new Error("VIDEO_PREVIEW_TIMEOUT"); child.kill("SIGKILL"); }, ENCODING_TIMEOUT_MS);
      const cleanup = () => { clearTimeout(timeout); signal?.removeEventListener("abort", abort); };
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
      child.once("error", () => { cleanup(); reject(new Error("VIDEO_PREVIEW_ENCODER_UNAVAILABLE")); });
      child.once("close", code => {
        cleanup();
        if (failure) reject(failure);
        else if (code !== 0) reject(new Error("VIDEO_PREVIEW_ENCODING_FAILED"));
        else resolve();
      });
    });
    signal?.throwIfAborted();
    const output = await readFile(outputPath);
    if (!output.length || output.length > MAX_VIDEO_BYTES) throw new Error("VIDEO_PREVIEW_OUTPUT_INVALID");
    return output;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
