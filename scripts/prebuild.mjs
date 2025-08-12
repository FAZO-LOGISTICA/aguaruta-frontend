// scripts/prebuild.mjs
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_URL =
  process.env.REACT_APP_API_URL?.replace(/([^/])$/, "$1/") || "http://localhost:8000/";

const content = `// ⚠️ Archivo generado en prebuild. No editar a mano.
export const API_URL = "${API_URL}";
`;

const target = `${__dirname}/../src/runtime.js`;
mkdirSync(`${__dirname}/../src`, { recursive: true });
writeFileSync(target, content, "utf8");

console.log("[prebuild] OK - runtime.js generado con API_URL:", API_URL.replace(/https?:\/\//, "****"));
