import { Canvas, FabricObject } from "fabric";
import { getDocumentDuration } from "@/lib/fabric/document";
import { isVisibleAt } from "@/lib/fabric/motion";
import { VideoClip } from "@/lib/fabric/video";
import { AudioTrack } from "@/lib/fabric/audio";
import { createAnimations } from "@/lib/fabric/animations";
import { AudioScheduler, createAudioScheduler } from "@/lib/fabric/scheduler";
import { getAudioContext } from "@/lib/fabric/clock";
import { clamp } from "@/lib/utils";

const DRIFT_TOLERANCE = 0.1;

export const createPlayhead = (canvas: Canvas, onChange?: () => void) => {
  let time = 0;
  let playing = false;
  let frame = 0;
  let frameClock = 0;
  let lastFrame = 0;
  let scheduler: AudioScheduler | null = null;

  const animations = createAnimations(canvas);

  const clips = () => canvas.getObjects().filter((object): object is VideoClip => object instanceof VideoClip);

  const apply = () => {
    const length = getDocumentDuration(canvas);

    for (const object of canvas.getObjects()) {
      object.visible = isVisibleAt(object, time, length);
    }

    for (const clip of clips()) {
      if (playing && clip.visible) {
        clip.video.muted = clip.muted;
        clip.video.volume = clip.volume;
        if (clip.video.paused) clip.video.play().catch(() => {});
        if (Math.abs(clip.video.currentTime - clip.localTime(time)) > DRIFT_TOLERANCE) clip.seek(time);
      } else {
        clip.video.muted = true;
        if (!clip.video.paused) clip.video.pause();
        clip.seek(time);
      }
    }

    animations.seek(time);
    canvas.requestRenderAll();
  };

  const update = () => {
    apply();
    onChange?.();
  };

  const onDocumentChange = () => {
    animations.rebuild();
    apply();
  };

  const pause = () => {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(frame);
    scheduler?.stop();
    update();
  };

  const tick = (now: number) => {
    if (!playing || !scheduler) return;

    const length = getDocumentDuration(canvas);
    frameClock += (now - lastFrame) / 1000;
    lastFrame = now;
    time = Math.min(scheduler.now(), length);

    if (time >= length) return pause();

    update();
    frame = requestAnimationFrame(tick);
  };

  const play = async () => {
    if (playing) return;
    if (time >= getDocumentDuration(canvas)) time = 0;

    await getAudioContext().resume();
    await Promise.all(canvas.getObjects().map((object) => object instanceof AudioTrack && object.buffer));

    scheduler ??= createAudioScheduler(canvas);
    scheduler.start(time);
    playing = true;
    frameClock = time;
    lastFrame = performance.now();
    update();
    frame = requestAnimationFrame(tick);
  };

  const seek = (target: number) => {
    time = clamp(target, 0, getDocumentDuration(canvas));
    if (playing && scheduler) {
      scheduler.start(time);
      frameClock = time;
    }
    update();
  };

  const onRemoved = ({ target }: { target: FabricObject }) => {
    if (target instanceof VideoClip) target.video.pause();
    onDocumentChange();
  };

  canvas.on("object:added", onDocumentChange);
  canvas.on("object:modified", onDocumentChange);
  canvas.on("object:removed", onRemoved);

  return {
    get time() {
      return time;
    },
    get playing() {
      return playing;
    },
    get frameClockDrift() {
      return playing ? time - frameClock : 0;
    },
    play,
    pause,
    toggle: () => (playing ? pause() : play()),
    seek,
    apply,
    dispose: () => {
      pause();
      clips().forEach((clip) => clip.video.pause());
      animations.dispose();
      canvas.off("object:added", onDocumentChange);
      canvas.off("object:modified", onDocumentChange);
      canvas.off("object:removed", onRemoved);
    },
  };
};

export type Playhead = ReturnType<typeof createPlayhead>;
