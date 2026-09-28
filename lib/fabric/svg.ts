import { Canvas, loadSVGFromString, loadSVGFromURL, Path, util } from "fabric";
import { addToCanvas } from "@/lib/fabric/document";

type LoadedSVG = Awaited<ReturnType<typeof loadSVGFromString>>;

export const PENTAGON_PATH = "M 1.434 208 L 121.754 416 L 377.754 416 L 497.434 208 L 247.594 0 z";

const addLoadedSVG = (canvas: Canvas, loadedSVG: LoadedSVG) => {
  const elements = loadedSVG.objects.filter((it) => it !== null);
  if (elements.length === 0) return;

  const svg = util.groupSVGElements(elements, loadedSVG.options);
  svg.set({ scaleX: 1, scaleY: 1, centeredScaling: true, fill: "#ff0055" });
  addToCanvas(canvas, svg);
};

export const addSVGViaPath = (canvas: Canvas, path: string = PENTAGON_PATH) => {
  const svg = new Path(path, { fill: "#CBCBCB", strokeUniform: true, paintFirst: "stroke" });
  addToCanvas(canvas, svg);
};

export const addSVGViaString = async (canvas: Canvas, svgString: string) => {
  addLoadedSVG(canvas, await loadSVGFromString(svgString));
};

export const addSVGViaURL = async (canvas: Canvas, url: string) => {
  addLoadedSVG(canvas, await loadSVGFromURL(url));
};
