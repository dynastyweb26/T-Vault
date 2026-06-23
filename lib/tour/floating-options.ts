import type { FloatingOptions } from "react-joyride";
import { getTourEdgePadding, getTourMinTopPx } from "@/lib/tour/safe-area";

export function buildTourFloatingOptions(): Partial<FloatingOptions> {
  const edge = getTourEdgePadding();
  const minTop = getTourMinTopPx();

  return {
    shiftOptions: { padding: edge },
    flipOptions: {
      padding: {
        top: edge.top + 10,
        bottom: edge.bottom + 10,
        left: 20,
        right: 20,
      },
    },
    middleware: [
      {
        name: "tourSafeAreaClamp",
        fn({ y, rects }) {
          const floatingHeight = rects.floating.height;
          const maxY = Math.max(
            minTop,
            window.innerHeight - edge.bottom - floatingHeight
          );
          return {
            y: Math.min(Math.max(y, minTop), maxY),
          };
        },
      },
    ],
  };
}
