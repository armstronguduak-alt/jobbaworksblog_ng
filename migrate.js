const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../jobbaworks-app/src/pages');
const destDir = path.join(__dirname, 'src/components/client/dashboard');
const appDir = path.join(__dirname, 'src/app/(dashboard)');

const filesToPort = [
  'Wallet.tsx', 'Referral.tsx', 'Analytics.tsx', 'Transactions.tsx', 
  'Swap.tsx', 'Plans.tsx', 'Settings.tsx', 'Profile.tsx',
  'CreateArticle.tsx', 'CreateStory.tsx', 'StoriesHub.tsx'
];

function transformContent(content, filename) {
  let result = "'use client';\n\n" + content;
  
  // React Router replacements
  result = result.replace(/import\s+\{([^}]*)\}\s+from\s+['"]react-router-dom['"];?/g, (match, imports) => {
    let nextImports = [];
    let linkImport = '';
    if (imports.includes('Link')) {
      linkImport = "import Link from 'next/link';\n";
    }
    if (imports.includes('useNavigate')) nextImports.push('useRouter');
    if (imports.includes('useSearchParams')) nextImports.push('useSearchParams');
    
    let res = linkImport;
    if (nextImports.length > 0) {
      res += `import { ${nextImports.join(', ')} } from 'next/navigation';\n`;
    }
    return res;
  });

  result = result.replace(/useNavigate\(\)/g, 'useRouter()');
  result = result.replace(/navigate\(/g, 'router.push(');

  // AuthContext replacement
  result = result.replace(/import\s+\{\s*useAuth\s*\}\s+from\s+['"]\.\.\/contexts\/AuthContext['"];?/g, "import { useAuth } from '@/components/client/AuthProvider';");
  
  // AppSettings replacement
  result = result.replace(/import\s+\{\s*useAppSettings\s*\}\s+from\s+['"]\.\.\/hooks\/useAppSettings['"];?/g, "import { useAppSettings } from '@/components/client/AuthProvider'; // Need to pass or fetch");
  
  // Currency replacement
  result = result.replace(/import\s+\{\s*useCurrency\s*\}\s+from\s+['"]\.\.\/hooks\/useCurrency['"];?/g, "import { useCurrency } from '@/lib/hooks/useCurrency';");

  // Supabase replacement
  result = result.replace(/import\s+\{\s*supabase\s*\}\s+from\s+['"]\.\.\/lib\/supabase['"];?/g, "import { createClient } from '@/lib/supabase/client';");
  
  // We need to inject const supabase = createClient() into the component.
  // A rough way is to find the component declaration and inject it.
  const componentName = filename.replace('.tsx', '');
  const componentRegex = new RegExp(`export function ${componentName}\\s*\\([^)]*\\)\\s*\\{`, 'g');
  result = result.replace(componentRegex, (match) => {
    return `export function ${componentName}Client() {\n  const supabase = createClient();`;
  });

  // Also replace `<Link to=` with `<Link href=`
  result = result.replace(/<Link\s+to=/g, '<Link href=');

  return result;
}

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

filesToPort.forEach(file => {
  const srcPath = path.join(srcDir, file);
  if (fs.existsSync(srcPath)) {
    const content = fs.readFileSync(srcPath, 'utf8');
    const newContent = transformContent(content, file);
    const newFileName = file.replace('.tsx', 'Client.tsx');
    fs.writeFileSync(path.join(destDir, newFileName), newContent);
    console.log(`Ported ${file} to ${newFileName}`);

    // Create page.tsx
    const routeName = file.replace('.tsx', '').toLowerCase();
    const routeDir = path.join(appDir, routeName === 'storieshub' ? 'stories' : routeName);
    if (!fs.existsSync(routeDir)) fs.mkdirSync(routeDir, { recursive: true });
    
    const pageContent = `import { ${file.replace('.tsx', 'Client')} } from '@/components/client/dashboard/${file.replace('.tsx', 'Client')}';\n\nexport default function ${file.replace('.tsx', '')}Page() {\n  return <${file.replace('.tsx', 'Client')} />;\n}\n`;
    fs.writeFileSync(path.join(routeDir, 'page.tsx'), pageContent);
    console.log(`Created page.tsx for ${routeName}`);
  }
});
