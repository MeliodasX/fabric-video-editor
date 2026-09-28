"use client";

import { Canvas, FabricObject } from "fabric";
import { VideoClip } from "@/lib/fabric/video";
import { objectType } from "@/lib/fabric/document";
import { clamp } from "@/lib/utils";

type Props = {
  canvas: Canvas;
  object: FabricObject;
};

type Editable = Partial<Pick<VideoClip, "start" | "duration" | "trimStart">>;

const MIN_DURATION = 0.1;

const TimeWindow = ({ canvas, object }: Props) => {
  "use no memo";

  const clip = object instanceof VideoClip ? object : null;
  const maxDuration = clip ? clip.mediaDuration - clip.trimStart : Infinity;

  const update = (props: Editable) => {
    object.set(props);
    canvas.fire("object:modified", { target: object });
  };

  const setTrimStart = (value: number) => {
    if (!clip) return;
    const trimStart = clamp(value, 0, clip.mediaDuration - MIN_DURATION);
    update({ trimStart, duration: Math.min(clip.duration, clip.mediaDuration - trimStart) });
  };

  return (
    <div className="flex flex-row flex-wrap items-center gap-2 text-sm">
      <span className="w-16 font-semibold">Selected</span>
      <span className="rounded bg-gray-100 px-2 py-1">{objectType(object)}</span>
      <Field label="Start" value={object.start} min={0} onChange={(value) => update({ start: Math.max(0, value) })} />
      <Field
        label="Duration"
        value={object.duration}
        min={MIN_DURATION}
        max={maxDuration}
        onChange={(value) => update({ duration: clamp(value, MIN_DURATION, maxDuration) })}
      />
      {clip && (
        <>
          <Field
            label="Trim in"
            value={clip.trimStart}
            min={0}
            max={clip.mediaDuration - MIN_DURATION}
            onChange={setTrimStart}
          />
          <span className="text-gray-500">media {clip.mediaDuration.toFixed(1)} s</span>
        </>
      )}
    </div>
  );
};

const Field = ({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
}) => (
  <label className="flex items-center gap-1">
    {label}
    <input
      type="number"
      min={min}
      max={max}
      step={0.1}
      className="w-20 rounded border px-2 py-1"
      value={Number(value.toFixed(2))}
      onChange={(event) => onChange(Number(event.target.value))}
    />
    s
  </label>
);

export default TimeWindow;
