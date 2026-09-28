const loadedFonts = new Set<string>();

export const loadFont = async (family: string, url: string) => {
  if (loadedFonts.has(family)) return;

  const face = new FontFace(family, `url(${url})`);
  await face.load();
  document.fonts.add(face);

  loadedFonts.add(family);
};
