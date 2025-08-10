// scripts/fix-invalid-use.js
const fs = require('fs');
const path = require('path');

const exts = ['.js', '.jsx', '.ts', '.tsx'];
const roots = [path.join(process.cwd(), 'src'), process.cwd()]; // src y raíz (por si hay fuera de src)
let touched = [];

function fixFile(p) {
  let txt = fs.readFileSync(p, 'utf8');
  const before = txt;

  // import { use } from 'react';
  txt = txt.replace(
    /import\s*{\s*use\s*}\s*from\s*['"]react['"]\s*;?/g,
    "import React from 'react';"
  );

  // import React, { ..., use, ... } from 'react';
  txt = txt.replace(
    /import\s+React\s*,\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/g,
    (m, group) => {
      const cleaned = group
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== 'use' && s !== '')
        .join(', ')
        .trim();
      return cleaned.length
        ? `import React, { ${cleaned} } from 'react';`
        : `import React from 'react';`;
    }
  );

  // import { a, use, b } from 'react';
  txt = txt.replace(
    /import\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/g,
    (m, group) => {
      const parts = group
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== 'use' && s !== '');
      if (parts.length === 0) return `import React from 'react';`;
      return `import { ${parts.join(', ')} } from 'react';`;
    }
  );

  if (txt !== before) {
    fs.writeFileSync(p, txt, 'utf8');
    touched.push(p);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      // ignora node_modules y .git
      if (name === 'node_modules' || name === '.git' || name === 'build') continue;
      walk(p);
    } else if (exts.includes(path.extname(p))) {
      try { fixFile(p); } catch { /* ignore */ }
    }
  }
}

for (const r of roots) walk(r);

if (touched.length) {
  console.log('✅ Archivos corregidos (removido { use } de React):\n' + touched.join('\n'));
} else {
  console.log('✅ No se encontraron { use } para corregir.');
}
