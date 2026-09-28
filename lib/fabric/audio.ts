import { Canvas, classRegistry, FabricObject, SerializedObjectProps, TOptions } from "fabric";
import { addToCanvas, DOCUMENT_PROPERTIES } from "@/lib/fabric/document";
import { getAudioContext } from "@/lib/fabric/clock";
import { omit } from "@/lib/utils";

const buffers = new Map<string, Promise<AudioBuffer>>();

export const loadAudioBuffer = (src: string) => {
  let pending = buffers.get(src);
  if (!pending) {
    pending = fetch(src)
      .then((response) => response.arrayBuffer())
      .then((data) => getAudioContext().decodeAudioData(data));
    buffers.set(src, pending);
  }
  return pending;
};

type AudioTrackOptions = Partial<typeof AudioTrack.ownDefaults> & { start?: number; duration?: number };

export class AudioTrack extends FabricObject {
  static type = "AudioTrack";
  static customProperties = [
    ...DOCUMENT_PROPERTIES,
    "src",
    "trimStart",
    "mediaDuration",
    "volume",
    "fadeIn",
    "fadeOut",
  ];
  static ownDefaults = {
    src: "",
    trimStart: 0,
    mediaDuration: 0,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
  };

  static getDefaults() {
    return { ...super.getDefaults(), ...AudioTrack.ownDefaults };
  }

  declare src: string;
  declare trimStart: number;
  declare mediaDuration: number;
  declare volume: number;
  declare fadeIn: number;
  declare fadeOut: number;

  constructor(options: AudioTrackOptions = {}) {
    super();
    this.setOptions({ ...AudioTrack.ownDefaults, ...options });
  }

  get buffer() {
    return loadAudioBuffer(this.src);
  }

  _render() {}

  static async fromObject<T extends TOptions<SerializedObjectProps>>(object: T): Promise<AudioTrack> {
    return new this(omit(object, "type") as AudioTrackOptions);
  }
}

classRegistry.setClass(AudioTrack);

export const addAudioTrack = async (canvas: Canvas, src: string) => {
  const buffer = await loadAudioBuffer(src);
  const track = new AudioTrack({ src, mediaDuration: buffer.duration, duration: buffer.duration });
  return addToCanvas(canvas, track, 0);
};

export const addAudioFromFile = (canvas: Canvas, file: File) => addAudioTrack(canvas, URL.createObjectURL(file));
