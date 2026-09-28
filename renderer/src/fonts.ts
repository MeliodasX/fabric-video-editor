import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveMedia } from "./media.ts";

export type Font = { family: string; file: string };

const FONT_CACHE = path.resolve("fonts-cache");

type TextObject = { fontFamily?: string; fontURL?: string };

export const collectFonts = (objects: TextObject[]) => {
  const fonts = new Map<string, string>();
  for (const { fontFamily, fontURL } of objects) {
    if (fontFamily && fontURL) fonts.set(fontFamily, fontURL);
  }
  return [...fonts].map(([family, url]) => ({ family, url }));
};

const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );

export const fetchFont = async ({ family, url }: { family: string; url: string }): Promise<Font> => {
  const source = resolveMedia(url);
  if (!/^https?:\/\//.test(source)) return { family, file: source };

  const extension = path.extname(new URL(source).pathname) || ".ttf";
  const file = path.join(FONT_CACHE, createHash("sha1").update(source).digest("hex") + extension);
  if (!(await exists(file))) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Could not download font ${family} from ${source}`);
    await mkdir(FONT_CACHE, { recursive: true });
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
  }
  return { family, file };
};

export const windowsFontEnvironment = async (fonts: Font[]) => {
  if (process.platform !== "win32") return {};

  const dir = await mkdtemp(path.join(tmpdir(), "fontconfig-"));
  const directories = [...new Set(fonts.map((font) => path.dirname(font.file))), "C:/Windows/Fonts"];
  const posix = (file: string) => file.replaceAll("\\", "/");
  const config = path.join(dir, "fonts.conf");
  await writeFile(
    config,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
${directories.map((directory) => `  <dir>${posix(directory)}</dir>`).join("\n")}
  <cachedir>${posix(path.join(dir, "cache"))}</cachedir>
</fontconfig>
`,
  );
  return { PANGOCAIRO_BACKEND: "fontconfig", FONTCONFIG_FILE: config };
};
