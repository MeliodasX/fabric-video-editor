import { FabricObject } from "fabric";
import { gsap } from "gsap";
import { EFFECTS } from "@/lib/fabric/effects";
import "@/lib/fabric/types";

export type Frame = { width: number; height: number };

export const getLength = (objects: FabricObject[]) =>
  objects.reduce((end, object) => Math.max(end, object.start + object.duration), 0);

export const isVisibleAt = (object: FabricObject, time: number, length: number) => {
  const end = object.start + object.duration;
  return object.start <= time && (time < end || (time === end && end === length));
};

export const buildTimeline = (objects: FabricObject[], frame: Frame) => {
  const timeline = gsap.timeline({ paused: true });

  for (const object of objects) {
    const { entrance, exit, start, duration } = object;

    const entranceLength = entrance && EFFECTS[entrance.effect] ? Math.min(entrance.duration, duration) : 0;
    if (entrance && entranceLength > 0) {
      EFFECTS[entrance.effect].in(timeline, object, frame, start, entranceLength);
    }

    const exitLength = exit && EFFECTS[exit.effect] ? Math.min(exit.duration, duration - entranceLength) : 0;
    if (exit && exitLength > 0) {
      EFFECTS[exit.effect].out(timeline, object, frame, start + duration - exitLength, exitLength);
    }
  }

  timeline.addLabel("end", getLength(objects));
  return timeline;
};
