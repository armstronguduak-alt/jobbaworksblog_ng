import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function to dynamically generate sitemap.xml
export default async function handler(req: any, res: any) {
  try {
    // 1. Setup Supabase
    // Using process.env natively for Vercel Serverless environment
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://klidnyqyjvbvzmplwdfl.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsaWRueXF5anZidnptcGx3ZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTYxODMsImV4cCI6MjA5MDM3MjE4M30.Qt7IHXpY4li_8VxWXDmwhbqDflJWI7WDgC5J6hS_0bA';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Fetch all published articles (optimize query)
    const { data: posts, error } = await supabase
      .from('posts')
      .select('slug, updated_at, created_at, category:categories(slug)')
      .eq('status', 'approved');

    if (error) {
      console.error('Error fetching posts for sitemap:', error);
      return res.status(500).send('Error fetching data');
    }

    // 3. Define static pages
    const baseUrl = 'https://jobbaworks.com';
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/login', priority: '0.8', changefreq: 'monthly' },
      { url: '/signup', priority: '0.8', changefreq: 'monthly' },
      { url: '/education', priority: '0.9', changefreq: 'daily' },
      { url: '/entertainment', priority: '0.9', changefreq: 'daily' },
      { url: '/health', priority: '0.9', changefreq: 'daily' },
      { url: '/politics', priority: '0.9', changefreq: 'daily' },
      { url: '/sports', priority: '0.9', changefreq: 'daily' },
      { url: '/technology', priority: '0.9', changefreq: 'daily' },
    ];

    const today = new Date().toISOString();

    // 4. Build XML string
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 4a. Add static pages
    staticPages.forEach((page) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    // 4b. Add dynamic articles
    if (posts && posts.length > 0) {
      posts.forEach((post) => {
        // Handle possible missing categories gracefully
        let categorySlug = 'article';
        if (post.category) {
          if (Array.isArray(post.category)) {
            categorySlug = post.category[0]?.slug || 'article';
          } else {
            categorySlug = (post.category as any).slug || 'article';
          }
        }
        
        // Use updated_at if available, fallback to created_at, then today
        const lastMod = post.updated_at 
          ? new Date(post.updated_at).toISOString() 
          : (post.created_at ? new Date(post.created_at).toISOString() : today);
        
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/${categorySlug}/${post.slug}</loc>\n`;
        xml += `    <lastmod>${lastMod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      });
    }

    xml += `</urlset>`;

    // 5. Send Valid XML Response
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    // Cache for 1 hour at the edge, allow serving stale while revalidating for 24h
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    
    return res.status(200).send(xml);
    
  } catch (err) {
    console.error('Sitemap fatal error:', err);
    return res.status(500).send('Internal Server Error');
  }
}
