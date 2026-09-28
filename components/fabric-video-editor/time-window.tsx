"use client";

import { Canvas, FabricObject } from "fabric";
import { AudioTrack } from "@/lib/fabric/audio";
import { VideoClip } from "@/lib/fabric/video";
import { Animation, DEFAULT_ANIMATION_DURATION } from "@/lib/fabric/animations";
import { EFFECTS } from "@/lib/fabric/effects";
import { isMedia, Media, objectType } from "@/lib/fabric/document";
import { clamp } from "@/lib/utils";

type Props = {
  canvas: Canvas;
  object: FabricObject;
};

type Editable = Partial<
  Pick<Media, "start" | "duration" | "trimStart" | "entrance" | "exit"> &
    Pick<AudioTrack, "volume" | "fadeIn" | "fadeOut"> &
    Pick<VideoClip, "muted">
>;

const MIN_DURATION = 0.1;

const TimeWindow = ({ canvas, object }: Props) => {
  "use no memo";

  const media = isMedia(object) ? object : null;
  const track = object instanceof AudioTrack ? object : null;
  const sound = track ?? (object instanceof VideoClip ? object : null);
  const maxDuration = media ? media.mediaDuration - media.trimStart : Infinity;

  const update = (props: Editable) => {
    object.set(props);
    canvas.fire("object:modified", { target: object });
  };

  const setTrimStart = (value: number) => {
    if (!media) return;
    const trimStart = clamp(value, 0, media.mediaDuration - MIN_DURATION);
    update({ trimStart, duration: Math.min(media.duration, media.mediaDuration - trimStart) });
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-row flex-wrap items-center gap-2">
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
        {media && (
          <>
            <Field
              label="Trim in"
              value={media.trimStart}
              min={0}
              max={media.mediaDuration - MIN_DURATION}
              onChange={setTrimStart}
            />
            <span className="text-gray-500">media {media.mediaDuration.toFixed(1)} s</span>
          </>
        )}
      </div>

      {sound && (
        <div className="flex flex-row flex-wrap items-center gap-2">
          <span className="w-16 font-semibold">Sound</span>
          <label className="flex items-center gap-1">
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sound.volume}
              onChange={(event) => update({ volume: Number(event.target.value) })}
            />
          </label>
          {sound instanceof VideoClip && (
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={sound.muted}
                onChange={(event) => update({ muted: event.target.checked })}
              />
              Mute
            </label>
          )}
          {track && (
            <>
              <Field
                label="Fade in"
                value={track.fadeIn}
                min={0}
                max={track.duration}
                onChange={(value) => update({ fadeIn: clamp(value, 0, track.duration) })}
              />
              <Field
                label="Fade out"
                value={track.fadeOut}
                min={0}
                max={track.duration}
                onChange={(value) => update({ fadeOut: clamp(value, 0, track.duration) })}
              />
            </>
          )}
        </div>
      )}

      <div className="flex flex-row flex-wrap items-center gap-2">
        <span className="w-16 font-semibold">Animate</span>
        <AnimationPicker
          label="In"
          value={object.entrance}
          max={object.duration}
          onChange={(entrance) => update({ entrance })}
        />
        <AnimationPicker label="Out" value={object.exit} max={object.duration} onChange={(exit) => update({ exit })} />
      </div>
    </div>
  );
};

const AnimationPicker = ({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: Animation | undefined;
  max: number;
  onChange: (value: Animation | undefined) => void;
}) => (
  <>
    <label className="flex items-center gap-1">
      {label}
      <select
        className="rounded border px-2 py-1"
        value={value?.effect ?? ""}
        onChange={(event) => {
          const effect = event.target.value;
          onChange(effect ? { effect, duration: value?.duration ?? DEFAULT_ANIMATION_DURATION } : undefined);
        }}
      >
        <option value="">None</option>
        {Object.entries(EFFECTS).map(([name, effect]) => (
          <option key={name} value={name}>
            {effect.label}
          </option>
        ))}
      </select>
    </label>
    {value && (
      <Field
        label="for"
        value={value.duration}
        min={MIN_DURATION}
        max={max}
        onChange={(duration) => onChange({ ...value, duration: clamp(duration, MIN_DURATION, max) })}
      />
    )}
  </>
);

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
