// scripts/repair-react-use.js
// - Corrige importaciones inválidas "import { use } from 'react'"
// - Reporta archivos tocados
// - Verifica nuevamente y si queda alguno, muestra la ruta y falla el build

const fs = require('fs');
const path = require('path');

const EXTS = ['.js', '.jsx', '.ts', '.tsx'];
const IGNORE_DIRS = new Set(['node_modules', '.git', 'build', 'dist', '.next', 'out']);
const ROOTS = [path.join(process.cwd(), 'src'), process.cwd()]; // busca en src/ y raíz
let touched = [];
let hits = [];

function shouldSkipDir(name) {
  return IGNORE_DIRS.has(name);
}

function fixFile(p) {
  let txt = fs.readFileSync(p, 'utf8');
  const before = txt;

  // Caso 1: import { use } from 'react';
  txt = txt.replace(
    /import\s*{\s*use\s*}\s*from\s*['"]react['"]\s*;?/g,
    "import React from 'react';"
  );

  // Caso 2: import React, { ..., use, ... } from 'react';
  txt = txt.replace(
    /import\s+React\s*,\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/g,
    (m, group) => {
      const cleaned = group
        .split(',')
        .map(s => s.trim())
        .filter(s => s && s !== 'use')
        .join(', ');
      return cleaned.length
        ? `import React, { ${cleaned} } from 'react';`
        : `import React from 'react';`;
    }
  );

  // Caso 3: import { a, use, b } from 'react';
  txt = txt.replace(
    /import\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/g,
    (m, group) => {
      const parts = group
        .split(',')
        .map(s => s.trim())
        .filter(s => s && s !== 'use');
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
  const txt = fs.readFileSync(p, 'utf8');
  const rx = /import\s*{\s*use\s*}\s*from\s*['"]react['"]/g;
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
    } else if (EXTS.includes(path.extname(p))) {
      try { fn(p); } catch { /* ignore */ }
    }
  }
}

// 1) Corrección
for (const r of ROOTS) walk(r, fixFile);

// 2) Reporte de archivos corregidos
if (touched.length) {
  console.log('✅ Archivos corregidos (removido { use } de React):\n' + touched.join('\n'));
} else {
  console.log('✅ No se encontraron importaciones para corregir.');
}

// 3) Verificación final (si queda alguno, fallar)
hits = [];
for (const r of ROOTS) walk(r, checkFile);

if (hits.length) {
  console.error('❌ Import inválido "import { use } from \'react\'" aún presente en:\n' + hits.join('\n'));
  process.exit(1);
} else {
  console.log('✅ Verificación final OK: no quedan importaciones inválidas { use }.');
}
