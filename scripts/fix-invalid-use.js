// scripts/fix-invalid-use.js
const fs = require('fs');
const path = require('path');

const exts = ['.js', '.jsx', '.ts', '.tsx'];
const root = path.join(process.cwd(), 'src');
let touched = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (exts.includes(path.extname(p))) {
      let txt = fs.readFileSync(p, 'utf8');
      const before = txt;

      // Caso A: import { use } from 'react';
      txt = txt.replace(
        /import\s*{\s*use\s*}\s*from\s*['"]react['"]\s*;?/g,
        "import React from 'react';"
      );

      // Caso B: import React, { ..., use, ... } from 'react';
      txt = txt.replace(
        /import\s+React\s*,\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/g,
        (m, group) => {
          const cleaned = group
            .split(',')
            .map(s => s.trim())
            .filter(s => s !== 'use')
            .join(', ')
            .trim();
          return cleaned.length
            ? `import React, { ${cleaned} } from 'react';`
            : `import React from 'react';`;
        }
      );

      // Caso C: import { ..., use, ... } from 'react';
      txt = txt.replace(
        /import\s*{([^}]*)}\s*from\s*['"]react['"]\s*;?/g,
        (m, group) => {
          const parts = group
            .split(',')
            .map(s => s.trim())
            .filter(s => s !== 'use');
          if (parts.length === 0) return `import React from 'react';`;
          return `import { ${parts.join(', ')} } from 'react';`;
        }
      );

      if (txt !== before) {
        fs.writeFileSync(p, txt, 'utf8');
        touched.push(p);
      }
    }
  }
}

if (!fs.existsSync(root)) {
  console.error('❌ No se encontró carpeta src/. Ejecuta este script desde la raíz del proyecto.');
  process.exit(1);
}

walk(root);

if (touched.length) {
  console.log('✅ Archivos corregidos (removido { use } de React):');
  console.log(touched.join('\n'));
  process.exit(0);
} else {
  console.log('✅ No había { use } en las importaciones de React.');
  process.exit(0);
}
