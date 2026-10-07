import {
  readdir,
  mkdir,
  readFile,
  writeFile,
  copyFile,
  stat,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createHash } from "node:crypto";
const products = JSON.parse(await readFile("content/products.json", "utf8"));
const slots = [
  ...[1, 2, 3].map((i) => ({
    key: `hero/hero-${i}`,
    name: `Hero ${i}`,
    kind: "portrait textile, draped shawl or Kashmir scenery",
  })),
  ...["shawls", "phirans", "suits", "stoles"].map((s) => ({
    key: `collections/${s}`,
    name: `${s} collection`,
    kind: `portrait showing ${s}`,
  })),
  {
    key: "atelier/fabric",
    name: "Atelier textile",
    kind: "wide close-up of woven fabric",
  },
  ...products.flatMap((p) => Object.entries(p.media).map(([color,media])=>({
    key:media.slot, name:`${p.name} — ${color}`, kind:`portrait showing ${p.category} in ${color.toLowerCase()}`
  }))),
];
async function walk(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return (
      await Promise.all(
        entries.map((e) =>
          e.isDirectory()
            ? walk(path.join(dir, e.name))
            : path.join(dir, e.name),
        ),
      )
    ).flat();
  } catch {
    return [];
  }
}
const files = (await walk("images")).filter((f) =>
  /\.(jpe?g|png|webp|avif)$/i.test(f),
);
const manifest = {};
const missing = [];
await mkdir("public/img", { recursive: true });
await mkdir("public/brand", { recursive: true });
for (const file of files) {
  const key = file.replace(/^images\//, "").replace(/\.[^.]+$/, "");
  if (key.startsWith("bl_") || key.startsWith("archive/")) continue;
  try {
    const meta = await sharp(file).metadata();
    const revision = createHash("sha256").update(await readFile(file)).digest("hex").slice(0, 12);
    const variants = [];
    for (const width of (key.startsWith("hero/") ? [240, 480, 800, 1200, 1800] : [480, 800, 1200, 1800])) {
      const base = `img/${key}-${width}`;
      await mkdir(path.dirname(`public/${base}`), { recursive: true });
      const sourceTime = (await stat(file)).mtimeMs;
      for (const format of ["webp", "avif"]) {
        const dest = `public/${base}.${format}`;
        const fresh = await stat(dest)
          .then((s) => s.mtimeMs >= sourceTime)
          .catch(() => false);
        if (!fresh)
          await sharp(file)
            .rotate()
            .resize({ width, withoutEnlargement: false })
            .toFormat(format, { quality: format === "avif" ? 48 : 78 })
            .toFile(dest);
      }
      variants.push({ width, webp: `/${base}.webp?v=${revision}`, avif: `/${base}.avif?v=${revision}` });
    }
    manifest[key] = { width: meta.width, height: meta.height, variants };
  } catch (err) {
    console.warn(`Skipped invalid photo ${file}: ${err.message}`);
  }
}
for (const slot of slots) if (!manifest[slot.key]) missing.push(slot);
await writeFile(
  "content/images.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
await mkdir("test-results", { recursive: true });
await writeFile("test-results/missing-images.json", JSON.stringify(missing, null, 2) + "\n");
await copyFile("images/bl_withoutBg.png", "public/brand/bl_withoutBg.png");
await copyFile("images/bl_withBg.png", "public/brand/bl_withBg.png");
await sharp("images/bl_withoutBg.png")
  .resize({ width: 256 })
  .webp({ lossless: true })
  .toFile("public/brand/logo-display.webp");
for (const [name, size] of [
  ["favicon", 64],
  ["icon-192", 192],
  ["icon-512", 512],
  ["apple-touch-icon", 180],
])
  await sharp("images/bl_withBg.png")
    .resize(size, size, { fit: "contain", background: "#f4eee2" })
    .png()
    .toFile(`public/${name}.png`);
await sharp("images/bl_withBg.png")
  .resize(1200, 630, { fit: "contain", background: "#f4eee2" })
  .png()
  .toFile("public/og.png");
console.log(
  `Images: ${slots.length - missing.length} filled, ${missing.length} missing. Original logos preserved.`,
);
