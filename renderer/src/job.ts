import { readFile } from "node:fs/promises";
import path from "node:path";
import { registerFont } from "canvas";
import { renderDocument } from "./render.ts";
import { Font } from "./fonts.ts";

const workDir = process.argv[2];
const { document, width, height, fps, fonts } = JSON.parse(await readFile(path.join(workDir, "job.json"), "utf8"));

for (const font of fonts as Font[]) registerFont(font.file, { family: font.family });

await renderDocument(document, {
  width,
  height,
  fps,
  workDir,
  onProgress: (fraction) => console.log(`progress ${fraction}`),
});
