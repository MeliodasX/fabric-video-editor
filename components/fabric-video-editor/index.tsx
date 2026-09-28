"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Canvas, FabricImage } from "fabric";
import { addSVGViaPath, addSVGViaString, addSVGViaURL } from "@/lib/fabric/svg";
import { addImageFromFile, addImageFromURL, replaceImageSource } from "@/lib/fabric/images";
import { addText, setActiveTextFont, updateActiveText } from "@/lib/fabric/text";
import { SVG_STRING } from "@/components/fabric-video-editor/svg-string";

const SAMPLE_IMAGE_URL = "https://picsum.photos/id/1015/1200/800";

const FONTS = [{ family: "Arial" }, { family: "Georgia" }, { family: "Pacifico", url: "/fonts/Pacifico-Regular.ttf" }];

const FabricVideoEditor = () => {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const c = new Canvas("canvas", {
      width: 960,
      height: 540,
      preserveObjectStacking: true,
    });
    setCanvas(c);

    return () => {
      c.dispose();
    };
  }, []);

  const onUploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!canvas || !file) return;
    await addImageFromFile(canvas, file);
  };

  const onReplaceImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!canvas || !file) return;

    const active = canvas.getActiveObject();
    if (!(active instanceof FabricImage)) return;

    await replaceImageSource(active, URL.createObjectURL(file));
  };

  const onFontChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    if (!canvas) return;
    const font = FONTS.find((it) => it.family === event.target.value);
    if (!font) return;
    await setActiveTextFont(canvas, font.family, font.url);
  };

  const onColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!canvas) return;
    updateActiveText(canvas, { fill: event.target.value });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="h-[540px] w-[960px] border-2 border-black">
        <canvas id="canvas" />
      </div>

      <Toolbar title="Shapes">
        <Button onClick={() => canvas && addSVGViaPath(canvas)}>Add SVG via Path</Button>
        <Button onClick={() => canvas && addSVGViaString(canvas, SVG_STRING)}>Add SVG via String</Button>
        <Button onClick={() => canvas && addSVGViaURL(canvas, "/assets/accelerate.svg")}>Add SVG via URL</Button>
      </Toolbar>

      <Toolbar title="Images">
        <Button onClick={() => canvas && addImageFromURL(canvas, SAMPLE_IMAGE_URL)}>Add image from URL</Button>
        <Button onClick={() => uploadInputRef.current?.click()}>Upload image</Button>
        <Button onClick={() => replaceInputRef.current?.click()}>Replace selected image</Button>
        <span className="self-center text-sm text-gray-500">Double-click an image to crop it.</span>
        <input ref={uploadInputRef} type="file" accept="image/*" hidden onChange={onUploadImage} />
        <input ref={replaceInputRef} type="file" accept="image/*" hidden onChange={onReplaceImage} />
      </Toolbar>

      <Toolbar title="Text">
        <Button onClick={() => canvas && addText(canvas)}>Add text</Button>
        <Button onClick={() => canvas && updateActiveText(canvas, { fontWeight: "bold" })}>Bold</Button>
        <Button onClick={() => canvas && updateActiveText(canvas, { fontStyle: "italic" })}>Italic</Button>
        <Button onClick={() => canvas && updateActiveText(canvas, { underline: true })}>Underline</Button>
        <Button onClick={() => canvas && updateActiveText(canvas, { fontSize: 72 })}>Bigger</Button>
        <Button onClick={() => canvas && updateActiveText(canvas, { fontSize: 32 })}>Smaller</Button>
        <select className="rounded border px-2" defaultValue="Arial" onChange={onFontChange}>
          {FONTS.map((font) => (
            <option key={font.family} value={font.family}>
              {font.family}
            </option>
          ))}
        </select>
        <input type="color" defaultValue="#111111" onChange={onColorChange} />
      </Toolbar>
    </div>
  );
};

const Toolbar = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-row flex-wrap items-center gap-2">
    <span className="w-16 text-sm font-semibold">{title}</span>
    {children}
  </div>
);

const Button = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button className="rounded border border-gray-400 px-3 py-1 text-sm hover:bg-gray-100" onClick={onClick}>
    {children}
  </button>
);

export default FabricVideoEditor;
