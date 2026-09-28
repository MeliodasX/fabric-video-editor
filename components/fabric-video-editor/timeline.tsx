"use client";

import { PointerEvent, useState } from "react";
import { Canvas, FabricImage, FabricObject, IText } from "fabric";
import { Playhead } from "@/lib/fabric/playhead";
import { VideoClip } from "@/lib/fabric/video";
import { getDocumentDuration, objectType } from "@/lib/fabric/document";
import { clamp } from "@/lib/utils";

type Props = {
  canvas: Canvas;
  playhead: Playhead;
};

type DragMode = "move" | "trim-start" | "trim-end";

type Drag = {
  object: FabricObject;
  mode: DragMode;
  originX: number;
  start: number;
  duration: number;
  trimStart: number;
};

const LABEL_WIDTH = 140;
const ROW_HEIGHT = 32;
const RULER_HEIGHT = 24;
const MIN_DURATION = 0.1;
const SNAP_PIXELS = 8;

const colorFor = (object: FabricObject) => {
  if (object instanceof VideoClip) return "bg-sky-500";
  if (object instanceof IText) return "bg-emerald-500";
  if (object instanceof FabricImage) return "bg-amber-500";
  return "bg-gray-500";
};

const labelFor = (object: FabricObject) => {
  if (object instanceof IText) return object.text.slice(0, 16);
  if (object instanceof VideoClip) return "Video";
  return objectType(object);
};

const Timeline = ({ canvas, playhead }: Props) => {
  "use no memo";

  const [pixelsPerSecond, setPixelsPerSecond] = useState(80);
  const [drag, setDrag] = useState<Drag | null>(null);

  const objects = [...canvas.getObjects()].reverse();
  const length = getDocumentDuration(canvas);
  const width = Math.max(length + 2, 10) * pixelsPerSecond;
  const active = canvas.getActiveObject();

  const toSeconds = (pixels: number) => pixels / pixelsPerSecond;
  const toPixels = (seconds: number) => seconds * pixelsPerSecond;

  const snapTargets = (except: FabricObject) => {
    const targets = [0, playhead.time];
    for (const object of canvas.getObjects()) {
      if (object === except) continue;
      targets.push(object.start, object.start + object.duration);
    }
    return targets;
  };

  const snap = (value: number, targets: number[]) => {
    const tolerance = toSeconds(SNAP_PIXELS);
    for (const target of targets) {
      if (Math.abs(value - target) <= tolerance) return target;
    }
    return value;
  };

  const startDrag = (event: PointerEvent, object: FabricObject, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    setDrag({
      object,
      mode,
      originX: event.clientX,
      start: object.start,
      duration: object.duration,
      trimStart: object instanceof VideoClip ? object.trimStart : 0,
    });
  };

  const moveDrag = (event: PointerEvent) => {
    if (!drag) return;
    const { object, mode } = drag;
    const delta = toSeconds(event.clientX - drag.originX);
    const targets = snapTargets(object);
    const clip = object instanceof VideoClip ? object : null;

    if (mode === "move") {
      const end = drag.start + drag.duration;
      const snappedStart = snap(drag.start + delta, targets);
      const snappedEnd = snap(end + delta, targets);
      const start = snappedStart !== drag.start + delta ? snappedStart : snappedEnd - drag.duration;
      object.set({ start: Math.max(0, start) });
    } else if (mode === "trim-end") {
      const maxDuration = clip ? clip.mediaDuration - clip.trimStart : Infinity;
      const end = snap(drag.start + drag.duration + delta, targets);
      object.set({ duration: clamp(end - drag.start, MIN_DURATION, maxDuration) });
    } else {
      const minStart = Math.max(0, drag.start - drag.trimStart);
      const maxStart = drag.start + drag.duration - MIN_DURATION;
      const start = clamp(snap(drag.start + delta, targets), minStart, maxStart);
      const shift = start - drag.start;
      object.set({ start, duration: drag.duration - shift });
      if (clip) clip.set({ trimStart: drag.trimStart + shift });
    }

    playhead.apply();
    setDrag({ ...drag });
  };

  const endDrag = () => {
    if (!drag) return;
    canvas.fire("object:modified", { target: drag.object });
    setDrag(null);
  };

  const scrubTo = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    playhead.seek(toSeconds(event.clientX - rect.left));
  };

  const startScrub = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    playhead.pause();
    scrubTo(event);
  };

  const moveScrub = (event: PointerEvent<HTMLDivElement>) => {
    if (event.buttons === 1) scrubTo(event);
  };

  const ticks = Array.from({ length: Math.floor(width / pixelsPerSecond) + 1 }, (_, second) => second);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-row items-center gap-2">
        <span className="w-16 font-semibold">Timeline</span>
        <label className="flex items-center gap-1 text-gray-500">
          Zoom
          <input
            type="range"
            min={20}
            max={200}
            value={pixelsPerSecond}
            onChange={(event) => setPixelsPerSecond(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="flex w-[960px] flex-row overflow-hidden rounded border border-gray-300">
        <div className="shrink-0 border-r border-gray-300 bg-gray-50" style={{ width: LABEL_WIDTH }}>
          <div className="border-b border-gray-300" style={{ height: RULER_HEIGHT }} />
          {objects.map((object) => (
            <div
              key={object.id}
              className={`flex items-center truncate border-b border-gray-200 px-2 ${active === object ? "font-semibold" : ""}`}
              style={{ height: ROW_HEIGHT }}
            >
              {labelFor(object)}
            </div>
          ))}
        </div>

        <div className="relative grow overflow-x-auto">
          <div className="relative" style={{ width }}>
            <div
              className="relative cursor-col-resize border-b border-gray-300 bg-gray-50 select-none"
              style={{ height: RULER_HEIGHT }}
              onPointerDown={startScrub}
              onPointerMove={moveScrub}
            >
              {ticks.map((second) => (
                <span
                  key={second}
                  className="absolute top-0 border-l border-gray-400 pl-1 text-xs text-gray-500"
                  style={{ left: toPixels(second), height: RULER_HEIGHT }}
                >
                  {second}s
                </span>
              ))}
            </div>

            {objects.map((object) => {
              const entrance = object.entrance ? Math.min(object.entrance.duration, object.duration) : 0;
              const exit = object.exit ? Math.min(object.exit.duration, object.duration - entrance) : 0;
              return (
                <div key={object.id} className="relative border-b border-gray-200" style={{ height: ROW_HEIGHT }}>
                  <div
                    className={`absolute top-1 bottom-1 cursor-grab rounded text-white select-none ${colorFor(object)} ${active === object ? "ring-2 ring-black" : ""}`}
                    style={{ left: toPixels(object.start), width: Math.max(toPixels(object.duration), 4) }}
                    onPointerDown={(event) => startDrag(event, object, "move")}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    {entrance > 0 && (
                      <div
                        className="absolute top-0 bottom-0 left-0 rounded-l bg-white/40"
                        style={{ width: toPixels(entrance) }}
                      />
                    )}
                    {exit > 0 && (
                      <div
                        className="absolute top-0 right-0 bottom-0 rounded-r bg-black/30"
                        style={{ width: toPixels(exit) }}
                      />
                    )}
                    <span className="absolute inset-0 truncate px-2 leading-6">{object.duration.toFixed(1)} s</span>
                    <div
                      className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize"
                      onPointerDown={(event) => startDrag(event, object, "trim-start")}
                    />
                    <div
                      className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize"
                      onPointerDown={(event) => startDrag(event, object, "trim-end")}
                    />
                  </div>
                </div>
              );
            })}

            <div
              className="pointer-events-none absolute top-0 bottom-0 w-px bg-red-500"
              style={{ left: toPixels(playhead.time) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
