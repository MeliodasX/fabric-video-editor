import { Canvas, FabricImage } from "fabric";
import { enterCropMode } from "fabric/extensions";
import { addToCanvas } from "@/lib/fabric/document";

export const fitToCanvas = (image: FabricImage, canvas: Canvas) => {
  image.scale(Math.min(canvas.width / image.width, canvas.height / image.height, 1));
};

export const prepareImage = (image: FabricImage) => {
  image.once("mousedblclick", enterCropMode);
};

export const addImageFromURL = async (canvas: Canvas, url: string) => {
  const image = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
  fitToCanvas(image, canvas);
  prepareImage(image);
  return addToCanvas(canvas, image);
};

export const addImageFromFile = (canvas: Canvas, file: File) => addImageFromURL(canvas, URL.createObjectURL(file));

export const replaceImageSource = async (image: FabricImage, url: string) => {
  await image.setSrc(url, { crossOrigin: "anonymous" });
  image.setCoords();
  image.canvas?.fire("object:modified", { target: image });
  image.canvas?.requestRenderAll();
};
