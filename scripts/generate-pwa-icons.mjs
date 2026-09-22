#!/usr/bin/env node
/**
 * Génère les icônes PNG de la PWA STOCK-HUB à partir des SVG maîtres
 * de public/icons/, via sharp (déjà installé avec Next.js).
 *
 * Les PNG produits sont commités : ce script n'a besoin d'être relancé
 * que si les SVG maîtres changent.
 *
 * Usage : cd frontend-nextjs && node scripts/generate-pwa-icons.mjs
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const ICONS_DIR = path.join(ROOT, "public", "icons");
const APP_DIR = path.join(ROOT, "app");

/** [fichier SVG maître, préfixe de sortie, tailles PNG à produire] */
const PLAN = [
  { svg: "icon.svg", prefix: "icon", sizes: [192, 512] },
  { svg: "icon-maskable.svg", prefix: "icon-maskable", sizes: [192, 512] },
  { svg: "icon-compact.svg", prefix: "icon", sizes: [16, 32, 96] },
];

for (const { svg, prefix, sizes } of PLAN) {
  const source = await readFile(path.join(ICONS_DIR, svg));
  for (const size of sizes) {
    const out = path.join(ICONS_DIR, `${prefix}-${size}x${size}.png`);
    await sharp(source, { density: 300 }).resize(size, size).png().toFile(out);
    console.log(`✓ ${path.relative(ROOT, out)}`);
  }
}

// Favicon applicatif Next.js : app/icon.png remplace le favicon.ico par défaut.
const compact = await readFile(path.join(ICONS_DIR, "icon-compact.svg"));
const favicon = path.join(APP_DIR, "icon.png");
await sharp(compact, { density: 300 }).resize(64, 64).png().toFile(favicon);
console.log(`✓ ${path.relative(ROOT, favicon)}`);

console.log("\nIcônes PWA STOCK-HUB générées.");
