/**
 * Background removal helper for client-side flow.
 * Mirrors admin behavior with medium-model first and OOM fallback.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedFn: ((input: Blob, config?: any) => Promise<Blob>) | null = null;
let currentAbortController: AbortController | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRemoveBgFn(): Promise<(input: Blob, config?: any) => Promise<Blob>> {
  if (cachedFn) return cachedFn;
  const mod = await import("@imgly/background-removal");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = mod.removeBackground ?? (mod as any).default?.removeBackground ?? (mod as any).default;
  if (typeof fn !== "function") throw new Error("removeBackground not found");
  cachedFn = fn as (input: Blob, config?: any) => Promise<Blob>;
  return cachedFn;
}

async function resizeBlob(blob: Blob, maxPx: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const scale = Math.min(1, maxPx / Math.max(width, height));
      if (scale >= 1) {
        resolve(blob);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(blob);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((next) => resolve(next ?? blob), "image/png", 0.95);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
  });
}

function isOomError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes("memory") || msg.includes("backend") || msg.includes("session") || msg.includes("wasm") || msg.includes("oom");
}

export async function removeBgClient(imageUrl: string): Promise<string> {
  currentAbortController = new AbortController();
  const { signal } = currentAbortController;

  let fetchUrl = imageUrl;
  if (imageUrl.startsWith("http")) {
    fetchUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  }

  const res = await fetch(fetchUrl, { signal });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const rawBlob = await res.blob();

  if (signal.aborted) throw new Error("Скасовано користувачем");
  await new Promise((r) => setTimeout(r, 50));
  if (signal.aborted) throw new Error("Скасовано користувачем");

  const fn = await getRemoveBgFn();

  const blobMedium = await resizeBlob(rawBlob, 1500);
  if (signal.aborted) throw new Error("Скасовано користувачем");

  try {
    const result = await fn(blobMedium, {
      signal,
      model: "medium",
      proxyToWorker: false,
      output: { format: "image/png", quality: 1 },
    });
    return URL.createObjectURL(result);
  } catch (err) {
    if (signal.aborted) throw new Error("Скасовано користувачем");
    if (!isOomError(err)) throw err;
  }

  const blobSmall = await resizeBlob(rawBlob, 1024);
  if (signal.aborted) throw new Error("Скасовано користувачем");

  try {
    const result = await fn(blobSmall, {
      signal,
      model: "small",
      proxyToWorker: false,
      output: { format: "image/png", quality: 0.9 },
    });
    return URL.createObjectURL(result);
  } catch (err) {
    if (signal.aborted) throw new Error("Скасовано користувачем");
    if (isOomError(err)) {
      throw new Error("Недостатньо пам'яті для видалення фону. Спробуйте зменшити зображення або використайте інший пристрій.");
    }
    throw err;
  }
}

export function cancelRemoveBg(): void {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}

