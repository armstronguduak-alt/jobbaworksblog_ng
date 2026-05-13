const fs = require('fs');
const path = require('path');

let found = false;

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
      const content = fs.readFileSync(dirPath, 'utf8');
      if (content.includes('<Link') && !content.includes('import {') && !content.includes('Link')) {
        // rough skip
      }
      if (content.includes('<Link')) {
        const hasImport = content.match(/import\s+{[^}]*Link[^}]*}\s+from\s+['"]react-router-dom['"]/);
        if (!hasImport) {
          console.log('Missing Link import:', dirPath);
          found = true;
        }
      }
    }
  }
}

walkDir('src');
if (!found) {
  console.log('All files using <Link> have the react-router-dom import.');
}
