import { CELEBRATION_LOTTIE_URL } from "@/lib/celebration/constants";

export type CelebrationDotLottieReact =
  typeof import("@lottiefiles/dotlottie-react").DotLottieReact;

let libraryPromise: Promise<CelebrationDotLottieReact | null> | null = null;
let animationDataPromise: Promise<ArrayBuffer | null> | null = null;

let cachedDotLottieReact: CelebrationDotLottieReact | null = null;
let cachedAnimationData: ArrayBuffer | null = null;

function loadLibrary(): Promise<CelebrationDotLottieReact | null> {
  if (cachedDotLottieReact) {
    return Promise.resolve(cachedDotLottieReact);
  }

  if (!libraryPromise) {
    libraryPromise = import("@lottiefiles/dotlottie-react")
      .then((mod) => {
        cachedDotLottieReact = mod.DotLottieReact;
        return cachedDotLottieReact;
      })
      .catch(() => null);
  }

  return libraryPromise;
}

function loadAnimationData(): Promise<ArrayBuffer | null> {
  if (cachedAnimationData) {
    return Promise.resolve(cachedAnimationData);
  }

  if (!animationDataPromise) {
    animationDataPromise = fetch(CELEBRATION_LOTTIE_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("celebration_lottie_fetch_failed");
        }
        return response.arrayBuffer();
      })
      .then((buffer) => {
        cachedAnimationData = buffer;
        return buffer;
      })
      .catch(() => null);
  }

  return animationDataPromise;
}

/** Warm the dotLottie library and animation bytes before the success moment. */
export function preloadCelebrationAssets(): void {
  if (typeof window === "undefined") return;
  void loadLibrary();
  void loadAnimationData();
}

export function isCelebrationReady(): boolean {
  return Boolean(cachedDotLottieReact && cachedAnimationData);
}

export function getCachedCelebrationAssets(): {
  DotLottieReact: CelebrationDotLottieReact | null;
  animationData: ArrayBuffer | null;
} {
  return {
    DotLottieReact: cachedDotLottieReact,
    animationData: cachedAnimationData,
  };
}

export async function getCelebrationAssets(): Promise<{
  DotLottieReact: CelebrationDotLottieReact | null;
  animationData: ArrayBuffer | null;
}> {
  preloadCelebrationAssets();
  const [DotLottieReact, animationData] = await Promise.all([
    loadLibrary(),
    loadAnimationData(),
  ]);
  return { DotLottieReact, animationData };
}
