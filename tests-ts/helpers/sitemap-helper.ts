import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Parse a sitemap.xml file and extract all URLs.
 */
export function parseSitemapUrls(sitemapContent: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const $ = cheerio.load(sitemapContent, { xmlMode: true });
  
  // Check if it's a sitemap index
  const sitemaps = $('sitemap');
  if (sitemaps.length > 0) {
    // It's a sitemap index - return the sitemap URLs
    const sitemapUrls: string[] = [];
    sitemaps.each((_, elem) => {
      const loc = $(elem).find('loc').text().trim();
      if (loc) {
        sitemapUrls.push(loc);
      }
    });
    return sitemapUrls;
  }
  
  // It's a regular sitemap - extract URLs
  $('url').each((_, elem) => {
    const loc = $(elem).find('loc').text().trim();
    if (loc && baseUrl) {
      const url = loc.split('#')[0].split('?')[0];
      if (url && !urls.includes(url)) {
        urls.push(url);
      }
    }
  });
  
  return urls;
}

/**
 * Fetch sitemap content from a URL.
 */
export async function fetchSitemap(sitemapUrl: string): Promise<string> {
  try {
    const response = await axios.get(sitemapUrl, { timeout: 30000 });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch sitemap from ${sitemapUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse a sitemap index and fetch all URLs from all sitemaps.
 */
export async function getAllUrlsFromSitemapIndex(sitemapIndexUrl: string, baseUrl: string): Promise<string[]> {
  const allUrls: string[] = [];
  
  try {
    // Fetch the sitemap index
    const indexContent = await fetchSitemap(sitemapIndexUrl);
    
    // Parse to get individual sitemap URLs
    const $ = cheerio.load(indexContent, { xmlMode: true });
    const sitemaps = $('sitemap');
    
    if (sitemaps.length === 0) {
      // Not a sitemap index, try parsing as regular sitemap
      return parseSitemapUrls(indexContent, baseUrl);
    }
    
    // Fetch and parse each sitemap
    for (let i = 0; i < sitemaps.length; i++) {
      const loc = $(sitemaps[i]).find('loc').text().trim();
      if (loc) {
        try {
          // Fetch the individual sitemap
          const sitemapContent = await fetchSitemap(loc);
          
          // Parse URLs from this sitemap
          const urls = parseSitemapUrls(sitemapContent, baseUrl);
          allUrls.push(...urls);
          
          console.log(`  ✓ Fetched ${urls.length} URLs from ${loc.split('/').pop()}`);
        } catch (error) {
          console.log(`  ⚠️  Could not fetch ${loc}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          continue;
        }
      }
    }
    
    // Remove duplicates and sort
    const uniqueUrls = Array.from(new Set(allUrls)).sort();
    
    return uniqueUrls;
  } catch (error) {
    throw new Error(`Failed to parse sitemap index: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

