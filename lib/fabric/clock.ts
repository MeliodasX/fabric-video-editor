import WAAClock from "waaclock";

let context: AudioContext | null = null;
let clock: WAAClock | null = null;

export const getAudioContext = () => {
  if (!context) context = new AudioContext();
  return context;
};

export const getClock = () => {
  if (!clock) {
    clock = new WAAClock(getAudioContext(), { toleranceEarly: 0.05, toleranceLate: 0.1 });
    clock.start();
  }
  return clock;
};
