import { Canvas, FabricObject, Rect } from "fabric";
import { gsap } from "gsap";

type Vars = Record<string, number>;

type Hidden = (object: FabricObject, canvas: Canvas) => Vars;

export type Effect = {
  label: string;
  in: (timeline: gsap.core.Timeline, object: FabricObject, canvas: Canvas, at: number, duration: number) => void;
  out: (timeline: gsap.core.Timeline, object: FabricObject, canvas: Canvas, at: number, duration: number) => void;
};

const tween = (
  timeline: gsap.core.Timeline,
  object: FabricObject,
  from: Vars,
  to: Vars,
  at: number,
  duration: number,
  ease: string,
) => {
  const vars = { ...to, duration, ease, immediateRender: false, onUpdate: () => object.setCoords() };
  timeline.fromTo(object, from, vars, at);
};

const current = (object: FabricObject, keys: string[]): Vars =>
  Object.fromEntries(keys.map((key) => [key, object.get(key) as number]));

const preset = (label: string, hidden: Hidden, easeIn: string, easeOut: string): Effect => ({
  label,
  in: (timeline, object, canvas, at, duration) => {
    const from = hidden(object, canvas);
    tween(timeline, object, from, current(object, Object.keys(from)), at, duration, easeIn);
  },
  out: (timeline, object, canvas, at, duration) => {
    const to = hidden(object, canvas);
    tween(timeline, object, current(object, Object.keys(to)), to, at, duration, easeOut);
  },
});

const offscreen =
  (direction: "left" | "right" | "up" | "down"): Hidden =>
  (object, canvas): Vars => {
    const { width, height } = object.getBoundingRect();
    switch (direction) {
      case "left":
        return { left: -width / 2 };
      case "right":
        return { left: canvas.width + width / 2 };
      case "up":
        return { top: -height / 2 };
      case "down":
        return { top: canvas.height + height / 2 };
    }
  };

const tiny: Hidden = () => ({ scaleX: 0.01, scaleY: 0.01 });

const wipe = (label: string, axis: "x" | "y"): Effect => {
  const attach = (
    timeline: gsap.core.Timeline,
    object: FabricObject,
    from: number,
    to: number,
    at: number,
    duration: number,
  ) => {
    const progress = { value: from };
    const clip = new Rect({ absolutePositioned: true });

    const update = () => {
      const p = progress.value;
      if (p >= 1) {
        object.clipPath = undefined;
        return;
      }
      const bounds = object.getBoundingRect();
      const width = axis === "x" ? bounds.width * p : bounds.width;
      const height = axis === "y" ? bounds.height * p : bounds.height;
      clip.set({ left: bounds.left + width / 2, top: bounds.top + height / 2, width, height });
      object.clipPath = clip;
      object.dirty = true;
    };

    const vars = { value: to, duration, ease: "none", immediateRender: false, onUpdate: update };
    timeline.fromTo(progress, { value: from }, vars, at);
  };

  return {
    label,
    in: (timeline, object, _canvas, at, duration) => attach(timeline, object, 0, 1, at, duration),
    out: (timeline, object, _canvas, at, duration) => attach(timeline, object, 1, 0, at, duration),
  };
};

export const EFFECTS: Record<string, Effect> = {
  fade: preset("Fade", () => ({ opacity: 0 }), "none", "none"),
  slideLeft: preset("Slide from left", offscreen("left"), "power2.out", "power2.in"),
  slideRight: preset("Slide from right", offscreen("right"), "power2.out", "power2.in"),
  slideUp: preset("Slide from top", offscreen("up"), "power2.out", "power2.in"),
  slideDown: preset("Slide from bottom", offscreen("down"), "power2.out", "power2.in"),
  scale: preset("Scale", tiny, "power2.out", "power2.in"),
  pop: preset("Pop", tiny, "back.out(1.7)", "back.in(1.7)"),
  wipeAcross: wipe("Wipe across", "x"),
  wipeDown: wipe("Wipe down", "y"),
};
