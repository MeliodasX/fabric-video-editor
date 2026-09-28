"use client";

import { ChangeEvent, useEffect, useReducer, useRef, useState } from "react";
import { Canvas, FabricImage, FabricObject, IText } from "fabric";
import { addSVGViaPath, addSVGViaString, addSVGViaURL } from "@/lib/fabric/svg";
import { addImageFromFile, addImageFromURL, replaceImageSource } from "@/lib/fabric/images";
import { addText, setActiveTextFont, updateActiveText } from "@/lib/fabric/text";
import { addVideoClip, addVideoFromFile } from "@/lib/fabric/video";
import {
  attachDocument,
  getDocumentDuration,
  readFromStorage,
  registerDocumentProperties,
  saveToStorage,
} from "@/lib/fabric/document";
import { createHistory, History } from "@/lib/fabric/history";
import { createPlayhead, Playhead } from "@/lib/fabric/playhead";
import { SVG_STRING } from "@/components/fabric-video-editor/svg-string";
import TimeWindow from "@/components/fabric-video-editor/time-window";

const SAMPLE_IMAGE_URL = "https://picsum.photos/id/1015/1200/800";

const SAMPLE_VIDEOS = [
  { label: "Add counter clip (6 s)", src: "/videos/counter-6s.mp4" },
  { label: "Add tinted clip (8 s)", src: "/videos/counter-8s-tinted.mp4" },
];

const FONTS = [{ family: "Arial" }, { family: "Georgia" }, { family: "Pacifico", url: "/fonts/Pacifico-Regular.ttf" }];

const isTyping = (canvas: Canvas, event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  const active = canvas.getActiveObject();
  return active instanceof IText && active.isEditing;
};

const FabricVideoEditor = () => {
  "use no memo";

  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [playhead, setPlayhead] = useState<Playhead | null>(null);
  const [selected, setSelected] = useState<FabricObject | null>(null);
  const [, refresh] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    registerDocumentProperties();

    const c = new Canvas("canvas", {
      width: 960,
      height: 540,
      preserveObjectStacking: true,
    });
    attachDocument(c);

    const p = createPlayhead(c, refresh);
    const h = createHistory(c, () => {
      p.seek(p.time);
      refresh();
    });

    const onSelection = ({ selected }: { selected: FabricObject[] }) =>
      setSelected(selected.length === 1 ? selected[0] : null);
    c.on("selection:created", onSelection);
    c.on("selection:updated", onSelection);
    c.on("selection:cleared", () => setSelected(null));

    setCanvas(c);
    setHistory(h);
    setPlayhead(p);

    return () => {
      p.dispose();
      h.dispose();
      c.dispose();
    };
  }, []);

  useEffect(() => {
    if (!canvas || !history || !playhead) return;

    const deleteSelection = () => {
      const objects = canvas.getActiveObjects();
      if (objects.length === 0) return;
      history.transaction(() => {
        canvas.discardActiveObject();
        objects.forEach((object) => canvas.remove(object));
      });
      canvas.requestRenderAll();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(canvas, event)) return;
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) history.redo();
        else history.undo();
      } else if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        history.redo();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
      } else if (event.key === " ") {
        event.preventDefault();
        playhead.toggle();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canvas, history, playhead]);

  if (!canvas || !history || !playhead) {
    return <Stage />;
  }

  const replaceImage = (file: File) => {
    const active = canvas.getActiveObject();
    if (active instanceof FabricImage) replaceImageSource(active, URL.createObjectURL(file));
  };

  const onFontChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const font = FONTS.find((it) => it.family === event.target.value);
    if (font) setActiveTextFont(canvas, font.family, font.url);
  };

  const onLoad = () => {
    const json = readFromStorage();
    if (!json) return;
    playhead.pause();
    setSelected(null);
    history.load(json);
  };

  const onNew = () => {
    playhead.pause();
    setSelected(null);
    history.transaction(() => canvas.clear());
    canvas.requestRenderAll();
  };

  const length = getDocumentDuration(canvas);

  return (
    <Stage>
      <Toolbar title="Playback">
        <Button onClick={playhead.toggle} disabled={length === 0}>
          {playhead.playing ? "Pause" : "Play"}
        </Button>
        <input
          type="range"
          className="w-[520px]"
          min={0}
          max={length}
          step={0.01}
          value={playhead.time}
          disabled={length === 0}
          onChange={(event) => playhead.seek(Number(event.target.value))}
        />
        <span className="w-32 text-sm text-gray-500 tabular-nums">
          {playhead.time.toFixed(2)} / {length.toFixed(2)} s
        </span>
      </Toolbar>

      <Toolbar title="Document">
        <Button onClick={() => saveToStorage(canvas)}>Save</Button>
        <Button onClick={onLoad}>Load</Button>
        <Button onClick={onNew}>New</Button>
        <Button onClick={history.undo} disabled={!history.canUndo()}>
          Undo
        </Button>
        <Button onClick={history.redo} disabled={!history.canRedo()}>
          Redo
        </Button>
      </Toolbar>

      {selected && <TimeWindow canvas={canvas} object={selected} />}

      <Toolbar title="Videos">
        {SAMPLE_VIDEOS.map((video) => (
          <Button key={video.src} onClick={() => addVideoClip(canvas, video.src)}>
            {video.label}
          </Button>
        ))}
        <FilePicker accept="video/*" onPick={(file) => addVideoFromFile(canvas, file)}>
          Upload video
        </FilePicker>
      </Toolbar>

      <Toolbar title="Shapes">
        <Button onClick={() => addSVGViaPath(canvas)}>Add SVG via Path</Button>
        <Button onClick={() => addSVGViaString(canvas, SVG_STRING)}>Add SVG via String</Button>
        <Button onClick={() => addSVGViaURL(canvas, "/assets/accelerate.svg")}>Add SVG via URL</Button>
      </Toolbar>

      <Toolbar title="Images">
        <Button onClick={() => addImageFromURL(canvas, SAMPLE_IMAGE_URL)}>Add image from URL</Button>
        <FilePicker accept="image/*" onPick={(file) => addImageFromFile(canvas, file)}>
          Upload image
        </FilePicker>
        <FilePicker accept="image/*" onPick={replaceImage}>
          Replace selected image
        </FilePicker>
        <span className="self-center text-sm text-gray-500">Double-click an image or video to crop it.</span>
      </Toolbar>

      <Toolbar title="Text">
        <Button onClick={() => addText(canvas)}>Add text</Button>
        <Button onClick={() => updateActiveText(canvas, { fontWeight: "bold" })}>Bold</Button>
        <Button onClick={() => updateActiveText(canvas, { fontStyle: "italic" })}>Italic</Button>
        <Button onClick={() => updateActiveText(canvas, { underline: true })}>Underline</Button>
        <Button onClick={() => updateActiveText(canvas, { fontSize: 72 })}>Bigger</Button>
        <Button onClick={() => updateActiveText(canvas, { fontSize: 32 })}>Smaller</Button>
        <select className="rounded border px-2" defaultValue="Arial" onChange={onFontChange}>
          {FONTS.map((font) => (
            <option key={font.family} value={font.family}>
              {font.family}
            </option>
          ))}
        </select>
        <input
          type="color"
          defaultValue="#111111"
          onChange={(event) => updateActiveText(canvas, { fill: event.target.value })}
        />
      </Toolbar>
    </Stage>
  );
};

const Stage = ({ children }: { children?: React.ReactNode }) => (
  <div className="flex flex-col gap-4 p-4">
    <div className="h-[540px] w-[960px] border-2 border-black">
      <canvas id="canvas" />
    </div>
    {children}
  </div>
);

const Toolbar = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-row flex-wrap items-center gap-2">
    <span className="w-16 text-sm font-semibold">{title}</span>
    {children}
  </div>
);

const Button = ({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <button
    className="rounded border border-gray-400 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-40"
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

const FilePicker = ({
  accept,
  onPick,
  children,
}: {
  accept: string;
  onPick: (file: File) => void;
  children: React.ReactNode;
}) => {
  const input = useRef<HTMLInputElement>(null);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onPick(file);
  };

  return (
    <>
      <Button onClick={() => input.current?.click()}>{children}</Button>
      <input ref={input} type="file" accept={accept} hidden onChange={onChange} />
    </>
  );
};

export default FabricVideoEditor;
