const SAFE_REDIRECT_PATTERN = /^\/[a-zA-Z0-9/_-]*$/;

export function validateRedirectPath(
  next: string | null | undefined,
  fallback = "/splash"
): string {
  if (!next) return fallback;
  if (!SAFE_REDIRECT_PATTERN.test(next)) return fallback;
  if (next.includes("//") || next.includes("@") || next.includes("\\")) {
    return fallback;
  }
  return next;
}

const STORAGE_BUCKET = "game1-documents";

export function extractStoragePath(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    const patterns = [
      /\/storage\/v1\/object\/sign\/[^/]+\/(.+)/,
      /\/storage\/v1\/object\/public\/[^/]+\/(.+)/,
      /\/storage\/v1\/object\/authenticated\/[^/]+\/(.+)/,
    ];

    for (const pattern of patterns) {
      const match = url.pathname.match(pattern);
      if (match?.[1]) {
        return decodeURIComponent(match[1].split("?")[0]);
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function isStoragePathOwnedByUser(
  storagePath: string,
  userId: string
): boolean {
  const prefix = `${userId}/`;
  return storagePath === userId || storagePath.startsWith(prefix);
}

export { STORAGE_BUCKET };
