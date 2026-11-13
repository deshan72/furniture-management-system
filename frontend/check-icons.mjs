import fs from 'fs';
import path from 'path';

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(full));
    } else if (full.endsWith('.jsx') || full.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

const files = getFiles('./frontend/src');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const jsxTags = [...content.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)].map(m => m[1]);
  const uniqueTags = [...new Set(jsxTags)];

  for (const tag of uniqueTags) {
    if (tag === 'React' || tag === 'Fragment') continue;
    
    // Check if tag is imported from anywhere
    const isImported = new RegExp('\\b' + tag + '\\b').test(content.split(/export\s+default|function\s+[A-Za-z0-9_]+\s*\(/)[0]);
    const isDefined = new RegExp('(?:const|let|var|function|class)\\s+' + tag + '\\b').test(content);

    if (!isImported && !isDefined) {
      console.log(`POTENTIAL MISSING: [${file}] uses <${tag}>`);
    }
  }
}
console.log('Done scanning.');

