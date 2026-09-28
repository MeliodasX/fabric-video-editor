import { Canvas, classRegistry, FabricImage, ImageProps, SerializedImageProps, TOptions } from "fabric";
import { addToCanvas, DOCUMENT_PROPERTIES } from "@/lib/fabric/document";
import { fitToCanvas, prepareImage } from "@/lib/fabric/images";
import { clamp, omit } from "@/lib/utils";

export const loadVideoElement = (src: string) =>
  new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => {
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      resolve(video);
    };
    video.onerror = () => reject(new Error(`Could not load video ${src}`));
    video.src = src;
  });

export class VideoClip extends FabricImage {
  static type = "VideoClip";
  static customProperties = [...DOCUMENT_PROPERTIES, "trimStart"];
  static ownDefaults = { objectCaching: false, srcFromAttribute: true, trimStart: 0 };

  static getDefaults() {
    return { ...super.getDefaults(), ...VideoClip.ownDefaults };
  }

  declare trimStart: number;

  constructor(element: HTMLVideoElement, options?: Partial<ImageProps> & { trimStart?: number }) {
    super(element, { ...VideoClip.ownDefaults, ...options });
    this.video.addEventListener("seeked", () => this.canvas?.requestRenderAll());
  }

  get video() {
    return this.getElement() as HTMLVideoElement;
  }

  get mediaDuration() {
    return this.video.duration;
  }

  localTime(time: number) {
    return clamp(this.trimStart + (time - this.start), this.trimStart, this.trimStart + this.duration);
  }

  seek(time: number) {
    const local = this.localTime(time);
    if (Math.abs(this.video.currentTime - local) > 0.001) this.video.currentTime = local;
  }

  static async fromObject<T extends TOptions<SerializedImageProps>>(object: T): Promise<VideoClip> {
    const element = await loadVideoElement(object.src ?? "");
    const options = omit(object, "src", "type", "filters", "resizeFilter", "crossOrigin");
    return new this(element, options as Partial<ImageProps>);
  }
}

classRegistry.setClass(VideoClip);

export const addVideoClip = async (canvas: Canvas, src: string) => {
  const element = await loadVideoElement(src);
  const clip = new VideoClip(element, { duration: element.duration });
  fitToCanvas(clip, canvas);
  prepareImage(clip);
  return addToCanvas(canvas, clip);
};

export const addVideoFromFile = (canvas: Canvas, file: File) => addVideoClip(canvas, URL.createObjectURL(file));
