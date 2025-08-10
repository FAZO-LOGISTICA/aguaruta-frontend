// NO toques node_modules: solo corrige tu código del repo
const fs = require('fs');
const path = require('path');

const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'build', 'dist', '.next', 'out', 'coverage']);
const ROOTS = [path.join(process.cwd(), 'src'), process.cwd()]; // src + raiz del proyecto
let touched = [];
let hits = [];

function skipDir(name) { return IGNORE_DIRS.has(name); }
function stripUse(list) {
  return list.split(',')
    .map(s => s.trim())
    .filter(s => !/^use(\s+as\s+\w+)?$/i.test(s))
    .filter(Boolean);
}
function fixFile(file) {
  const ext = path.extname(file);
  if (!EXTS.has(ext)) return;
  let txt = fs.readFileSync(file, 'utf8');
  const before = txt;

  // import { use } from 'react' (con alias)
  txt = txt.replace(/import\s*{\s*use(\s+as\s+\w+)?\s*}\s*from\s*['"]react['"]\s*;?/gi, "import React from 'react';");

  // import React, { ..., use, ... } from 'react';
  txt = txt.replace(/import\s+React\s*,\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/gi,
    (m, group) => {
      const cleaned = stripUse(group).join(', ');
      return cleaned ? `import React, { ${cleaned} } from 'react';` : `import React from 'react';`;
    });

  // import { a, use, b } from 'react';
  txt = txt.replace(/import\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/gi,
    (m, group) => {
      const parts = stripUse(group);
      return parts.length ? `import { ${parts.join(', ')} } from 'react';` : `import React from 'react';`;
    });

  if (txt !== before) {
    fs.writeFileSync(file, txt, 'utf8');
    touched.push(file);
  }
}
function checkFile(file) {
  const ext = path.extname(file);
  if (!EXTS.has(ext)) return;
  const txt = fs.readFileSync(file, 'utf8');
  if (/import\s*{[^}]*\buse(\s+as\s+\w+)?\b[^}]*}\s*from\s*['"]react['"]/i.test(txt)) hits.push(file);
}
function walk(dir, fn) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (skipDir(name)) continue; walk(p, fn); }
    else { try { fn(p); } catch {} }
  }
}

// 1) Corrige archivos del proyecto (sin node_modules)
for (const r of ROOTS) walk(r, fixFile);
console.log(touched.length ? '✅ Corregidos:\n' + touched.join('\n') : '✅ Nada que corregir.');

// 2) Verifica que no quede ninguno
hits = [];
for (const r of ROOTS) walk(r, checkFile);
if (hits.length) {
  console.error('❌ Aún quedan imports inválidos en:\n' + hits.join('\n'));
  process.exit(1);
} else {
  console.log('✅ Verificación final OK (sin { use } en imports de React).');
}
