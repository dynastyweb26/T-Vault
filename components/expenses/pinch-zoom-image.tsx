"use client";

import { useCallback, useRef } from "react";

export function PinchZoomImage({ src, alt }: { src: string; alt: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const lastPan = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const isGesturing = useRef(false);

  const applyTransform = useCallback(() => {
    const image = imageRef.current;
    if (!image) return;
    const { x, y } = translateRef.current;
    image.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scaleRef.current})`;
  }, []);

  const getTouchDistance = (touches: React.TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };

  return (
    <div
      className="flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden"
      onTouchStart={(event) => {
        const image = imageRef.current;
        if (!image) return;
        image.style.transition = "none";
        isGesturing.current = true;

        if (event.touches.length === 2) {
          pinchStartDistance.current = getTouchDistance(event.touches);
          pinchStartScale.current = scaleRef.current;
          isPanning.current = false;
        } else if (event.touches.length === 1 && scaleRef.current > 1) {
          isPanning.current = true;
          panStart.current = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
          };
          lastPan.current = { ...translateRef.current };
        }
      }}
      onTouchMove={(event) => {
        if (!isGesturing.current) return;

        if (event.touches.length === 2 && pinchStartDistance.current) {
          const distance = getTouchDistance(event.touches);
          const nextScale = Math.min(
            4,
            Math.max(1, (distance / pinchStartDistance.current) * pinchStartScale.current)
          );
          scaleRef.current = nextScale;
          if (nextScale <= 1) {
            translateRef.current = { x: 0, y: 0 };
          }
          applyTransform();
        } else if (
          event.touches.length === 1 &&
          isPanning.current &&
          scaleRef.current > 1
        ) {
          const dx = event.touches[0].clientX - panStart.current.x;
          const dy = event.touches[0].clientY - panStart.current.y;
          translateRef.current = {
            x: lastPan.current.x + dx,
            y: lastPan.current.y + dy,
          };
          applyTransform();
        }
      }}
      onTouchEnd={() => {
        const image = imageRef.current;
        pinchStartDistance.current = null;
        isPanning.current = false;
        isGesturing.current = false;

        if (scaleRef.current <= 1.05) {
          scaleRef.current = 1;
          translateRef.current = { x: 0, y: 0 };
        }

        if (image) {
          image.style.transition = "transform 150ms ease-out";
          applyTransform();
        }
      }}
      onDoubleClick={() => {
        const image = imageRef.current;
        if (!image) return;

        if (scaleRef.current > 1) {
          scaleRef.current = 1;
          translateRef.current = { x: 0, y: 0 };
        } else {
          scaleRef.current = 2;
        }

        image.style.transition = "transform 150ms ease-out";
        applyTransform();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className="max-h-full max-w-full select-none object-contain will-change-transform"
        draggable={false}
      />
    </div>
  );
}
