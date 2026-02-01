import { AbsoluteFill, Composition, getInputProps, Sequence } from "remotion";
import { TrackItem } from "../server/render-queue";

import { Html5Video, Html5Audio, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate } from "remotion";

// Helper: Wrapper around Remotion's interpolate for cleaner syntax
export const interpolateValue = (
  frame: number,
  inputRange: number[],
  outputRange: number[],
  options?: { extrapolateRight?: "clamp" | "extend" | "identity", extrapolateLeft?: "clamp" | "extend" | "identity" }
) => {
  return interpolate(frame, inputRange, outputRange, {
    extrapolateRight: options?.extrapolateRight as any || 'clamp',
    extrapolateLeft: options?.extrapolateLeft as any || 'clamp',
  });
};

export const ANIMATIONS: Record<string, {
  enter: (frame: number) => React.CSSProperties;
  exit: (frame: number, duration: number) => React.CSSProperties;
}> = {
  fade: {
    enter: (frame) => ({
      opacity: interpolateValue(frame, [0, 15], [0, 1])
    }),
    exit: (frame, duration) => ({
      opacity: interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  scale: {
    enter: (frame) => ({
      transform: `scale(${interpolateValue(frame, [0, 15], [0, 1])})`,
      opacity: interpolateValue(frame, [0, 15], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `scale(${interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })})`,
      opacity: interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  bounce: {
    enter: (frame) => ({
      transform: `translateY(${interpolateValue(frame, [0, 10, 13, 15], [100, -10, 5, 0])}px)`,
      opacity: interpolateValue(frame, [0, 10], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `translateY(${interpolateValue(frame, [duration - 15, duration - 13, duration - 10, duration], [0, 5, -10, 100], { extrapolateLeft: "clamp" })}px)`,
      opacity: interpolateValue(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  flip: {
    enter: (frame) => ({
      transform: `perspective(400px) rotateX(${interpolateValue(frame, [0, 15], [90, 0])}deg)`,
      opacity: interpolateValue(frame, [0, 5, 15], [0, 0.7, 1])
    }),
    exit: (frame, duration) => ({
      transform: `perspective(400px) rotateX(${interpolateValue(frame, [duration - 15, duration], [0, -90], { extrapolateLeft: "clamp" })}deg)`,
      opacity: interpolateValue(frame, [duration - 15, duration - 5, duration], [1, 0.7, 0], { extrapolateLeft: "clamp" })
    })
  },
  "zoom-blur": {
    enter: (frame) => ({
      transform: `scale(${interpolateValue(frame, [0, 15], [1.5, 1])})`,
      opacity: interpolateValue(frame, [0, 15], [0, 1]),
      filter: `blur(${interpolateValue(frame, [0, 15], [10, 0])}px)`
    }),
    exit: (frame, duration) => ({
      transform: `scale(${interpolateValue(frame, [duration - 15, duration], [1, 1.5], { extrapolateLeft: "clamp" })})`,
      opacity: interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" }),
      filter: `blur(${interpolateValue(frame, [duration - 15, duration], [0, 10], { extrapolateLeft: "clamp" })}px)`
    })
  },
  "slide-up": {
    enter: (frame) => ({
      transform: `translateY(${interpolateValue(frame, [0, 15], [30, 0])}px)`,
      opacity: interpolateValue(frame, [0, 15], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `translateY(${interpolateValue(frame, [duration - 15, duration], [0, -30], { extrapolateLeft: "clamp" })}px)`,
      opacity: interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  "snap-rotate": {
    enter: (frame) => ({
      transform: `rotate(${interpolateValue(frame, [0, 8, 12, 15], [-10, 5, -2, 0])}deg) scale(${interpolateValue(frame, [0, 15], [0.8, 1])})`,
      opacity: interpolateValue(frame, [0, 10], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `rotate(${interpolateValue(frame, [duration - 15, duration - 12, duration - 8, duration], [0, -2, 5, -10], { extrapolateLeft: "clamp" })}deg) scale(${interpolateValue(frame, [duration - 15, duration], [1, 0.8], { extrapolateLeft: "clamp" })})`,
      opacity: interpolateValue(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  glitch: {
    enter: (frame) => {
      const progress = interpolateValue(frame, [0, 15], [0, 1]);
      const intensity = 1 - progress;
      const offsetX = frame % 3 === 0 ? (10 * Math.random() - 5) * intensity : 0;
      const offsetY = frame % 4 === 0 ? (8 * Math.random() - 4) * intensity : 0;

      return {
        transform: `translate(${offsetX}px, ${offsetY}px) scale(${interpolateValue(frame, [0, 3, 6, 10, 15], [0.9, 1.05, 0.95, 1.02, 1])})`,
        opacity: interpolateValue(frame, [0, 3, 5, 15], [0, 0.7, 0.8, 1])
      };
    },
    exit: (frame, duration) => {
      const intensity = interpolateValue(frame, [duration - 15, duration], [0, 1], { extrapolateLeft: "clamp" });
      const remainingFrames = duration - frame;
      const offsetX = remainingFrames % 3 === 0 ? (10 * Math.random() - 5) * intensity : 0;
      const offsetY = remainingFrames % 4 === 0 ? (8 * Math.random() - 4) * intensity : 0;

      return {
        transform: `translate(${offsetX}px, ${offsetY}px) scale(${interpolateValue(frame, [duration - 15, duration - 10, duration - 6, duration - 3, duration], [1, 1.02, 0.95, 1.05, 0.9], { extrapolateLeft: "clamp" })})`,
        opacity: interpolateValue(frame, [duration - 15, duration - 5, duration - 3, duration], [1, 0.8, 0.7, 0], { extrapolateLeft: "clamp" })
      };
    }
  },
  "swipe-reveal": {
    enter: (frame) => ({
      transform: `translateX(${interpolateValue(frame, [0, 15], [0, 0])}px)`,
      opacity: 1,
      clipPath: `inset(0 ${interpolateValue(frame, [0, 15], [100, 0])}% 0 0)`
    }),
    exit: (frame, duration) => ({
      transform: `translateX(${interpolateValue(frame, [duration - 15, duration], [0, 0], { extrapolateLeft: "clamp" })}px)`,
      opacity: 1,
      clipPath: `inset(0 0 0 ${interpolateValue(frame, [duration - 15, duration], [0, 100], { extrapolateLeft: "clamp" })}%)`
    })
  },
  "float-in": {
    enter: (frame) => ({
      transform: `translate(${interpolateValue(frame, [0, 15], [10, 0])}px, ${interpolateValue(frame, [0, 15], [-20, 0])}px)`,
      opacity: interpolateValue(frame, [0, 15], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `translate(${interpolateValue(frame, [duration - 15, duration], [0, -10], { extrapolateLeft: "clamp" })}px, ${interpolateValue(frame, [duration - 15, duration], [0, -20], { extrapolateLeft: "clamp" })}px)`,
      opacity: interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  spin: {
    enter: (frame) => ({
      transform: `rotate(${interpolateValue(frame, [0, 15], [360, 0])}deg) scale(${interpolateValue(frame, [0, 15], [0, 1])})`,
      opacity: interpolateValue(frame, [0, 10], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `rotate(${interpolateValue(frame, [duration - 15, duration], [0, -360], { extrapolateLeft: "clamp" })}deg) scale(${interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })})`,
      opacity: interpolateValue(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  "slide-down": {
    enter: (frame) => ({
      transform: `translateY(${interpolateValue(frame, [0, 15], [-100, 0])}%)`,
      opacity: interpolateValue(frame, [0, 15], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `translateY(${interpolateValue(frame, [duration - 15, duration], [0, 100], { extrapolateLeft: "clamp" })}%)`,
      opacity: interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  "slide-left": {
    enter: (frame) => ({
      transform: `translateX(${interpolateValue(frame, [0, 15], [100, 0])}%)`,
      opacity: interpolateValue(frame, [0, 15], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `translateX(${interpolateValue(frame, [duration - 15, duration], [0, -100], { extrapolateLeft: "clamp" })}%)`,
      opacity: interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  "diagonal-slide": {
    enter: (frame) => ({
      transform: `translate(${interpolateValue(frame, [0, 15], [-100, 0])}%, ${interpolateValue(frame, [0, 15], [-100, 0])}%)`,
      opacity: interpolateValue(frame, [0, 15], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `translate(${interpolateValue(frame, [duration - 15, duration], [0, 100], { extrapolateLeft: "clamp" })}%, ${interpolateValue(frame, [duration - 15, duration], [0, 100], { extrapolateLeft: "clamp" })}%)`,
      opacity: interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  wobble: {
    enter: (frame) => ({
      transform: `rotate(${interpolateValue(frame, [0, 3, 6, 9, 12, 15], [0, -10, 8, -6, 3, 0])}deg)`,
      opacity: interpolateValue(frame, [0, 5], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `rotate(${interpolateValue(frame, [duration - 15, duration - 12, duration - 9, duration - 6, duration - 3, duration], [0, 3, -6, 8, -10, 0], { extrapolateLeft: "clamp" })}deg)`,
      opacity: interpolateValue(frame, [duration - 5, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  "flip-y": {
    enter: (frame) => ({
      transform: `perspective(400px) rotateY(${interpolateValue(frame, [0, 15], [90, 0])}deg)`,
      opacity: interpolateValue(frame, [0, 5, 15], [0, 0.7, 1])
    }),
    exit: (frame, duration) => ({
      transform: `perspective(400px) rotateY(${interpolateValue(frame, [duration - 15, duration], [0, -90], { extrapolateLeft: "clamp" })}deg)`,
      opacity: interpolateValue(frame, [duration - 15, duration - 5, duration], [1, 0.7, 0], { extrapolateLeft: "clamp" })
    })
  },
  pulse: {
    enter: (frame) => ({
      transform: `scale(${interpolateValue(frame, [0, 5, 10, 15], [0, 1.2, 0.9, 1])})`,
      opacity: interpolateValue(frame, [0, 5], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `scale(${interpolateValue(frame, [duration - 15, duration - 10, duration - 5, duration], [1, 0.9, 1.2, 0], { extrapolateLeft: "clamp" })})`,
      opacity: interpolateValue(frame, [duration - 5, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  drop: {
    enter: (frame) => ({
      transform: `translateY(${interpolateValue(frame, [0, 10, 15], [-200, 20, 0])}px)`,
      opacity: interpolateValue(frame, [0, 8], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `translateY(${interpolateValue(frame, [duration - 15, duration - 10, duration], [0, -20, 200], { extrapolateLeft: "clamp" })}px)`,
      opacity: interpolateValue(frame, [duration - 8, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  squeeze: {
    enter: (frame) => ({
      transform: `scale(${interpolateValue(frame, [0, 8, 15], [0, 1.3, 1])}, ${interpolateValue(frame, [0, 8, 15], [0, 0.7, 1])})`,
      opacity: interpolateValue(frame, [0, 8], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `scale(${interpolateValue(frame, [duration - 15, duration - 8, duration], [1, 1.3, 0], { extrapolateLeft: "clamp" })}, ${interpolateValue(frame, [duration - 15, duration - 8, duration], [1, 0.7, 0], { extrapolateLeft: "clamp" })})`,
      opacity: interpolateValue(frame, [duration - 8, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  roll: {
    enter: (frame) => ({
      transform: `translateX(${interpolateValue(frame, [0, 15], [-100, 0])}%) rotate(${interpolateValue(frame, [0, 15], [-180, 0])}deg)`,
      opacity: interpolateValue(frame, [0, 10], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `translateX(${interpolateValue(frame, [duration - 15, duration], [0, 100], { extrapolateLeft: "clamp" })}%) rotate(${interpolateValue(frame, [duration - 15, duration], [0, 180], { extrapolateLeft: "clamp" })}deg)`,
      opacity: interpolateValue(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  swing: {
    enter: (frame) => ({
      transform: `rotate(${interpolateValue(frame, [0, 5, 10, 15], [20, -15, 10, 0])}deg)`,
      opacity: interpolateValue(frame, [0, 5], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `rotate(${interpolateValue(frame, [duration - 15, duration - 10, duration - 5, duration], [0, 10, -15, 20], { extrapolateLeft: "clamp" })}deg)`,
      opacity: interpolateValue(frame, [duration - 5, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  "expand-vertical": {
    enter: (frame) => ({
      transform: `scaleY(${interpolateValue(frame, [0, 15], [0, 1])})`,
      opacity: interpolateValue(frame, [0, 10], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `scaleY(${interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })})`,
      opacity: interpolateValue(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  "expand-horizontal": {
    enter: (frame) => ({
      transform: `scaleX(${interpolateValue(frame, [0, 15], [0, 1])})`,
      opacity: interpolateValue(frame, [0, 10], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `scaleX(${interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })})`,
      opacity: interpolateValue(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  twist: {
    enter: (frame) => ({
      transform: `perspective(600px) rotateX(${interpolateValue(frame, [0, 15], [180, 0])}deg) rotateY(${interpolateValue(frame, [0, 15], [180, 0])}deg)`,
      opacity: interpolateValue(frame, [0, 8, 15], [0, 0.5, 1])
    }),
    exit: (frame, duration) => ({
      transform: `perspective(600px) rotateX(${interpolateValue(frame, [duration - 15, duration], [0, -180], { extrapolateLeft: "clamp" })}deg) rotateY(${interpolateValue(frame, [duration - 15, duration], [0, -180], { extrapolateLeft: "clamp" })}deg)`,
      opacity: interpolateValue(frame, [duration - 15, duration - 8, duration], [1, 0.5, 0], { extrapolateLeft: "clamp" })
    })
  },
  blur: {
    enter: (frame) => ({
      filter: `blur(${interpolateValue(frame, [0, 15], [20, 0])}px)`,
      opacity: interpolateValue(frame, [0, 15], [0, 1])
    }),
    exit: (frame, duration) => ({
      filter: `blur(${interpolateValue(frame, [duration - 15, duration], [0, 20], { extrapolateLeft: "clamp" })}px)`,
      opacity: interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  spiral: {
    enter: (frame) => ({
      transform: `translate(${interpolateValue(frame, [0, 15], [-50, 0])}px, ${interpolateValue(frame, [0, 15], [-50, 0])}px) rotate(${interpolateValue(frame, [0, 15], [720, 0])}deg) scale(${interpolateValue(frame, [0, 15], [0, 1])})`,
      opacity: interpolateValue(frame, [0, 10], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `translate(${interpolateValue(frame, [duration - 15, duration], [0, 50], { extrapolateLeft: "clamp" })}px, ${interpolateValue(frame, [duration - 15, duration], [0, 50], { extrapolateLeft: "clamp" })}px) rotate(${interpolateValue(frame, [duration - 15, duration], [0, -720], { extrapolateLeft: "clamp" })}deg) scale(${interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })})`,
      opacity: interpolateValue(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  shake: {
    enter: (frame) => ({
      transform: `translateX(${interpolateValue(frame, [0, 2, 4, 6, 8, 10, 12, 15], [0, -10, 10, -8, 8, -5, 5, 0])}px)`,
      opacity: interpolateValue(frame, [0, 5], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `translateX(${interpolateValue(frame, [duration - 15, duration - 12, duration - 10, duration - 8, duration - 6, duration - 4, duration - 2, duration], [0, 5, -5, 8, -8, 10, -10, 0], { extrapolateLeft: "clamp" })}px)`,
      opacity: interpolateValue(frame, [duration - 5, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  curtain: {
    enter: (frame) => ({
      clipPath: `inset(0 0 ${interpolateValue(frame, [0, 15], [100, 0])}% 0)`,
      opacity: 1
    }),
    exit: (frame, duration) => ({
      clipPath: `inset(${interpolateValue(frame, [duration - 15, duration], [0, 100], { extrapolateLeft: "clamp" })}% 0 0 0)`,
      opacity: 1
    })
  },
  fold: {
    enter: (frame) => ({
      transform: `perspective(800px) rotateX(${interpolateValue(frame, [0, 15], [-90, 0])}deg)`,
      opacity: interpolateValue(frame, [0, 8], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `perspective(800px) rotateX(${interpolateValue(frame, [duration - 15, duration], [0, 90], { extrapolateLeft: "clamp" })}deg)`,
      opacity: interpolateValue(frame, [duration - 8, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  zigzag: {
    enter: (frame) => ({
      transform: `translate(${interpolateValue(frame, [0, 3, 6, 9, 12, 15], [-100, -60, -40, -20, -10, 0])}%, ${interpolateValue(frame, [0, 3, 6, 9, 12, 15], [0, 30, -20, 15, -10, 0])}%)`,
      opacity: interpolateValue(frame, [0, 10], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `translate(${interpolateValue(frame, [duration - 15, duration - 12, duration - 9, duration - 6, duration - 3, duration], [0, 10, 20, 40, 60, 100], { extrapolateLeft: "clamp" })}%, ${interpolateValue(frame, [duration - 15, duration - 12, duration - 9, duration - 6, duration - 3, duration], [0, -10, 15, -20, 30, 0], { extrapolateLeft: "clamp" })}%)`,
      opacity: interpolateValue(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  elastic: {
    enter: (frame) => ({
      transform: `scale(${interpolateValue(frame, [0, 5, 8, 11, 13, 15], [0, 1.3, 0.9, 1.1, 0.95, 1])})`,
      opacity: interpolateValue(frame, [0, 5], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `scale(${interpolateValue(frame, [duration - 15, duration - 13, duration - 11, duration - 8, duration - 5, duration], [1, 0.95, 1.1, 0.9, 1.3, 0], { extrapolateLeft: "clamp" })})`,
      opacity: interpolateValue(frame, [duration - 5, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  slingshot: {
    enter: (frame) => ({
      transform: `translateX(${interpolateValue(frame, [0, 8, 10, 15], [-200, -50, 20, 0])}px) scaleX(${interpolateValue(frame, [0, 8, 10, 15], [1.5, 1.2, 0.9, 1])})`,
      opacity: interpolateValue(frame, [0, 8], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `translateX(${interpolateValue(frame, [duration - 15, duration - 10, duration - 8, duration], [0, -20, 50, 200], { extrapolateLeft: "clamp" })}px) scaleX(${interpolateValue(frame, [duration - 15, duration - 10, duration - 8, duration], [1, 0.9, 1.2, 1.5], { extrapolateLeft: "clamp" })})`,
      opacity: interpolateValue(frame, [duration - 8, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  "rotate-in": {
    enter: (frame) => ({
      transform: `rotate(${interpolateValue(frame, [0, 15], [-180, 0])}deg) scale(${interpolateValue(frame, [0, 15], [0, 1])})`,
      opacity: interpolateValue(frame, [0, 10], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `rotate(${interpolateValue(frame, [duration - 15, duration], [0, 180], { extrapolateLeft: "clamp" })}deg) scale(${interpolateValue(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" })})`,
      opacity: interpolateValue(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  skew: {
    enter: (frame) => ({
      transform: `skewX(${interpolateValue(frame, [0, 15], [45, 0])}deg) skewY(${interpolateValue(frame, [0, 15], [15, 0])}deg)`,
      opacity: interpolateValue(frame, [0, 10], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `skewX(${interpolateValue(frame, [duration - 15, duration], [0, -45], { extrapolateLeft: "clamp" })}deg) skewY(${interpolateValue(frame, [duration - 15, duration], [0, -15], { extrapolateLeft: "clamp" })}deg)`,
      opacity: interpolateValue(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  peek: {
    enter: (frame) => ({
      clipPath: `inset(0 ${interpolateValue(frame, [0, 15], [95, 0])}% 0 0)`,
      transform: `translateX(${interpolateValue(frame, [0, 15], [-50, 0])}px)`,
      opacity: 1
    }),
    exit: (frame, duration) => ({
      clipPath: `inset(0 0 0 ${interpolateValue(frame, [duration - 15, duration], [0, 95], { extrapolateLeft: "clamp" })}%)`,
      transform: `translateX(${interpolateValue(frame, [duration - 15, duration], [0, 50], { extrapolateLeft: "clamp" })}px)`,
      opacity: 1
    })
  },
  vortex: {
    enter: (frame) => ({
      transform: `rotate(${interpolateValue(frame, [0, 15], [1080, 0])}deg) scale(${interpolateValue(frame, [0, 15], [0.2, 1])})`,
      filter: `blur(${interpolateValue(frame, [0, 10, 15], [15, 5, 0])}px)`,
      opacity: interpolateValue(frame, [0, 10], [0, 1])
    }),
    exit: (frame, duration) => ({
      transform: `rotate(${interpolateValue(frame, [duration - 15, duration], [0, -1080], { extrapolateLeft: "clamp" })}deg) scale(${interpolateValue(frame, [duration - 15, duration], [1, 0.2], { extrapolateLeft: "clamp" })})`,
      filter: `blur(${interpolateValue(frame, [duration - 15, duration - 10, duration], [0, 5, 15], { extrapolateLeft: "clamp" })}px)`,
      opacity: interpolateValue(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" })
    })
  },
  typing: {
    enter: (frame) => ({
      opacity: interpolateValue(frame, [0, 15], [0, 1])
    }),
    exit: (frame, duration) => ({})
  }
};

export const TrackRenderer: React.FC<{ track: TrackItem }> = ({ track }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const props = track.properties || {};

  const enterType = props.enterAnimation || 'none';
  const exitType = props.exitAnimation || 'none';

  // Animation Duration Check Window (e.g. 30 frames) to safely merge exit animations
  const animWindow = 30;

  let animStyle: React.CSSProperties = {};

  // 1. Calculate Enter Animation
  if (enterType !== 'none' && ANIMATIONS[enterType]) {
    const enterStyle = ANIMATIONS[enterType].enter(frame);
    animStyle = { ...animStyle, ...enterStyle };
  }

  // 2. Calculate Exit Animation
  if (exitType !== 'none' && ANIMATIONS[exitType]) {
    const exitStyle = ANIMATIONS[exitType].exit(frame, track.durationInFrames);

    // Logic to prioritize exit animation if we are at the end of the clip
    if (frame > track.durationInFrames - animWindow) {
      // Merging styles: exit usually overrides enter logic (like opacity)
      animStyle = { ...animStyle, ...exitStyle };

      // Special handling for transforms to avoid conflicting string concatenations
      if (exitStyle.transform && animStyle.transform) {
        animStyle.transform = exitStyle.transform;
      }
    }
  }

  // --- COMPOSE FILTERS (VISUAL EFFECTS) ---
  // Combine basic filters (brightness, contrast, etc) with animation filters
  const staticFilters = [
    props.filterPreset ? props.filterPreset : '', // CSS Filter String from preset
    props.brightness !== undefined && props.brightness !== 100 ? `brightness(${props.brightness}%)` : '',
    props.contrast !== undefined && props.contrast !== 100 ? `contrast(${props.contrast}%)` : '',
    props.saturate !== undefined && props.saturate !== 100 ? `saturate(${props.saturate}%)` : '',
    props.blur !== undefined && props.blur !== 0 ? `blur(${props.blur}px)` : '',
    props.backdropFilter ? `drop-shadow(0 0 0 rgba(0,0,0,0))` : '' // Hack to force backdrop filter layer sometimes
  ].filter(Boolean).join(' ');

  const finalFilter = [staticFilters, animStyle.filter].filter(Boolean).join(' ');

  // --- BASE STYLES ---
  const { transform: animTransform, ...otherAnimStyles } = animStyle;

  const finalContainerStyle: React.CSSProperties = {
    position: 'absolute',
    left: props.x ?? 0,
    top: props.y ?? 0,
    width: props.width ?? '100%',
    height: props.height ?? '100%',
    transformOrigin: 'center center',
    // User applied rotation/scale is on the container
    transform: `rotate(${props.rotation ?? 0}deg) scale(${props.scale ?? 1})`,

    // --- VISUAL STYLES (New) ---
    borderRadius: props.borderRadius ? `${props.borderRadius}px` : undefined,
    backgroundColor: props.backgroundColor || undefined,
    padding: props.padding ? `${props.padding}px` : undefined,
    border: props.borderWidth ? `${props.borderWidth}px solid ${props.borderColor || '#000'}` : undefined,
    boxShadow: props.boxShadow || undefined,
    // NOTE: background for gradients is usually applied to TEXT for text tracks, but container for others.
    // We handle this inside the specific type blocks if needed, but here is general container bg.
    // background: props.background || undefined,
    backdropFilter: props.backdropFilter || undefined,

    // Opacity/Filter/ClipPath can be applied to container for cleaner DOM
    opacity: (otherAnimStyles.opacity !== undefined) ? otherAnimStyles.opacity : (props.opacity !== undefined ? props.opacity / 100 : 1),
    filter: finalFilter || undefined,
    clipPath: otherAnimStyles.clipPath,
    overflow: props.captionData ? 'visible' : 'hidden', // Captions might overflow slightly with effects
    boxSizing: 'border-box', // Ensure padding doesn't expand width
  };

  const startOffset = props.startOffset || 0;

  // Normalize volume from 0-100 to 0-1
  const volume = (props.volume ?? 100) / 100;

  return (
    <div style={finalContainerStyle}>
      {/* Inner div handles the transient animation transforms (bounce, slide, etc.) */}
      <div style={{ width: '100%', height: '100%', transform: animTransform, display: 'flex' }}>
        {track.type === 'video' && track.src && (
          <Html5Video
            src={track.src}
            style={{
              width: '100%',
              height: '100%',
              objectFit: (props.objectFit as any) || 'cover',
              borderRadius: props.borderRadius ? `${Math.max(0, props.borderRadius - (props.padding || 0))}px` : undefined
            }}
            volume={volume}
            playbackRate={props.speed || 1}
            startFrom={startOffset}
            crossOrigin="anonymous"
          />
        )}
        {track.type === 'image' && track.src && (
          <Img
            src={track.src}
            style={{
              width: '100%',
              height: '100%',
              objectFit: (props.objectFit as any) || 'cover',
              borderRadius: props.borderRadius ? `${Math.max(0, props.borderRadius - (props.padding || 0))}px` : undefined
            }}
            crossOrigin="anonymous"
          />
        )}
        {track.type === 'audio' && track.src && (
          <Html5Audio
            src={track.src}
            playbackRate={props.speed || 1}
            startFrom={startOffset}
            volume={volume}
            crossOrigin="anonymous"
          />
        )}
        {track.type === 'text' && (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexWrap: 'wrap', // Allow wrapping for sentences
            alignItems: 'center',
            justifyContent: props.textAlign || 'center',
            alignContent: 'center', // Center vertically when wrapped

            // Font Props
            fontFamily: props.fontFamily || 'sans-serif',
            fontSize: props.fontSize || 80,
            color: props.color || 'white',
            fontWeight: props.fontWeight || 'normal',
            lineHeight: props.lineHeight || 1.2,
            letterSpacing: props.letterSpacing || 'normal',
            textTransform: props.textTransform || 'none',

            // Advanced Text FX (Applied directly to this container so inner text inherits)
            textShadow: props.textShadow || undefined,
            WebkitTextStroke: props.WebkitTextStroke || undefined,
            backgroundImage: props.backgroundImage || undefined,
            backgroundClip: props.WebkitBackgroundClip || undefined,
            WebkitBackgroundClip: props.WebkitBackgroundClip || undefined,
            WebkitTextFillColor: props.WebkitTextFillColor || undefined,

            gap: '0.25em' // Gap between words
          }}>
            <style>
              {`
                             /* Tiptap Default Reset */
                             #rendered-text-content p {
                                margin: 0;
                             }
                           `}
            </style>
            {props.captionData ? (
              props.captionData.words.map((word: any, i: number) => {
                // Calculate time relative to the clip start
                const currentMs = (frame / fps) * 1000;
                // Check if active (normalize relative to caption block start)
                const wordStartRel = word.startMs - props.captionData.startMs;
                const wordEndRel = word.endMs - props.captionData.startMs;
                const isActive = currentMs >= wordStartRel && currentMs < wordEndRel;

                // Extract highlight styles if available
                const highlight = props.highlightStyle || {};

                const activeStyle: React.CSSProperties = isActive ? {
                  color: highlight.color || '#fbbf24',
                  backgroundColor: highlight.backgroundColor || 'transparent',
                  transform: highlight.scale ? `scale(${highlight.scale})` : 'scale(1.1)',
                  textShadow: highlight.textShadow || '0 0 10px rgba(251, 191, 36, 0.5)',
                  fontWeight: highlight.fontWeight || props.fontWeight || 'bold',
                  borderRadius: highlight.borderRadius ? `${highlight.borderRadius}px` : undefined,
                  padding: highlight.padding ? `0 ${highlight.padding}px` : undefined,
                  border: highlight.border || undefined,
                  backdropFilter: highlight.backdropFilter || undefined,
                  boxShadow: highlight.boxShadow || undefined
                } : {};

                return (
                  <span key={i} style={{
                    color: props.color || 'white',
                    transition: 'all 0.1s ease-out',
                    display: 'inline-block', // needed for transform
                    ...activeStyle
                  }}>
                    {word.word}
                  </span>
                );
              })
            ) : (
              <div
                id="rendered-text-content"
                dangerouslySetInnerHTML={{ __html: props.text || track.name }}
                style={{
                  width: '100%',
                  textAlign: props.textAlign as any || 'center',
                  // Ensure fonts inherit properties set on the parent container (which come from props)
                  // But since we are rendering HTML, we need to make sure these cascade down if not overridden by inner HTML
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  color: 'inherit',
                  fontWeight: 'inherit',
                  fontStyle: 'inherit',
                  textDecoration: 'inherit',
                  lineHeight: 'inherit',
                  letterSpacing: 'inherit',
                  textTransform: 'inherit',
                  // Special inheritance for advanced FX
                  textShadow: 'inherit',
                  WebkitTextStroke: 'inherit',
                  backgroundImage: 'inherit',
                  backgroundClip: 'inherit',
                  WebkitBackgroundClip: 'inherit',
                  WebkitTextFillColor: 'inherit',

                  whiteSpace: 'normal', // Allow normal wrapping for HTML content
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PreviewComposition: React.FC<{ tracks: TrackItem[] }> = ({ tracks }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      {tracks.map((track) => (
        <Sequence
          key={track.id}
          from={track.startFrame}
          durationInFrames={track.durationInFrames}
        >
          <TrackRenderer track={track} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  const inputProps = getInputProps() as {
    tracks: TrackItem[];
    width: number;
    height: number;
    durationInFrames: number;
    fps: number;
  };
  console.log("Input props:", inputProps);

  return (
    <>
      <Composition
        id="RenderComposition"
        component={PreviewComposition}
        // @ts-ignore
        inputProps={{
          tracks: inputProps.tracks
        }}
        durationInFrames={(inputProps.durationInFrames as number) ?? 300}
        fps={inputProps.fps}
        width={inputProps.width || 1920}
        height={inputProps.height || 1080}
      />
    </>
  );
};
