/**
 * Converts a base64 data URL to a File object.
 * @param dataUrl - A data URL string (e.g. "data:image/png;base64,...")
 * @param filename - Optional filename; defaults to "ai-generated.png"
 */
export function dataUrlToFile(dataUrl: string, filename = "ai-generated.png"): File {
  if (!dataUrl.startsWith("data:")) {
    throw new Error(`dataUrlToFile: invalid data URL — must start with "data:" (got: ${dataUrl.slice(0, 30)})`);
  }

  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("dataUrlToFile: malformed data URL — no comma separator found");
  }

  const meta = dataUrl.slice(5, commaIndex); // strip "data:" prefix
  const mimeType = meta.split(";")[0];
  const base64 = dataUrl.slice(commaIndex + 1);

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}
