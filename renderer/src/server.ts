import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import express from "express";
import { collectFonts, fetchFont, windowsFontEnvironment } from "./fonts.ts";

const PORT = Number(process.env.PORT ?? 4000);
const OUTPUT_ROOT = path.resolve(process.env.OUTPUT_ROOT ?? "output");
const MAX_WORKERS = Number(process.env.MAX_WORKERS ?? 1);

type Job = {
  status: "queued" | "rendering" | "done" | "failed";
  progress: number;
  file?: string;
  error?: string;
};

type Request = {
  document: { objects: Array<{ fontFamily?: string; fontURL?: string }> };
  width?: number;
  height?: number;
  fps?: number;
};

const jobs = new Map<string, Job>();

const waiting: Array<() => void> = [];
let active = 0;

const pump = () => {
  while (active < MAX_WORKERS && waiting.length > 0) {
    active += 1;
    waiting.shift()?.();
  }
};

const acquire = () =>
  new Promise<void>((resolve) => {
    waiting.push(resolve);
    pump();
  });

const release = () => {
  active -= 1;
  pump();
};

const runWorker = (workDir: string, env: NodeJS.ProcessEnv, onProgress: (fraction: number) => void) =>
  new Promise<void>((resolve, reject) => {
    const worker = spawn(process.execPath, ["--import", "tsx", "--import", "./src/alias.ts", "src/job.ts", workDir], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    worker.stdout.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split("\n")) {
        const [key, value] = line.trim().split(" ");
        if (key === "progress") onProgress(Number(value));
      }
    });
    worker.stderr.on("data", (chunk: Buffer) => (stderr += chunk));
    worker.on("error", reject);
    worker.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim().split("\n").slice(-6).join("\n")));
    });
  });

const render = async (id: string, job: Job, { document, width = 960, height = 540, fps = 30 }: Request) => {
  const workDir = path.join(OUTPUT_ROOT, id);
  await mkdir(workDir, { recursive: true });

  const fonts = await Promise.all(collectFonts(document.objects).map(fetchFont));
  await writeFile(path.join(workDir, "job.json"), JSON.stringify({ document, width, height, fps, fonts }));

  await acquire();
  job.status = "rendering";
  try {
    await runWorker(workDir, await windowsFontEnvironment(fonts), (fraction) => (job.progress = fraction));
  } finally {
    release();
  }

  return path.join(workDir, "output.mp4");
};

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use((_request, response, next) => {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.options("/{*path}", (_request, response) => response.sendStatus(204));

app.post("/render", (request, response) => {
  if (!request.body?.document?.objects) {
    return response.status(400).json({ error: "Send { document } as produced by canvas.toObject()." });
  }

  const id = randomUUID();
  const job: Job = { status: "queued", progress: 0 };
  jobs.set(id, job);

  render(id, job, request.body)
    .then((file) => Object.assign(job, { status: "done", progress: 1, file }))
    .catch((error: Error) => Object.assign(job, { status: "failed", error: error.message }));

  response.status(202).json({ id });
});

app.get("/render/:id", (request, response) => {
  const job = jobs.get(request.params.id);
  if (!job) return response.sendStatus(404);
  response.json({ status: job.status, progress: job.progress, error: job.error });
});

app.get("/render/:id/file", (request, response) => {
  const job = jobs.get(request.params.id);
  if (!job?.file) return response.sendStatus(404);
  response.download(job.file, "export.mp4");
});

app.listen(PORT, () => console.log(`Renderer listening on http://localhost:${PORT}`));
