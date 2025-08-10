// scripts/repair-react-use.js
// Corrige TODAS las variantes de `import { use } from 'react'`
// incluyendo alias: `use as algo`, espacios, comas, etc. Luego verifica.

const fs = require('fs');
const path = require('path');

const EXTS = ['.js', '.jsx', '.ts', '.tsx'];
const IGNORE_DIRS = new Set(['node_modules', '.git', 'build', 'dist', '.next', 'out', 'coverage']);
const ROOTS = [process.cwd()]; // recorre todo el repo, no solo /src

let touched = [];
let hits = [];

function shouldSkipDir(name) {
  return IGNORE_DIRS.has(name);
}

// elimina entradas 'use' o 'use as Alias' de una lista de imports { ... }
function stripUseFromList(list) {
  return list
    .split(',')
    .map(s => s.trim())
    // quita: use,  use as Alias
    .filter(s => !/^use(\s+as\s+\w+)?$/i.test(s))
    .filter(Boolean);
}

function fixFile(p) {
  const ext = path.extname(p);
  if (!EXTS.includes(ext)) return;
  let txt = fs.readFileSync(p, 'utf8');
  const before = txt;

  // 1) import { use } from 'react'  (con alias y espacios)
  //    -> import React from 'react';
  txt = txt.replace(
    /import\s*{\s*use(\s+as\s+\w+)?\s*}\s*from\s*['"]react['"]\s*;?/gi,
    "import React from 'react';"
  );

  // 2) import React, { ..., use, ... } from 'react';
  txt = txt.replace(
    /import\s+React\s*,\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/gi,
    (m, group) => {
      const cleaned = stripUseFromList(group).join(', ');
      return cleaned.length
        ? `import React, { ${cleaned} } from 'react';`
        : `import React from 'react';`;
    }
  );

  // 3) import { a, use, b } from 'react';
  txt = txt.replace(
    /import\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/gi,
    (m, group) => {
      const parts = stripUseFromList(group);
      if (parts.length === 0) return `import React from 'react';`;
      return `import { ${parts.join(', ')} } from 'react';`;
    }
  );

  if (txt !== before) {
    fs.writeFileSync(p, txt, 'utf8');
    touched.push(p);
  }
}

function checkFile(p) {
  const ext = path.extname(p);
  if (!EXTS.includes(ext)) return;
  const txt = fs.readFileSync(p, 'utf8');
  // Detecta cualquier resto: { use } o { use as Alias }
  const rx = /import\s*{[^}]*\buse(\s+as\s+\w+)?\b[^}]*}\s*from\s*['"]react['"]/i;
  if (rx.test(txt)) hits.push(p);
}

function walk(dir, fn) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      if (shouldSkipDir(name)) continue;
      walk(p, fn);
    } else {
      try { fn(p); } catch {}
    }
  }
}

console.log('▶️  repair-react-use: iniciando scan y fix...');
walk(process.cwd(), fixFile);

if (touched.length) {
  console.log('✅ Archivos corregidos:\n' + touched.join('\n'));
} else {
  console.log('✅ No se encontraron importaciones inválidas para corregir.');
}

// Verificación final: si quedó algo, aborta y lista los archivos
hits = [];
walk(process.cwd(), checkFile);

if (hits.length) {
  console.error('❌ Aún quedan importaciones inválidas de React en:\n' + hits.join('\n'));
  process.exit(1);
} else {
  console.log('✅ Verificación final OK: no quedan { use } en importaciones de React.');
}
