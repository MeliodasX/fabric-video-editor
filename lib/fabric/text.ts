import { Canvas, IText } from "fabric";
import { loadFont } from "@/lib/fabric/fonts";
import { addToCanvas } from "@/lib/fabric/document";

export const DEFAULT_FONT = "Arial";

export const addText = (canvas: Canvas, text = "Double-click to edit") => {
  const textObject = new IText(text, { fontFamily: DEFAULT_FONT, fontSize: 48, fill: "#111111" });
  return addToCanvas(canvas, textObject);
};

export type TextProps = Partial<
  Pick<IText, "fontSize" | "fontWeight" | "fontStyle" | "underline" | "textAlign" | "fill" | "fontFamily">
>;

export const updateActiveText = (canvas: Canvas, props: TextProps) => {
  const active = canvas.getActiveObject();
  if (!(active instanceof IText)) return;

  active.set(props);
  active.initDimensions();
  active.setCoords();
  canvas.fire("object:modified", { target: active });
  canvas.requestRenderAll();
};

export const setActiveTextFont = async (canvas: Canvas, family: string, url?: string) => {
  if (url) await loadFont(family, url);
  updateActiveText(canvas, { fontFamily: family });
};
