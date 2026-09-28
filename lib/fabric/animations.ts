import { Canvas, FabricObject } from "fabric";
import { gsap } from "gsap";
import { getDocumentDuration, setSerializeGuard } from "@/lib/fabric/document";
import { EFFECTS } from "@/lib/fabric/effects";

export type Animation = {
  effect: string;
  duration: number;
};

declare module "fabric" {
  interface FabricObject {
    entrance?: Animation;
    exit?: Animation;
  }

  interface SerializedObjectProps {
    entrance?: Animation;
    exit?: Animation;
  }
}

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
    timeline = gsap.timeline({ paused: true });

    for (const object of canvas.getObjects()) {
      const { entrance, exit, start, duration } = object;

      const entranceLength = entrance && EFFECTS[entrance.effect] ? Math.min(entrance.duration, duration) : 0;
      if (entrance && entranceLength > 0) {
        EFFECTS[entrance.effect].in(timeline, object, canvas, start, entranceLength);
      }

      const exitLength = exit && EFFECTS[exit.effect] ? Math.min(exit.duration, duration - entranceLength) : 0;
      if (exit && exitLength > 0) {
        EFFECTS[exit.effect].out(timeline, object, canvas, start + duration - exitLength, exitLength);
      }
    }

    timeline.addLabel("end", getDocumentDuration(canvas));
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
