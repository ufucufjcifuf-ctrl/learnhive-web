import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

try {
  const pdfjsPkgPath = require.resolve("pdfjs-dist/package.json");
  const pdfjsRoot = path.dirname(pdfjsPkgPath);
  const targetRoot = path.resolve(process.cwd(), "public", "pdfjs");

  fs.mkdirSync(targetRoot, { recursive: true });

  const workerMin = path.join(pdfjsRoot, "build", "pdf.worker.min.mjs");
  const workerFallback = path.join(pdfjsRoot, "build", "pdf.worker.mjs");
  const workerSrc = fs.existsSync(workerMin) ? workerMin : workerFallback;

  if (fs.existsSync(workerSrc)) {
    fs.copyFileSync(workerSrc, path.join(targetRoot, "pdf.worker.min.mjs"));
  }

  for (const dirName of ["cmaps", "standard_fonts", "wasm"]) {
    const srcDir = path.join(pdfjsRoot, dirName);
    const destDir = path.join(targetRoot, dirName);
    if (fs.existsSync(srcDir)) {
      fs.cpSync(srcDir, destDir, { recursive: true, force: true });
    }
  }

  console.log("✅ Copied pdfjs-dist worker, cmaps, standard_fonts, and wasm to public/pdfjs");
} catch (err) {
  console.warn("⚠️ Skipping pdfjs asset copy (run npm install first):", err?.message || err);
}