export type Animation = {
  effect: string;
  duration: number;
};

declare module "fabric" {
  interface FabricObject {
    id: string;
    start: number;
    duration: number;
    entrance?: Animation;
    exit?: Animation;
    fontURL?: string;
  }

  interface SerializedObjectProps {
    id: string;
    start: number;
    duration: number;
    entrance?: Animation;
    exit?: Animation;
    fontURL?: string;
  }
}
