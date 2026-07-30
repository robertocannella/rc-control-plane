// Copies the subset of the self-hosted TinyMCE distribution we actually
// need into public/tinymce, so the editor loads from our own domain
// instead of requiring a Tiny Cloud API key. Runs before dev/build (see
// package.json) rather than as a postinstall step, since the Docker build's
// dependency-install stage only has package.json/package-lock.json on disk
// (no scripts/ or node_modules/tinymce copy target yet).
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "tinymce");
const dest = path.join(__dirname, "..", "public", "tinymce");

const dirsToCopy = ["icons", "models", "plugins", "skins", "themes"];
const filesToCopy = ["tinymce.min.js"];

if (!fs.existsSync(src)) {
  console.error("tinymce package not found in node_modules; skipping copy");
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

for (const dir of dirsToCopy) {
  fs.cpSync(path.join(src, dir), path.join(dest, dir), { recursive: true });
}
for (const file of filesToCopy) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}

console.log("Copied TinyMCE assets to public/tinymce");
