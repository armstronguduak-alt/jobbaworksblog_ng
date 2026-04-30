import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from 'vite';

// Configure __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables using Vite
const env = loadEnv('production', process.cwd());

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase credentials in .env. Prerendering skipped.");
  process.exit(0);
}

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

async function fetchFromSupabase(endpoint) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch ${url}`, err);
    return null;
  }
}

async function run() {
  console.log('Starting SSG Prerendering for Articles...');
  
  // 1. Fetch approved posts with author & category data
  const postsQuery = `posts?select=*,category:categories(id,name,slug),author:profiles!posts_author_user_id_fkey(user_id,username,name,avatar_url)&status=eq.approved`;
  const posts = await fetchFromSupabase(postsQuery);
  
  if (!posts || posts.length === 0) {
    console.log('No posts found for prerendering.');
    return;
  }

  // 2. Fetch related data to completely fill initialData
  const allComments = await fetchFromSupabase(`post_comments?select=id,content,created_at,user_id,post_id`);
  // Map comments by post_id
  const commentsByPostId = {};
  if (allComments) {
    allComments.forEach(c => {
      if (!commentsByPostId[c.post_id]) commentsByPostId[c.post_id] = [];
      commentsByPostId[c.post_id].push(c);
    });
  }
  
  // To fetch profiles for comments we'd need them all, but to save complex logic in prerender,
  // we can fall back to CSR for comments. We'll just provide the post and relatedPosts.
  
  const templatePath = path.resolve(__dirname, 'dist', 'index.html');
  if (!fs.existsSync(templatePath)) {
    console.error("dist/index.html not found. Make sure to run 'vite build' before prerender.js");
    process.exit(1);
  }
  const template = fs.readFileSync(templatePath, 'utf-8');

  let successCount = 0;

  for (const post of posts) {
    if (!post.slug) continue;
    
    const categorySlug = post.category ? post.category.slug : 'post';
    const postRoute = `${categorySlug}/${post.slug}`;
    const outputDir = path.resolve(__dirname, 'dist', categorySlug, post.slug);
    
    // Create folders for /dist/category/slug
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Construct Initial Data exactly matching `fetchArticleData` return type in PublicArticle.tsx
    const initialData = {
      post: post,
      comments: [], // Allow CSR to fetch comments so we don't have to map profiles here
      relatedPosts: [], // CSR will fetch related posts quickly
      readAlsoPosts: [],
      isFollowing: false,
      hasRead: false
    };

    // Inject SEO tags and state
    let html = template;
    
    // Replace Meta Tags
    html = html.replace('<title>Vite + React + TS</title>', `<title>${post.title} | JobbaWorks</title>`);
    
    const metaDescription = `<meta name="description" content="${(post.content || '').substring(0, 150).replace(/<[^>]+>/g, '')}..." />`;
    const openGraph = `
      <meta property="og:title" content="${post.title}" />
      <meta property="og:image" content="${post.featured_image || ''}" />
      <meta property="og:type" content="article" />
    `;
    html = html.replace('</head>', `${metaDescription}\n${openGraph}\n<script>window.__INITIAL_ARTICLE_DATA__ = ${JSON.stringify(initialData)};</script>\n</head>`);

    // Add a basic pre-rendered visible shell for LCP
    const prerenderedApp = `
      <div id="root">
        <!-- Prerendered Shell for fast LCP -->
        <main class="max-w-4xl mx-auto px-4 py-8">
           <h1 style="font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem;">${post.title}</h1>
           ${post.featured_image ? `<img src="${post.featured_image}" style="width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 1rem; margin-bottom: 2rem;" />` : ''}
           <div>Rendering content...</div>
        </main>
      </div>
    `;
    
    html = html.replace('<div id="root"></div>', prerenderedApp);

    fs.writeFileSync(path.resolve(outputDir, 'index.html'), html);
    successCount++;
  }

  console.log(`✅ SSG Prerendering complete. Generated ${successCount} static pages.`);
}

run();
