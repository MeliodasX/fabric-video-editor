import { Canvas, FabricImage } from "fabric";
import { enterCropMode } from "fabric/extensions";

const fitToCanvas = (image: FabricImage, canvas: Canvas) => {
  const scale = Math.min(canvas.width / image.width, canvas.height / image.height, 1);
  image.scale(scale);
};

export const addImageFromURL = async (canvas: Canvas, url: string) => {
  const image = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });

  fitToCanvas(image, canvas);
  image.once("mousedblclick", enterCropMode);

  canvas.add(image);
  canvas.centerObject(image);
  canvas.setActiveObject(image);
  canvas.requestRenderAll();

  return image;
};

export const addImageFromFile = async (canvas: Canvas, file: File) => {
  return addImageFromURL(canvas, URL.createObjectURL(file));
};

export const replaceImageSource = async (image: FabricImage, url: string) => {
  await image.setSrc(url, { crossOrigin: "anonymous" });
  image.setCoords();
  image.canvas?.requestRenderAll();
};
