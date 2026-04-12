/**
 * Sitemap Generator for JobbaWorks
 * Run: node scripts/generate-sitemap.mjs
 * 
 * This fetches all published posts and stories from Supabase,
 * then generates a sitemap.xml in the public directory.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://isuuyamcedgxbmigxwwu.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const BASE_URL = 'https://jobbaworks.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function generateSitemap() {
  console.log('🗺️  Generating sitemap...');

  // Static pages
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/stories', priority: '0.9', changefreq: 'daily' },
    { url: '/plans', priority: '0.7', changefreq: 'monthly' },
    { url: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
    { url: '/terms-of-service', priority: '0.3', changefreq: 'yearly' },
  ];

  // Fetch published blog posts
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at, category:categories(slug)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  // Fetch published stories
  const { data: stories } = await supabase
    .from('stories')
    .select('slug, updated_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('slug');

  let urls = '';

  // Static pages
  for (const page of staticPages) {
    urls += `
  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  }

  // Category pages 
  if (categories) {
    for (const cat of categories) {
      urls += `
  <url>
    <loc>${BASE_URL}/${cat.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }
  }

  // Blog posts
  if (posts) {
    for (const post of posts) {
      const catSlug = (post.category as any)?.slug || 'post';
      urls += `
  <url>
    <loc>${BASE_URL}/${catSlug}/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }
  }

  // Stories
  if (stories) {
    for (const story of stories) {
      urls += `
  <url>
    <loc>${BASE_URL}/stories/${story.slug}</loc>
    <lastmod>${new Date(story.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  const outputPath = resolve(__dirname, '../public/sitemap.xml');
  writeFileSync(outputPath, sitemap, 'utf-8');
  console.log(`✅ Sitemap generated at: ${outputPath}`);
  console.log(`   - ${staticPages.length} static pages`);
  console.log(`   - ${categories?.length || 0} category pages`);
  console.log(`   - ${posts?.length || 0} blog posts`);
  console.log(`   - ${stories?.length || 0} stories`);
}

generateSitemap().catch(console.error);
