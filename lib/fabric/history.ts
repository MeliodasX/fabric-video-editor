import { Canvas } from "fabric";
import { loadDocument, serializeDocument } from "@/lib/fabric/document";

const TRACKED_EVENTS = ["object:added", "object:modified", "object:removed"] as const;

export const createHistory = (canvas: Canvas, onChange?: () => void) => {
  let stack = [serializeDocument(canvas)];
  let pointer = 0;
  let paused = false;

  const canUndo = () => pointer > 0;
  const canRedo = () => pointer < stack.length - 1;

  const record = () => {
    if (paused) return;
    stack = [...stack.slice(0, pointer + 1), serializeDocument(canvas)];
    pointer = stack.length - 1;
    onChange?.();
  };

  const loadQuietly = async (json: string) => {
    paused = true;
    await loadDocument(canvas, json);
    paused = false;
  };

  const restore = async (index: number) => {
    await loadQuietly(stack[index]);
    pointer = index;
    onChange?.();
  };

  const transaction = (run: () => void) => {
    paused = true;
    run();
    paused = false;
    record();
  };

  const load = async (json: string) => {
    await loadQuietly(json);
    stack = [serializeDocument(canvas)];
    pointer = 0;
    onChange?.();
  };

  TRACKED_EVENTS.forEach((event) => canvas.on(event, record));

  return {
    undo: () => {
      if (canUndo()) restore(pointer - 1);
    },
    redo: () => {
      if (canRedo()) restore(pointer + 1);
    },
    canUndo,
    canRedo,
    transaction,
    load,
    dispose: () => TRACKED_EVENTS.forEach((event) => canvas.off(event, record)),
  };
};

export type History = ReturnType<typeof createHistory>;
