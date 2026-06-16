export interface ImageQualityResult {
  acceptable: boolean;
  tooDark: boolean;
  tooBlurry: boolean;
  tooSmall: boolean;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function getCanvasContext(
  width: number,
  height: number
): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  return ctx;
}

function measureBrightness(data: Uint8ClampedArray): number {
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / (data.length / 4);
}

function measureSharpness(data: Uint8ClampedArray, width: number): number {
  let variance = 0;
  let count = 0;
  for (let y = 1; y < width - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const center = data[idx];
      const right = data[idx + 4];
      const bottom = data[(y + 1) * width * 4 + x * 4];
      const laplacian = Math.abs(2 * center - right - bottom);
      variance += laplacian * laplacian;
      count += 1;
    }
  }
  return count ? variance / count : 0;
}

export async function checkImageQuality(file: File): Promise<ImageQualityResult> {
  const img = await loadImage(file);
  const tooSmall = img.width < 800 || img.height < 600;

  const sampleSize = 120;
  const ctx = getCanvasContext(sampleSize, sampleSize);
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

  const brightness = measureBrightness(data);
  const sharpness = measureSharpness(data, sampleSize);

  const tooDark = brightness < 45;
  const tooBlurry = sharpness < 120;

  return {
    acceptable: !tooSmall && !tooDark && !tooBlurry,
    tooDark,
    tooBlurry,
    tooSmall,
  };
}

export async function compressImage(
  file: File,
  maxBytes = 500_000
): Promise<Blob> {
  const img = await loadImage(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.85;
  let blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  while (blob && blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
  }

  if (!blob) throw new Error("Compression failed");
  return blob;
}
