// scripts/prebuild.mjs
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const apiUrl = process.env.REACT_APP_API_URL || "";
if (!apiUrl) {
  console.warn("[prebuild] REACT_APP_API_URL no está definido. Usando vacío.");
}

// (opcional) genera un runtime config para el frontend
mkdirSync("./src/config", { recursive: true });
writeFileSync(
  "./src/config/runtime.js",
  `export const RUNTIME_CONFIG = { API_URL: "${apiUrl}" };`
);

console.log("[prebuild] OK - runtime.js generado con API_URL:", apiUrl);
