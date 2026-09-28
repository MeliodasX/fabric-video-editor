import { spawn } from "node:child_process";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

export const MEDIA_ROOT = path.resolve(process.env.MEDIA_ROOT ?? "../public");

export const ffmpeg = ffmpegPath as unknown as string;

export const resolveMedia = (src: string) => {
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    throw new Error(`"${src.slice(0, 20)}..." only exists in the browser. Upload the file to the server first.`);
  }
  return path.join(MEDIA_ROOT, src);
};

export const run = (args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(stderr.split("\n").slice(-5).join("\n")))));
  });

export const extractFrames = async (file: string, trimStart: number, duration: number, fps: number, dir: string) => {
  await mkdir(dir, { recursive: true });
  await run([
    "-y",
    "-ss",
    String(trimStart),
    "-t",
    String(duration),
    "-i",
    file,
    "-vf",
    `fps=${fps}`,
    "-start_number",
    "0",
    path.join(dir, "%06d.png"),
  ]);
  const files = await readdir(dir);
  return files.length;
};
