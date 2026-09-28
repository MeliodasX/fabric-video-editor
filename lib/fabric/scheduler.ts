import { Canvas } from "fabric";
import type WAAClock from "waaclock";
import { AudioTrack } from "@/lib/fabric/audio";
import { getAudioContext, getClock } from "@/lib/fabric/clock";
import { envelope } from "@/lib/fabric/fade";

const LOOKAHEAD = 0.25;
const INTERVAL = 0.1;

type Playing = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

export const createAudioScheduler = (canvas: Canvas) => {
  const context = getAudioContext();
  const clock = getClock();

  let anchorTime = 0;
  let anchorContextTime = 0;
  let event: WAAClock.Event | null = null;
  const playing = new Map<AudioTrack, Playing>();

  const tracks = () => canvas.getObjects().filter((object): object is AudioTrack => object instanceof AudioTrack);

  const now = () => anchorTime + (context.currentTime - anchorContextTime);

  const contextTimeFor = (documentTime: number) => anchorContextTime + (documentTime - anchorTime);

  const startTrack = async (track: AudioTrack, documentTime: number) => {
    const buffer = await track.buffer;
    if (!event || playing.has(track)) return;

    const offset = Math.max(0, documentTime - track.start);
    const remaining = track.duration - offset;
    if (remaining <= 0) return;

    const at = Math.max(contextTimeFor(track.start), context.currentTime);
    const gain = context.createGain();
    gain.gain.setValueCurveAtTime(envelope(track, offset, track.duration), at, remaining);
    gain.connect(context.destination);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.start(at, track.trimStart + offset, remaining);
    source.onended = () => {
      gain.disconnect();
      playing.delete(track);
    };

    playing.set(track, { source, gain });
  };

  const schedule = () => {
    const horizon = now() + LOOKAHEAD;
    for (const track of tracks()) {
      if (playing.has(track)) continue;
      if (track.start <= horizon && track.start + track.duration > now()) {
        startTrack(track, Math.max(track.start, now()));
      }
    }
  };

  const stop = () => {
    event?.clear();
    event = null;
    for (const { source, gain } of playing.values()) {
      source.onended = null;
      source.stop();
      gain.disconnect();
    }
    playing.clear();
  };

  const start = (documentTime: number) => {
    stop();
    anchorTime = documentTime;
    anchorContextTime = context.currentTime;
    event = clock.callbackAtTime(schedule, context.currentTime).repeat(INTERVAL);
  };

  return { start, stop, now };
};

export type AudioScheduler = ReturnType<typeof createAudioScheduler>;
