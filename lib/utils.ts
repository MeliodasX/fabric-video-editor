export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const omit = <T extends object, K extends keyof T>(object: T, ...keys: K[]): Omit<T, K> => {
  const copy = { ...object };
  keys.forEach((key) => delete copy[key]);
  return copy;
};
