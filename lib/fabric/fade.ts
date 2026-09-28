import { clamp } from "@/lib/utils";

export const FADE_CURVE = "qsin";

const ENVELOPE_RATE = 60;

export type Fadeable = { volume: number; duration: number; fadeIn: number; fadeOut: number };

const fadeGain = (progress: number) => Math.sin(clamp(progress, 0, 1) * (Math.PI / 2));

export const gainAt = (track: Fadeable, time: number) => {
  const fadeIn = track.fadeIn > 0 ? fadeGain(time / track.fadeIn) : 1;
  const fadeOut = track.fadeOut > 0 ? fadeGain((track.duration - time) / track.fadeOut) : 1;
  return track.volume * fadeIn * fadeOut;
};

export const envelope = (track: Fadeable, from: number, to: number) => {
  const steps = Math.max(2, Math.ceil((to - from) * ENVELOPE_RATE));
  return Float32Array.from({ length: steps }, (_, i) => gainAt(track, from + ((to - from) * i) / (steps - 1)));
};
