const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, 'src/components/client');
const files = [
  'PublicProfileClient.tsx',
  'PrivacyPolicyClient.tsx',
  'TermsOfServiceClient.tsx',
  'EmailConfirmationClient.tsx',
  'EmailVerifiedClient.tsx'
];

files.forEach(file => {
    let f = path.join(clientDir, file);
    if (!fs.existsSync(f)) return;
    let c = fs.readFileSync(f, 'utf8');

    if (!c.includes('import { createClient } from')) {
        c = c.replace(/'use client';\n/g, "'use client';\nimport { createClient } from '@/lib/supabase/client';\n");
    }
    
    // Ensure it's a named export, NOT default
    c = c.replace(/export default function/g, 'export function');

    // Fix PublicProfileClient is_verified issue
    if (file === 'PublicProfileClient.tsx') {
        c = c.replace(/profile\.is_verified/g, '(profile as any).is_verified');
    }

    fs.writeFileSync(f, c);
});

// Fix page.tsx imports
const appDir = path.join(__dirname, 'src/app');
const pageRoutes = [
  { file: 'PublicProfileClient', route: 'author/[username]' },
  { file: 'PrivacyPolicyClient', route: '(legal)/privacy-policy' },
  { file: 'TermsOfServiceClient', route: '(legal)/terms-of-service' },
  { file: 'EmailConfirmationClient', route: 'email-confirmation' },
  { file: 'EmailVerifiedClient', route: 'email-verified' },
];

pageRoutes.forEach(({ file, route }) => {
    let f = path.join(appDir, route, 'page.tsx');
    if (!fs.existsSync(f)) return;
    let c = fs.readFileSync(f, 'utf8');
    
    c = c.replace(`import ${file} from '@/components/client/${file}';`, `import { ${file} } from '@/components/client/${file}';`);
    fs.writeFileSync(f, c);
});

console.log("Fixed public pages TS errors");
