import { resolveMedia } from "./media.ts";
import { FADE_CURVE } from "@/lib/fabric/fade";

export type AudioSource = {
  file: string;
  start: number;
  trimStart: number;
  duration: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
};

export type SerializedObject = Record<string, unknown> & {
  type: string;
  src?: string;
  start: number;
  duration: number;
  trimStart?: number;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
  muted?: boolean;
};

export const collectAudio = (objects: SerializedObject[]): AudioSource[] =>
  objects
    .filter((object) => (object.type === "AudioTrack" || object.type === "VideoClip") && object.src && !object.muted)
    .map((object) => ({
      file: resolveMedia(object.src as string),
      start: object.start,
      trimStart: object.trimStart ?? 0,
      duration: object.duration,
      volume: object.volume ?? 1,
      fadeIn: object.fadeIn ?? 0,
      fadeOut: object.fadeOut ?? 0,
    }));

export const audioArguments = (sources: AudioSource[], firstInput: number) => {
  const inputs = sources.flatMap((source) => [
    "-ss",
    String(source.trimStart),
    "-t",
    String(source.duration),
    "-i",
    source.file,
  ]);

  if (sources.length === 0) return { inputs, filter: [] as string[], map: [] as string[] };

  const chains = sources.map((source, i) => {
    const delay = Math.round(source.start * 1000);
    const filters = [
      source.fadeIn > 0 && `afade=t=in:st=0:d=${source.fadeIn}:curve=${FADE_CURVE}`,
      source.fadeOut > 0 &&
        `afade=t=out:st=${source.duration - source.fadeOut}:d=${source.fadeOut}:curve=${FADE_CURVE}`,
      `volume=${source.volume}`,
      `adelay=${delay}|${delay}`,
    ].filter(Boolean);
    return `[${firstInput + i}:a]${filters.join(",")}[a${i}]`;
  });
  const labels = sources.map((_, i) => `[a${i}]`).join("");
  const mix = `${labels}amix=inputs=${sources.length}:normalize=0:dropout_transition=0[aout]`;

  return {
    inputs,
    filter: ["-filter_complex", [...chains, mix].join(";")],
    map: ["-map", "[aout]", "-c:a", "aac"],
  };
};
