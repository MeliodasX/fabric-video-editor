import { Canvas } from "fabric";
import { serializeDocument } from "@/lib/fabric/document";

const RENDERER_URL = process.env.NEXT_PUBLIC_RENDERER_URL ?? "http://localhost:4000";
const FPS = 30;

type Status = { status: "queued" | "rendering" | "done" | "failed"; progress: number; error?: string };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const exportDocument = async (canvas: Canvas, onProgress: (fraction: number) => void) => {
  const response = await fetch(`${RENDERER_URL}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document: JSON.parse(serializeDocument(canvas)),
      width: canvas.width,
      height: canvas.height,
      fps: FPS,
    }),
  });
  if (!response.ok) throw new Error((await response.json()).error ?? response.statusText);
  const { id } = await response.json();

  for (;;) {
    const job: Status = await fetch(`${RENDERER_URL}/render/${id}`).then((it) => it.json());
    if (job.status === "failed") throw new Error(job.error ?? "Render failed");
    onProgress(job.progress);
    if (job.status === "done") return `${RENDERER_URL}/render/${id}/file`;
    await wait(500);
  }
};
