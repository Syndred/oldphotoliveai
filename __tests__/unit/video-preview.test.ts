import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { createVideoPreview } from "@/lib/video-preview";
const run = promisify(execFile);

it("burns a visible badge into real four-second 480p MP4 bytes and preserves the clean source", async () => {
  if (!ffmpegPath) throw Error("ffmpeg missing");
  const directory = await mkdtemp(path.join(tmpdir(), "oldphoto-video-test-"));
  try {
    const sourcePath = path.join(directory, "source.mp4");
    await run(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=gray:s=640x480:r=24:d=4", "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p", sourcePath]);
    const source = await readFile(sourcePath);
    const sourceCopy = Buffer.from(source);
    const preview = await createVideoPreview(source);
    expect(source.equals(sourceCopy)).toBe(true);
    expect(preview.equals(source)).toBe(false);
    const previewPath = path.join(directory, "preview.mp4");
    await writeFile(previewPath, preview);
    const { stdout } = await run(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-ss", "1", "-i", previewPath, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "pipe:1"], { encoding: "buffer", maxBuffer: 2 * 1024 * 1024 });
    const image = sharp(stdout);
    expect(await image.metadata()).toMatchObject({ width: 640, height: 480 });
    const corner = await sharp(await image.clone().extract({ left: 80, top: 340, width: 480, height: 40 }).toBuffer()).stats();
    const center = await sharp(await image.clone().extract({ left: 200, top: 150, width: 80, height: 80 }).toBuffer()).stats();
    expect(corner.channels[0].stdev).toBeGreaterThan(10);
    expect(center.channels[0].stdev).toBeLessThan(1);
    const { stderr } = await run(ffmpegPath, ["-hide_banner", "-i", previewPath, "-f", "null", "-"]);
    expect(stderr).toContain("Duration: 00:00:04.00");
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 20_000);

it("fails closed on invalid media and removes temporary encoder files", async () => {
  const before = (await readdir(tmpdir())).filter(name => name.startsWith("oldphoto-preview-"));
  await expect(createVideoPreview(Buffer.from("not an mp4"))).rejects.toThrow("VIDEO_PREVIEW_ENCODING_FAILED");
  const after = (await readdir(tmpdir())).filter(name => name.startsWith("oldphoto-preview-"));
  expect(after.sort()).toEqual(before.sort());
});
it("does not start an encode after execution ownership was aborted", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(createVideoPreview(Buffer.from("media"), controller.signal)).rejects.toThrow();
});
