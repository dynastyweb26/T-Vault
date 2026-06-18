/**
 * Generate iOS/PWA icon sizes from the black source icon.
 * Run: node scripts/generate-app-icons.mjs
 */

import sharp from "sharp";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(
  process.cwd(),
  "assets",
  "c__Users_fotsi_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_icon-56a0e623-5a37-4716-8ce3-08bbec8be371.png"
);

if (!existsSync(source)) {
  console.error("Black source icon missing at assets/. Upload required.");
  process.exit(1);
}

const outputs = [
  { path: "app/apple-icon.png", size: 180 },
  { path: "public/apple-touch-icon.png", size: 180 },
  { path: "app/icon.png", size: 32 },
  { path: "public/icon.png", size: 512 },
  { path: "public/icon-192.png", size: 192 },
];

for (const { path, size } of outputs) {
  await sharp(source)
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(resolve(process.cwd(), path));
  console.log(`Wrote ${path} (${size}x${size})`);
}
