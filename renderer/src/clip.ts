import path from "node:path";
import { loadImage } from "canvas";
import { classRegistry, FabricImage, ImageProps, SerializedImageProps, TOptions } from "fabric/node";
import { clamp, omit } from "@/lib/utils";

export type FrameSource = {
  dir: string;
  count: number;
  fps: number;
};

const sources = new Map<string, FrameSource>();

export const registerFrames = (id: string, source: FrameSource) => sources.set(id, source);

export const clearFrames = () => sources.clear();

const frameFile = (source: FrameSource, index: number) =>
  path.join(source.dir, `${String(index).padStart(6, "0")}.png`);

export class RenderVideoClip extends FabricImage {
  static type = "VideoClip";

  declare trimStart: number;

  private source!: FrameSource;
  private index = -1;
  private cache = new Map<number, Awaited<ReturnType<typeof loadImage>>>();

  async showFrame(time: number) {
    const index = clamp(Math.floor((time - this.start) * this.source.fps), 0, this.source.count - 1);
    if (index === this.index) return;

    let image = this.cache.get(index);
    if (!image) {
      image = await loadImage(frameFile(this.source, index));
      this.cache.set(index, image);
    }

    this.setElement(image as unknown as HTMLImageElement, { width: this.width, height: this.height });
    this.index = index;
  }

  static async fromObject<T extends TOptions<SerializedImageProps>>(object: T): Promise<RenderVideoClip> {
    const source = sources.get(object.id as string);
    if (!source) throw new Error(`No frames extracted for clip ${object.id}`);

    const first = await loadImage(frameFile(source, 0));
    const options = omit(object, "src", "type", "filters", "resizeFilter", "crossOrigin");
    const clip = new this(first as unknown as HTMLImageElement, options as Partial<ImageProps>);
    clip.source = source;
    clip.index = 0;
    return clip;
  }
}

classRegistry.setClass(RenderVideoClip);
