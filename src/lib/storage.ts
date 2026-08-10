import { randomUUID } from "crypto";
import { Storage } from "@google-cloud/storage";

const BUCKET_NAME = "rc-control-plane-uploads";

const storage = new Storage();

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

export function isAllowedImageType(contentType: string): boolean {
  return contentType in ALLOWED_CONTENT_TYPES;
}

export function isWithinUploadSizeLimit(byteLength: number): boolean {
  return byteLength <= MAX_UPLOAD_BYTES;
}

// Path never derives from the uploader-supplied filename — sidesteps path
// traversal/encoding issues entirely rather than trying to sanitize them.
export async function uploadImage(
  buffer: Buffer,
  contentType: string,
  slug: string,
): Promise<string> {
  const extension = ALLOWED_CONTENT_TYPES[contentType];
  const objectPath = `uploads/${slug}/${randomUUID()}.${extension}`;

  const file = storage.bucket(BUCKET_NAME).file(objectPath);
  await file.save(buffer, { contentType });

  return `https://storage.googleapis.com/${BUCKET_NAME}/${objectPath}`;
}
