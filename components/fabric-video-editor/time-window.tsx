"use client";

import { Canvas, FabricObject } from "fabric";
import { objectType } from "@/lib/fabric/document";

type Props = {
  canvas: Canvas;
  object: FabricObject;
};

const MIN_DURATION = 0.1;

const TimeWindow = ({ canvas, object }: Props) => {
  "use no memo";

  const update = (props: Partial<Pick<FabricObject, "start" | "duration">>) => {
    object.set(props);
    canvas.fire("object:modified", { target: object });
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
        onChange={(value) => update({ duration: Math.max(MIN_DURATION, value) })}
      />
    </div>
  );
};

const Field = ({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) => (
  <label className="flex items-center gap-1">
    {label}
    <input
      type="number"
      min={min}
      step={0.1}
      className="w-20 rounded border px-2 py-1"
      value={Number(value.toFixed(2))}
      onChange={(event) => onChange(Number(event.target.value))}
    />
    s
  </label>
);

export default TimeWindow;
