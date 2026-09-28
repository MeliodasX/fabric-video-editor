import { Canvas, loadSVGFromString, loadSVGFromURL, Path, util } from "fabric";

type LoadedSVG = Awaited<ReturnType<typeof loadSVGFromString>>;

export const PENTAGON_PATH = "M 1.434 208 L 121.754 416 L 377.754 416 L 497.434 208 L 247.594 0 z";

const addLoadedSVGToCanvas = (canvas: Canvas, loadedSVG: LoadedSVG) => {
  const sanitizedSVGObjects = loadedSVG.objects.filter((it) => it !== null);
  const svg = util.groupSVGElements(sanitizedSVGObjects, loadedSVG.options);

  svg.set({
    scaleX: 1,
    scaleY: 1,
    centeredScaling: true,
    fill: "#ff0055",
  });

  canvas.add(svg);
  canvas.centerObject(svg);
  canvas.setActiveObject(svg);
  canvas.requestRenderAll();
};

export const addSVGViaPath = (canvas: Canvas, path: string = PENTAGON_PATH) => {
  const svg = new Path(path, {
    fill: "#CBCBCB",
    strokeUniform: true,
    paintFirst: "stroke",
  });

  canvas.add(svg);
  canvas.centerObject(svg);
  canvas.setActiveObject(svg);
  canvas.requestRenderAll();
};

export const addSVGViaString = async (canvas: Canvas, svgString: string) => {
  const loadedSVG = await loadSVGFromString(svgString);
  if (!loadedSVG || loadedSVG.objects.length === 0) return;
  addLoadedSVGToCanvas(canvas, loadedSVG);
};

export const addSVGViaURL = async (canvas: Canvas, url: string) => {
  const loadedSVG = await loadSVGFromURL(url);
  if (!loadedSVG || loadedSVG.objects.length === 0) return;
  addLoadedSVGToCanvas(canvas, loadedSVG);
};
