import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  datePublished?: string;
  dateModified?: string;
  // Structured data
  articleBody?: string;
  breadcrumbs?: { name: string; url: string }[];
}

const SITE_NAME = 'JobbaWorks';
const BASE_URL = 'https://jobbaworks.com';
const DEFAULT_IMAGE = `${BASE_URL}/logo.png`;
const DEFAULT_DESCRIPTION = 'JobbaWorks — Read, learn, and earn. Explore curated articles, stories, and content that rewards you for your time.';

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = 'blog, earn money reading, articles, stories, fintech, Nigeria, crypto',
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  author,
  datePublished,
  dateModified,
  articleBody,
  breadcrumbs,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Earn as you Read`;
  const canonicalUrl = url ? `${BASE_URL}${url}` : BASE_URL;
  const ogImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;
  const safeDescription = description.length > 160 ? description.substring(0, 157) + '...' : description;

  // Article JSON-LD Structured Data
  const articleSchema = type === 'article' ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    headline: title || SITE_NAME,
    description: safeDescription,
    image: ogImage,
    author: { '@type': 'Person', name: author || SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE }
    },
    datePublished: datePublished || new Date().toISOString(),
    dateModified: dateModified || datePublished || new Date().toISOString(),
    ...(articleBody ? { articleBody: articleBody.substring(0, 500) } : {}),
  } : null;

  // Organization Schema (for homepage)
  const orgSchema = type === 'website' ? {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: BASE_URL,
    logo: DEFAULT_IMAGE,
    sameAs: [],
    description: DEFAULT_DESCRIPTION,
  } : null;

  // Breadcrumb Schema
  const breadcrumbSchema = breadcrumbs && breadcrumbs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${BASE_URL}${crumb.url}`,
    })),
  } : null;

  return (
    <Helmet>
      {/* Primary Meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={safeDescription} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={safeDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={safeDescription} />
      <meta name="twitter:image" content={ogImage} />

      {/* Crawlability */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

      {/* Structured Data */}
      {articleSchema && (
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      )}
      {orgSchema && (
        <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
      )}
      {breadcrumbSchema && (
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      )}
    </Helmet>
  );
}
