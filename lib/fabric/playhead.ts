import { Canvas, FabricObject } from "fabric";
import { getDocumentDuration } from "@/lib/fabric/document";
import { VideoClip } from "@/lib/fabric/video";
import { clamp } from "@/lib/utils";

const DRIFT_TOLERANCE = 0.1;

export const createPlayhead = (canvas: Canvas, onChange?: () => void) => {
  let time = 0;
  let playing = false;
  let frame = 0;
  let lastTick = 0;

  const clips = () => canvas.getObjects().filter((object): object is VideoClip => object instanceof VideoClip);

  const apply = () => {
    const length = getDocumentDuration(canvas);

    for (const object of canvas.getObjects()) {
      const end = object.start + object.duration;
      object.visible = object.start <= time && (time < end || (time === end && end === length));
    }

    for (const clip of clips()) {
      if (playing && clip.visible) {
        if (clip.video.paused) clip.video.play().catch(() => {});
        if (Math.abs(clip.video.currentTime - clip.localTime(time)) > DRIFT_TOLERANCE) clip.seek(time);
      } else {
        if (!clip.video.paused) clip.video.pause();
        clip.seek(time);
      }
    }

    canvas.requestRenderAll();
  };

  const update = () => {
    apply();
    onChange?.();
  };

  const pause = () => {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(frame);
    update();
  };

  const tick = (now: number) => {
    const length = getDocumentDuration(canvas);
    time = Math.min(time + (now - lastTick) / 1000, length);
    lastTick = now;

    if (time >= length) return pause();

    update();
    frame = requestAnimationFrame(tick);
  };

  const play = () => {
    if (playing) return;
    if (time >= getDocumentDuration(canvas)) time = 0;
    playing = true;
    lastTick = performance.now();
    update();
    frame = requestAnimationFrame(tick);
  };

  const seek = (target: number) => {
    time = clamp(target, 0, getDocumentDuration(canvas));
    update();
  };

  const onRemoved = ({ target }: { target: FabricObject }) => {
    if (target instanceof VideoClip) target.video.pause();
  };

  canvas.on("object:added", apply);
  canvas.on("object:modified", apply);
  canvas.on("object:removed", onRemoved);

  return {
    get time() {
      return time;
    },
    get playing() {
      return playing;
    },
    play,
    pause,
    toggle: () => (playing ? pause() : play()),
    seek,
    apply,
    dispose: () => {
      pause();
      clips().forEach((clip) => clip.video.pause());
      canvas.off("object:added", apply);
      canvas.off("object:modified", apply);
      canvas.off("object:removed", onRemoved);
    },
  };
};

export type Playhead = ReturnType<typeof createPlayhead>;
