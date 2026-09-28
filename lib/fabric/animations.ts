import { Canvas, FabricObject } from "fabric";
import { gsap } from "gsap";
import { setSerializeGuard } from "@/lib/fabric/document";
import { buildTimeline } from "@/lib/fabric/motion";

export type { Animation } from "@/lib/fabric/types";

export const DEFAULT_ANIMATION_DURATION = 1;

type Base = Pick<FabricObject, "left" | "top" | "scaleX" | "scaleY" | "opacity" | "clipPath">;

export const createAnimations = (canvas: Canvas) => {
  let timeline = gsap.timeline({ paused: true });
  let time = 0;
  let applied = false;
  const base = new WeakMap<FabricObject, Base>();

  const capture = () => {
    for (const object of canvas.getObjects()) {
      base.set(object, {
        left: object.left,
        top: object.top,
        scaleX: object.scaleX,
        scaleY: object.scaleY,
        opacity: object.opacity,
        clipPath: object.clipPath,
      });
    }
  };

  const restore = () => {
    if (!applied) return;
    for (const object of canvas.getObjects()) {
      const values = base.get(object);
      if (!values) continue;
      object.set(values);
      object.setCoords();
    }
    applied = false;
  };

  const build = () => {
    timeline.kill();
    timeline = buildTimeline(canvas.getObjects(), canvas);
  };

  const seek = (target: number) => {
    time = target;
    if (!applied) {
      capture();
      applied = true;
    }
    timeline.time(time);
  };

  const rebuild = () => {
    restore();
    build();
    seek(time);
  };

  setSerializeGuard(canvas, () => {
    restore();
    return () => seek(time);
  });

  canvas.on("mouse:down", restore);

  return {
    seek,
    rebuild,
    dispose: () => {
      restore();
      timeline.kill();
      canvas.off("mouse:down", restore);
      setSerializeGuard(canvas, null);
    },
  };
};

export type Animations = ReturnType<typeof createAnimations>;
