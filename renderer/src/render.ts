import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { StaticCanvas } from "fabric/node";
import "./clip.ts";
import { clearFrames, registerFrames, RenderVideoClip } from "./clip.ts";
import { audioArguments, collectAudio, SerializedObject } from "./audio.ts";
import { extractFrames, ffmpeg, resolveMedia } from "./media.ts";
import { buildTimeline, getLength, isVisibleAt } from "@/lib/fabric/motion";

export type RenderOptions = {
  width: number;
  height: number;
  fps: number;
  workDir: string;
  onProgress?: (fraction: number) => void;
};

type Document = { objects: Array<SerializedObject & { id: string }> };

export const renderDocument = async (document: Document, options: RenderOptions) => {
  const { width, height, fps, workDir, onProgress } = options;
  const visual = document.objects.filter((object) => object.type !== "AudioTrack");
  const audio = collectAudio(document.objects);
  const output = path.join(workDir, "output.mp4");

  await mkdir(workDir, { recursive: true });
  clearFrames();

  for (const object of visual) {
    if (object.type !== "VideoClip") continue;
    const dir = path.join(workDir, `frames-${object.id}`);
    const count = await extractFrames(resolveMedia(object.src ?? ""), object.trimStart ?? 0, object.duration, fps, dir);
    registerFrames(object.id, { dir, count, fps });
  }

  const canvas = new StaticCanvas(undefined, { width, height });
  await canvas.loadFromJSON({ ...document, objects: visual });
  canvas.backgroundColor ||= "#ffffff";

  const objects = canvas.getObjects();
  const clips = objects.filter((object): object is RenderVideoClip => object instanceof RenderVideoClip);
  const length = Math.max(getLength(objects), ...audio.map((source) => source.start + source.duration));
  const total = Math.max(1, Math.round(length * fps));
  const timeline = buildTimeline(objects, { width, height });

  const sound = audioArguments(audio, 1);
  const encoder = spawn(
    ffmpeg,
    [
      "-y",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "bgra",
      "-s",
      `${width}x${height}`,
      "-r",
      String(fps),
      "-i",
      "pipe:0",
      ...sound.inputs,
      ...sound.filter,
      "-map",
      "0:v",
      ...sound.map,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-t",
      String(length),
      "-movflags",
      "+faststart",
      output,
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  );

  let stderr = "";
  encoder.stderr.on("data", (chunk) => (stderr += chunk));
  const finished = new Promise<void>((resolve, reject) => {
    encoder.on("error", reject);
    encoder.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(stderr.split("\n").slice(-8).join("\n"))),
    );
  });

  const write = (buffer: Buffer) =>
    new Promise<void>((resolve) => {
      if (encoder.stdin.write(buffer)) resolve();
      else encoder.stdin.once("drain", resolve);
    });

  for (let frame = 0; frame < total; frame += 1) {
    const time = frame / fps;

    for (const object of objects) object.visible = isVisibleAt(object, time, length);
    for (const clip of clips) if (clip.visible) await clip.showFrame(time);
    timeline.time(time);

    canvas.renderAll();
    await write(canvas.getNodeCanvas().toBuffer("raw"));
    onProgress?.((frame + 1) / total);
  }

  encoder.stdin.end();
  await finished;

  timeline.kill();
  canvas.dispose();
  await Promise.all(clips.map((clip) => rm(path.join(workDir, `frames-${clip.id}`), { recursive: true, force: true })));

  return output;
};
