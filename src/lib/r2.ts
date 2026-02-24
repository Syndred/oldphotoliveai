// R2 Storage Operations
// Requirements: 2.3, 2.4, 7.6, 13.3

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { config } from "./config";

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
  contentType: string
): Promise<string> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );
  return key;
}

/**
 * Build the public CDN URL for a given R2 object key.
 * Format: https://{NEXT_PUBLIC_R2_DOMAIN}/{key}
 */
export function getR2CdnUrl(key: string): string {
  return `https://${config.r2.publicDomain}/${key}`;
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
export async function deleteTaskFiles(taskId: string): Promise<void> {
  const client = getS3Client();
  const prefix = `tasks/${taskId}/`;

  const listResult = await client.send(
    new ListObjectsV2Command({
      Bucket: config.r2.bucketName,
      Prefix: prefix,
    })
  );

  const objects = listResult.Contents ?? [];
  await Promise.all(
    objects.map((obj) =>
      obj.Key ? deleteFromR2(obj.Key) : Promise.resolve()
    )
  );
}
