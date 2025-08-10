// scripts/repair-react-use.js
// Arregla cualquier `import { use } from 'react'` en TODO el repo,
// incluyendo alias (use as X), espacios, comas, y también dentro de node_modules.
// Luego verifica y si queda algo, lista los archivos y corta el build.

const fs = require('fs');
const path = require('path');

const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORE_DIRS = new Set(['.git', 'build', 'dist', '.next', 'out', 'coverage']);
const ROOT = process.cwd();
let touched = [];
let hits = [];

function shouldSkipDir(name) {
  // NO ignoramos node_modules para poder reparar dependencias si hacen `import { use }`
  return IGNORE_DIRS.has(name);
}

function stripUseFromList(list) {
  return list
    .split(',')
    .map(s => s.trim())
    // elimina: use  |  use as Alias
    .filter(s => !/^use(\s+as\s+\w+)?$/i.test(s))
    .filter(Boolean);
}

function fixFile(file) {
  const ext = path.extname(file);
  if (!EXTS.has(ext)) return;
  let text = fs.readFileSync(file, 'utf8');
  const before = text;

  // Caso 1: import { use } from 'react'  (con o sin alias)
  text = text.replace(
    /import\s*{\s*use(\s+as\s+\w+)?\s*}\s*from\s*['"]react['"]\s*;?/gi,
    "import React from 'react';"
  );

  // Caso 2: import React, { ..., use, ... } from 'react';
  text = text.replace(
    /import\s+React\s*,\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/gi,
    (m, group) => {
      const cleaned = stripUseFromList(group).join(', ');
      return cleaned.length
        ? `import React, { ${cleaned} } from 'react';`
        : `import React from 'react';`;
    }
  );

  // Caso 3: import { a, use, b } from 'react';
  text = text.replace(
    /import\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/gi,
    (m, group) => {
      const parts = stripUseFromList(group);
      if (parts.length === 0) return `import React from 'react';`;
      return `import { ${parts.join(', ')} } from 'react';`;
    }
  );

  if (text !== before) {
    fs.writeFileSync(file, text, 'utf8');
    touched.push(file);
  }
}

function checkFile(file) {
  const ext = path.extname(file);
  if (!EXTS.has(ext)) return;
  const text = fs.readFileSync(file, 'utf8');
  const rx = /import\s*{[^}]*\buse(\s+as\s+\w+)?\b[^}]*}\s*from\s*['"]react['"]/i;
  if (rx.test(text)) hits.push(file);
}

function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      if (shouldSkipDir(entry)) continue;
      walk(p, cb);
    } else {
      try { cb(p); } catch {}
    }
  }
}

console.log('▶️  repair-react-use: escaneando y corrigiendo en todo el repo (incluye node_modules)...');
walk(ROOT, fixFile);

if (touched.length) {
  console.log('✅ Archivos corregidos:\n' + touched.join('\n'));
} else {
  console.log('✅ No se encontraron importaciones inválidas para corregir.');
}

hits = [];
walk(ROOT, checkFile);

if (hits.length) {
  console.error('❌ Aún quedan importaciones inválidas en:\n' + hits.join('\n'));
  process.exit(1);
} else {
  console.log('✅ Verificación final OK: no quedan { use } en importaciones de React.');
}
