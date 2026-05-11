const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../jobbaworks-app/src/pages');
const destDir = path.join(__dirname, 'src/components/client');
const appDir = path.join(__dirname, 'src/app');

// ─── 1. Port remaining public pages ─────────────────────────────
const publicPages = [
  { file: 'PublicProfile.tsx', route: 'author/[username]' },
  { file: 'PrivacyPolicy.tsx', route: '(legal)/privacy-policy' },
  { file: 'TermsOfService.tsx', route: '(legal)/terms-of-service' },
  { file: 'EmailConfirmation.tsx', route: 'email-confirmation' },
  { file: 'EmailVerified.tsx', route: 'email-verified' },
];

function transformPublicPage(content, filename) {
  let result = "'use client';\n\n" + content;
  
  result = result.replace(/import\s+\{([^}]*)\}\s+from\s+['"]react-router-dom['"];?/g, (match, imports) => {
    let nextImports = [];
    let linkImport = '';
    if (imports.includes('Link')) linkImport = "import Link from 'next/link';\n";
    if (imports.includes('useNavigate')) nextImports.push('useRouter');
    if (imports.includes('useParams')) nextImports.push('useParams');
    if (imports.includes('useSearchParams')) nextImports.push('useSearchParams');
    let res = linkImport;
    if (nextImports.length > 0) res += `import { ${nextImports.join(', ')} } from 'next/navigation';\n`;
    return res;
  });

  result = result.replace(/useNavigate\(\)/g, 'useRouter()');
  result = result.replace(/navigate\(/g, 'router.push(');
  result = result.replace(/router\.push\(-1\)/g, 'router.back()');
  
  result = result.replace(/import\s+\{\s*useAuth\s*\}\s+from\s+['"]\.\.\/contexts\/AuthContext['"];?/g, "import { useAuth } from '@/components/client/AuthProvider';");
  result = result.replace(/import\s+\{\s*supabase\s*\}\s+from\s+['"]\.\.\/lib\/supabase['"];?/g, "import { createClient } from '@/lib/supabase/client';");
  
  const componentName = filename.replace('.tsx', '');
  const componentRegex = new RegExp(`export (default )?function ${componentName}\\s*\\([^)]*\\)\\s*\\{`, 'g');
  result = result.replace(componentRegex, (match) => {
    const isDefault = match.includes('default');
    return `export ${isDefault ? 'default ' : ''}function ${componentName}Client() {\n  const supabase = createClient();`;
  });

  // Remove SEO imports
  result = result.replace(/import\s+\{\s*SEO\s*\}\s+from\s+['"]\.\.\/components\/SEO['"];?\n?/g, '');
  result = result.replace(/<SEO\s+[^>]*\/>/g, '');
  
  result = result.replace(/(<Link[^>]+)to=/g, '$1href=');

  return result;
}

publicPages.forEach(({ file, route }) => {
  const srcPath = path.join(srcDir, file);
  if (!fs.existsSync(srcPath)) {
    console.log(`SKIP ${file} (not found)`);
    return;
  }

  const content = fs.readFileSync(srcPath, 'utf8');
  const newContent = transformPublicPage(content, file);
  const newFileName = file.replace('.tsx', 'Client.tsx');
  
  const destPath = path.join(destDir, newFileName);
  fs.writeFileSync(destPath, newContent);
  console.log(`Ported ${file} → ${newFileName}`);

  // Create route page.tsx
  const routeDir = path.join(appDir, route);
  if (!fs.existsSync(routeDir)) fs.mkdirSync(routeDir, { recursive: true });
  
  const componentName = file.replace('.tsx', '') + 'Client';
  const importPath = `@/components/client/${componentName}`;
  const pageContent = `import ${componentName} from '${importPath}';\n\nexport default function Page() {\n  return <${componentName} />;\n}\n`;
  fs.writeFileSync(path.join(routeDir, 'page.tsx'), pageContent);
  console.log(`  Route: /${route}/page.tsx`);
});

console.log('\nDone porting remaining public pages.');
