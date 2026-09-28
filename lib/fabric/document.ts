import { Canvas, FabricImage, FabricObject } from "fabric";
import { prepareImage } from "@/lib/fabric/images";

declare module "fabric" {
  interface FabricObject {
    id: string;
    start: number;
    duration: number;
  }

  interface SerializedObjectProps {
    id: string;
    start: number;
    duration: number;
  }
}

export const DEFAULT_DURATION = 5;

export const DOCUMENT_PROPERTIES = ["id", "start", "duration", "entrance", "exit"];

export const registerDocumentProperties = () => {
  FabricObject.customProperties = DOCUMENT_PROPERTIES;
  Object.assign(FabricObject.ownDefaults, { start: 0, duration: DEFAULT_DURATION });
};

export const attachDocument = (canvas: Canvas) => {
  canvas.on("object:added", ({ target }) => {
    if (!target.id) target.id = crypto.randomUUID();
  });
};

export const objectType = (object: FabricObject) => (object.constructor as typeof FabricObject).type;

export const addToCanvas = (canvas: Canvas, object: FabricObject) => {
  canvas.centerObject(object);
  canvas.add(object);
  canvas.setActiveObject(object);
  canvas.requestRenderAll();
  return object;
};

type SerializeGuard = () => () => void;

const serializeGuards = new WeakMap<Canvas, SerializeGuard>();

export const setSerializeGuard = (canvas: Canvas, guard: SerializeGuard | null) => {
  if (guard) serializeGuards.set(canvas, guard);
  else serializeGuards.delete(canvas);
};

export const serializeDocument = (canvas: Canvas) => {
  const restore = serializeGuards.get(canvas)?.();
  try {
    return JSON.stringify(canvas.toObject());
  } finally {
    restore?.();
  }
};

export const loadDocument = async (canvas: Canvas, json: string) => {
  await canvas.loadFromJSON(json, (_, instance) => {
    if (instance instanceof FabricImage) prepareImage(instance);
  });
  canvas.requestRenderAll();
};

export const getDocumentDuration = (canvas: Canvas) =>
  canvas.getObjects().reduce((end, object) => Math.max(end, object.start + object.duration), 0);

const STORAGE_KEY = "fabric-video-editor:document";

export const saveToStorage = (canvas: Canvas) => {
  localStorage.setItem(STORAGE_KEY, serializeDocument(canvas));
};

export const readFromStorage = () => localStorage.getItem(STORAGE_KEY);
