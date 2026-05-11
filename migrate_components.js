const fs = require('fs');
const path = require('path');

const srcComponentsDir = path.join(__dirname, '../jobbaworks-app/src/components');
const destComponentsDir = path.join(__dirname, 'src/components/client/dashboard/modals');

const srcContextsDir = path.join(__dirname, '../jobbaworks-app/src/contexts');
const destContextsDir = path.join(__dirname, 'src/components/client/contexts');

const componentsToPort = [
  'ChangePasswordModal.tsx', 'PaymentMethodModal.tsx', 'SetPinModal.tsx', 'TwoFactorModal.tsx', 'PlanUpsellModal.tsx'
];

const contextsToPort = [
  'DialogContext.tsx'
];

function transformContent(content, isContext) {
  let result = "'use client';\n\n" + content;
  
  // React Router replacements
  result = result.replace(/import\s+\{([^}]*)\}\s+from\s+['"]react-router-dom['"];?/g, (match, imports) => {
    let nextImports = [];
    let linkImport = '';
    if (imports.includes('Link')) linkImport = "import Link from 'next/link';\n";
    if (imports.includes('useNavigate')) nextImports.push('useRouter');
    if (imports.includes('useSearchParams')) nextImports.push('useSearchParams');
    let res = linkImport;
    if (nextImports.length > 0) res += `import { ${nextImports.join(', ')} } from 'next/navigation';\n`;
    return res;
  });

  result = result.replace(/useNavigate\(\)/g, 'useRouter()');
  result = result.replace(/navigate\(/g, 'router.push(');

  // AuthContext replacement
  result = result.replace(/import\s+\{\s*useAuth\s*\}\s+from\s+['"]\.\.\/contexts\/AuthContext['"];?/g, "import { useAuth } from '@/components/client/AuthProvider';");
  
  // AppSettings replacement
  result = result.replace(/import\s+\{\s*useAppSettings\s*\}\s+from\s+['"]\.\.\/hooks\/useAppSettings['"];?/g, "import { useAppSettings } from '@/components/client/AuthProvider';");
  
  // Currency replacement
  result = result.replace(/import\s+\{\s*useCurrency\s*\}\s+from\s+['"]\.\.\/hooks\/useCurrency['"];?/g, "import { useCurrency } from '@/lib/hooks/useCurrency';");

  // Supabase replacement
  if (isContext) {
      result = result.replace(/import\s+\{\s*supabase\s*\}\s+from\s+['"]\.\.\/lib\/supabase['"];?/g, "import { createClient } from '@/lib/supabase/client';\nconst supabase = createClient();");
  } else {
      result = result.replace(/import\s+\{\s*supabase\s*\}\s+from\s+['"]\.\.\/lib\/supabase['"];?/g, "import { createClient } from '@/lib/supabase/client';");
      // Inject supabase instance inside the component function
      result = result.replace(/(export function [a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)/g, "$1\n  const supabase = createClient();");
  }

  result = result.replace(/<Link\s+to=/g, '<Link href=');

  return result;
}

if (!fs.existsSync(destComponentsDir)) fs.mkdirSync(destComponentsDir, { recursive: true });
if (!fs.existsSync(destContextsDir)) fs.mkdirSync(destContextsDir, { recursive: true });

componentsToPort.forEach(file => {
  const srcPath = path.join(srcComponentsDir, file);
  if (fs.existsSync(srcPath)) {
    const content = fs.readFileSync(srcPath, 'utf8');
    const newContent = transformContent(content, false);
    fs.writeFileSync(path.join(destComponentsDir, file), newContent);
    console.log(`Ported component ${file}`);
  }
});

contextsToPort.forEach(file => {
  const srcPath = path.join(srcContextsDir, file);
  if (fs.existsSync(srcPath)) {
    const content = fs.readFileSync(srcPath, 'utf8');
    const newContent = transformContent(content, true);
    fs.writeFileSync(path.join(destContextsDir, file), newContent);
    console.log(`Ported context ${file}`);
  }
});

// Update SettingsClient, ProfileClient etc. to use the new paths for these modals and contexts.
// In src/components/client/dashboard/
const pagesDir = path.join(__dirname, 'src/components/client/dashboard');
const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

pageFiles.forEach(file => {
  const p = path.join(pagesDir, file);
  let content = fs.readFileSync(p, 'utf8');
  
  // Replace missing component paths
  content = content.replace(/\.\.\/components\/([A-Za-z0-9]+Modal)/g, './modals/$1');
  content = content.replace(/\.\.\/contexts\/DialogContext/g, '../contexts/DialogContext');
  
  // remove SEO imports since Next.js handles metadata
  content = content.replace(/import\s+\{\s*SEO\s*\}\s+from\s+['"]\.\.\/components\/SEO['"];?\n?/g, '');
  content = content.replace(/<SEO\s+[^>]*\/>/g, '');

  fs.writeFileSync(p, content);
});

console.log("Updated import paths in dashboard components.");
