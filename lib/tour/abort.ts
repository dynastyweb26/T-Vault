export class TourAbortedError extends Error {
  constructor() {
    super("Tour aborted");
    this.name = "TourAbortedError";
  }
}

let tourAborted = false;

export function setTourAborted(value: boolean): void {
  tourAborted = value;
}

export function isTourAborted(): boolean {
  return tourAborted;
}

export function assertTourActive(): void {
  if (tourAborted) {
    throw new TourAbortedError();
  }
}
