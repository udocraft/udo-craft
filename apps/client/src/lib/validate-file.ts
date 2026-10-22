export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateFile(
  file: File
): { valid: true } | { valid: false; error: string; status: 400 } {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: "Invalid file type", status: 400 };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "File too large", status: 400 };
  }

  return { valid: true };
}
