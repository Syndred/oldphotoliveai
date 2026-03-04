const COMPRESSIBLE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const DEFAULT_MAX_DIMENSION = 2000;
const DEFAULT_TARGET_BYTES = 2 * 1024 * 1024;
const DEFAULT_INITIAL_QUALITY = 0.86;
const DEFAULT_MIN_QUALITY = 0.6;
const DEFAULT_QUALITY_STEP = 0.08;
const MIN_BYTES_TO_COMPRESS = 900 * 1024;

interface CompressOptions {
  maxDimension?: number;
  targetBytes?: number;
  initialQuality?: number;
  minQuality?: number;
  qualityStep?: number;
}

function getOutputType(inputType: string): string {
  if (inputType === "image/png") return "image/webp";
  if (inputType === "image/jpeg") return "image/jpeg";
  if (inputType === "image/webp") return "image/webp";
  return inputType;
}

function buildOutputName(inputName: string, outputType: string): string {
  const dot = inputName.lastIndexOf(".");
  const stem = dot > 0 ? inputName.slice(0, dot) : inputName;

  if (outputType === "image/webp") return `${stem}.webp`;
  if (outputType === "image/jpeg") return `${stem}.jpg`;
  return inputName;
}

function shouldCompress(file: File): boolean {
  if (!COMPRESSIBLE_MIME_TYPES.has(file.type)) return false;
  if (file.size < MIN_BYTES_TO_COMPRESS) return false;
  return true;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const src = URL.createObjectURL(file);

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(src);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("Failed to decode image for compression"));
    };
    image.src = src;
  });
}

function computeTargetSize(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Compression produced an empty blob"));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

export async function compressImageForUpload(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  if (typeof window === "undefined") return file;
  if (typeof Image === "undefined") return file;
  if (typeof document === "undefined") return file;
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return file;
  }
  if (!shouldCompress(file)) return file;

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const targetBytes = options.targetBytes ?? DEFAULT_TARGET_BYTES;
  const initialQuality = options.initialQuality ?? DEFAULT_INITIAL_QUALITY;
  const minQuality = options.minQuality ?? DEFAULT_MIN_QUALITY;
  const qualityStep = options.qualityStep ?? DEFAULT_QUALITY_STEP;

  try {
    const image = await loadImage(file);
    const targetSize = computeTargetSize(
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
      maxDimension
    );
    const canvas = document.createElement("canvas");
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;

    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const outputType = getOutputType(file.type);
    let quality = initialQuality;
    let bestBlob = await canvasToBlob(canvas, outputType, quality);

    while (bestBlob.size > targetBytes && quality > minQuality) {
      quality = Math.max(minQuality, quality - qualityStep);
      const candidate = await canvasToBlob(canvas, outputType, quality);
      if (candidate.size >= bestBlob.size) break;
      bestBlob = candidate;
    }

    if (bestBlob.size >= file.size) {
      return file;
    }

    const outputName = buildOutputName(file.name, outputType);
    return new File([bestBlob], outputName, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    // Compression is best-effort; never block upload path.
    return file;
  }
}
