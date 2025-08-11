#!/usr/bin/env node
// Repara imports inválidos de "use" desde React en todo src/ y verifica.

const fs = require('fs'), path = require('path');
const EXTS = new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs']);
const IGNORE = new Set(['node_modules','.git','build','dist','.next','out','coverage']);
const ROOT = path.join(process.cwd(), 'src');

function walk(dir, out){
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (!IGNORE.has(name)) walk(p, out); }
    else if (EXTS.has(path.extname(name))) out.push(p);
  }
}

function stripList(list){
  return list
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !/^use(\s+as\s+\w+)?$/i.test(s)); // quita "use" y "use as X"
}

const files = [];
walk(ROOT, files);

let fixed = 0;
for (const f of files) {
  let t = fs.readFileSync(f, 'utf8');
  const orig = t;

  // 1) import { use } from 'react'
  t = t.replace(/import\s*\{\s*use(?:\s+as\s+\w+)?\s*\}\s*from\s*(['"])react\1\s*;?/gis,
                'import React from "react";');

  // 2) import React, { ..., use, ... } from 'react'
  t = t.replace(/import\s+React\s*,\s*\{([\s\S]*?)\}\s*from\s*(['"])react\2\s*;?/gis, (_m, g) => {
    const parts = stripList(g);
    return parts.length
      ? `import React, { ${parts.join(', ')} } from "react";`
      : `import React from "react";`;
  });

  // 3) import { a, use, b } from 'react'
  t = t.replace(/import\s*\{([\s\S]*?)\}\s*from\s*(['"])react\2\s*;?/gis, (_m, g) => {
    const parts = stripList(g);
    return parts.length
      ? `import { ${parts.join(', ')} } from "react";`
      : `import React from "react";`;
  });

  // 4) import use from 'react'
  t = t.replace(/import\s+use\s+from\s*(['"])react\1\s*;?/gis, 'import React from "react";');

  // 5) const { use } = require('react')
  t = t.replace(/const\s*\{([\s\S]*?)\}\s*=\s*require\s*\(\s*(['"])react\2\s*\)\s*;?/gis, (_m, g) => {
    const parts = stripList(g);
    return parts.length
      ? `const { ${parts.join(', ')} } = require("react");`
      : `const React =
