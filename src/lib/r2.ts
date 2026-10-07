// R2 Storage Operations
// Requirements: 2.3, 2.4, 7.6, 13.3

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { config } from "./config";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function encodeObjectKeyForUrl(key: string): string {
  return key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

/**
 * Lazily-initialized S3-compatible client for Cloudflare R2.
 * Uses a getter so the client is only created when first accessed
 * (after env vars are loaded).
 */
let _s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!_s3Client) {
    const { accountId, accessKeyId, secretAccessKey } = config.r2;
    _s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return _s3Client;
}

/**
 * Upload a file buffer to R2.
 * Returns the storage key used for the upload.
 */
export async function uploadToR2(
  file: Buffer,
  key: string,
  contentType: string,
  cacheControl?: string
): Promise<string> {
  const client = getS3Client();
  const resolvedCacheControl =
    cacheControl ?? resolveCacheControlForContentType(contentType);
  await client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: resolvedCacheControl,
    })
  );
  return key;
}

function resolveCacheControlForContentType(contentType: string): string {
  if (contentType.startsWith("image/") || contentType.startsWith("video/")) {
    // Task outputs are content-addressed by task UUID path, so short-term public caching is safe.
    return "public, max-age=86400, stale-while-revalidate=604800";
  }
  return "public, max-age=3600";
}

/**
 * Build the public CDN URL for a given R2 object key.
 * Format: https://{NEXT_PUBLIC_R2_DOMAIN}/{key}
 */
export function getR2CdnUrl(key: string): string {
  const domain = config.r2.publicDomain.replace(/\/+$/, "");
  const encodedKey = encodeObjectKeyForUrl(key);

  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    return `${domain}/${encodedKey}`;
  }
  return `https://${domain}/${encodedKey}`;
}

/**
 * Delete a single object from R2 by key.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
    })
  );
}

/**
 * Delete all R2 files associated with a task.
 * Lists objects with the prefix `tasks/{taskId}/` and deletes each one.
 * Covers original, restored, colorized, and animation files.
 */
export async function deleteTaskFiles(
  taskId: string,
  extraKeys: Array<string | null | undefined> = []
): Promise<void> {
  const client = getS3Client();
  const prefix = `tasks/${taskId}/`;

  const listResult = await client.send(
    new ListObjectsV2Command({
      Bucket: config.r2.bucketName,
      Prefix: prefix,
    })
  );

  const objects = listResult.Contents ?? [];
  const keys = new Set<string>();

  for (const obj of objects) {
    if (obj.Key) {
      keys.add(obj.Key);
    }
  }

  for (const key of extraKeys) {
    if (key && key.trim()) {
      keys.add(key);
    }
  }

  await Promise.all(
    Array.from(keys).map((key) => deleteFromR2(key))
  );
}

export async function getObjectFromR2(
  key: string,
  options: { range?: string } = {}
): Promise<GetObjectCommandOutput> {
  const client = getS3Client();
  return client.send(
    new GetObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      ...(options.range ? { Range: options.range } : {}),
    })
  );
}

export function r2BodyToWebStream(
  body: unknown
): ReadableStream<Uint8Array> | null {
  if (!body) return null;

  if (
    typeof body === "object" &&
    body !== null &&
    "transformToWebStream" in body &&
    typeof body.transformToWebStream === "function"
  ) {
    return body.transformToWebStream() as ReadableStream<Uint8Array>;
  }

  if (body instanceof Uint8Array) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(body);
        controller.close();
      },
    });
  }

  if (typeof body === "string") {
    const encoded = new TextEncoder().encode(body);
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded);
        controller.close();
      },
    });
  }

  if (
    typeof body === "object" &&
    body !== null &&
    Symbol.asyncIterator in body
  ) {
    const iterable = body as AsyncIterable<unknown>;
    const iterator = iterable[Symbol.asyncIterator]();

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { value, done } = await iterator.next();

        if (done) {
          controller.close();
          return;
        }

        if (value instanceof Uint8Array) {
          controller.enqueue(value);
          return;
        }

        if (typeof value === "string") {
          controller.enqueue(new TextEncoder().encode(value));
          return;
        }

        controller.error(new Error("Unsupported R2 stream chunk type."));
      },
    });
  }

  return null;
}

let _privateS3Client: S3Client | null = null;
function getPrivateS3Client(): S3Client {
  const accessKeyId = process.env.R2_PRIVATE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_PRIVATE_SECRET_ACCESS_KEY?.trim();
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) throw new Error("PRIVATE_MASTER_CREDENTIALS_INCOMPLETE");
  if (!accessKeyId || !secretAccessKey) return getS3Client();
  if (!_privateS3Client) {
    _privateS3Client = new S3Client({
      region: "auto", endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _privateS3Client;
}

/** Clean masters must never share the bucket exposed by the public CDN. */
function privateBucketName(): string {
  const name = process.env.R2_PRIVATE_BUCKET_NAME?.trim();
  if (!name || name === config.r2.bucketName) throw new Error("PRIVATE_MASTER_BUCKET_NOT_CONFIGURED");
  return name;
}

export async function uploadPrivateToR2(file: Buffer, key: string, contentType: string): Promise<string> {
  await getPrivateS3Client().send(new PutObjectCommand({
    Bucket: privateBucketName(), Key: key, Body: file, ContentType: contentType,
    CacheControl: "private, no-store, max-age=0",
  }));
  return key;
}

export async function getPrivateObjectFromR2(key: string, options: { range?: string } = {}): Promise<GetObjectCommandOutput> {
  return getPrivateS3Client().send(new GetObjectCommand({
    Bucket: privateBucketName(), Key: key,
    ...(options.range ? { Range: options.range } : {}),
  }));
}

/** For server-side model inputs only; never include in public task status. */
export async function getPrivateR2SignedUrl(key: string): Promise<string> {
  return getSignedUrl(getPrivateS3Client(), new GetObjectCommand({ Bucket: privateBucketName(), Key: key }), { expiresIn: 900 });
}

export async function deletePrivateTaskFiles(taskId: string, extraKeys: Array<string | null | undefined> = []): Promise<void> {
  const client = getPrivateS3Client();
  const bucket = privateBucketName();
  const prefix = `tasks/${taskId}/`;
  let continuationToken: string | undefined;
  const keys = new Set(extraKeys.filter((key): key is string => Boolean(key?.trim())));
  do {
    const result = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken }));
    for (const object of result.Contents ?? []) if (object.Key) keys.add(object.Key);
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
  await Promise.all(Array.from(keys, key => client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))));
}

export async function headPrivateObjectFromR2(key: string): Promise<HeadObjectCommandOutput> {
  return getPrivateS3Client().send(new HeadObjectCommand({ Bucket: privateBucketName(), Key: key }));
}

/** Validate rollout configuration before a worker starts chargeable model calls. */
export function assertPrivateR2Configured(): void {
  privateBucketName();
  getPrivateS3Client();
}
