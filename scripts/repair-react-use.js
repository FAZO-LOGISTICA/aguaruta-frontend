const fs = require('fs');
const path = require('path');

const EXTS = ['.js', '.jsx', '.ts', '.tsx'];
const IGNORE_DIRS = new Set(['node_modules', '.git', 'build', 'dist']);
const ROOTS = [path.join(process.cwd(), 'src'), process.cwd()];
let touched = [];
let hits = [];

function shouldSkipDir(name) {
  return IGNORE_DIRS.has(name);
}

function fixFile(p) {
  let txt = fs.readFileSync(p, 'utf8');
  const before = txt;

  txt = txt.replace(/import\s*{\s*use\s*}\s*from\s*['"]react['"]\s*;?/g, "import React from 'react';");
  txt = txt.replace(/import\s+React\s*,\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/g, (m, group) => {
    const cleaned = group.split(',').map(s => s.trim()).filter(s => s && s !== 'use').join(', ');
    return cleaned.length ? `import React, { ${cleaned} } from 'react';` : `import React from 'react';`;
  });
  txt = txt.replace(/import\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/g, (m, group) => {
    const parts = group.split(',').map(s => s.trim()).filter(s => s && s !== 'use');
    return parts.length === 0 ? `import React from 'react';` : `import { ${parts.join(', ')} } from 'react';`;
  });

  if (txt !== before) {
    fs.writeFileSync(p, txt, 'utf8');
    touched.push(p);
  }
}

function checkFile(p) {
  const txt = fs.readFileSync(p, 'utf8');
  if (/import\s*{\s*use\s*}\s*from\s*['"]react['"]/.test(txt)) hits.push(p);
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
      try { fn(p); } catch {}
    }
  }
}

// 1) Corregir
for (const r of ROOTS) walk(r, fixFile);
if (touched.length) console.log('✅ Archivos corregidos:\n' + touched.join('\n'));
else console.log('✅ No se encontraron importaciones inválidas para corregir.');

// 2) Verificar
hits = [];
for (const r of ROOTS) walk(r, checkFile);
if (hits.length) {
  console.error('❌ Import inválido { use } encontrado en:\n' + hits.join('\n'));
  process.exit(1);
} else {
  console.log('✅ Verificación final OK');
}
