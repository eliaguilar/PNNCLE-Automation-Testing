"""
Helper module for sitemap parsing.
"""
from typing import List
import re
import requests
from bs4 import BeautifulSoup


def parse_sitemap_urls(sitemap_content: str, base_url: str) -> List[str]:
    """
    Parse a sitemap.xml file and extract all URLs.
    
    Args:
        sitemap_content: The content of the sitemap.xml file
        base_url: Base URL to filter and normalize URLs
    
    Returns:
        List of URLs found in the sitemap
    """
    urls = []
    
    # Parse XML
    soup = BeautifulSoup(sitemap_content, 'xml')
    
    # Check if it's a sitemap index
    sitemaps = soup.find_all('sitemap')
    if sitemaps:
        # It's a sitemap index - return the sitemap URLs
        sitemap_urls = []
        for sitemap in sitemaps:
            loc = sitemap.find('loc')
            if loc:
                sitemap_urls.append(loc.text.strip())
        return sitemap_urls
    
    # It's a regular sitemap - extract URLs
    url_elements = soup.find_all('url')
    for url_elem in url_elements:
        loc = url_elem.find('loc')
        if loc:
            url = loc.text.strip()
            # Normalize URL
            if base_url in url:
                url = url.split('#')[0].split('?')[0]
                if url not in urls:
                    urls.append(url)
    
    return urls


def fetch_sitemap(sitemap_url: str) -> str:
    """
    Fetch sitemap content from a URL.
    
    Args:
        sitemap_url: URL of the sitemap
    
    Returns:
        Sitemap content as string
    """
    try:
        response = requests.get(sitemap_url, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        raise Exception(f"Failed to fetch sitemap from {sitemap_url}: {str(e)}")


def get_all_urls_from_sitemap_index(sitemap_index_url: str, base_url: str) -> List[str]:
    """
    Parse a sitemap index and fetch all URLs from all sitemaps.
    
    Args:
        sitemap_index_url: URL of the sitemap index
        base_url: Base URL to filter URLs
    
    Returns:
        List of all URLs found in all sitemaps
    """
    all_urls = []
    
    try:
        # Fetch the sitemap index
        index_content = fetch_sitemap(sitemap_index_url)
        
        # Parse to get individual sitemap URLs
        soup = BeautifulSoup(index_content, 'xml')
        sitemaps = soup.find_all('sitemap')
        
        if not sitemaps:
            # Not a sitemap index, try parsing as regular sitemap
            return parse_sitemap_urls(index_content, base_url)
        
        # Fetch and parse each sitemap
        for sitemap in sitemaps:
            loc = sitemap.find('loc')
            if loc:
                sitemap_url = loc.text.strip()
                try:
                    # Fetch the individual sitemap
                    sitemap_content = fetch_sitemap(sitemap_url)
                    
                    # Parse URLs from this sitemap
                    urls = parse_sitemap_urls(sitemap_content, base_url)
                    all_urls.extend(urls)
                    
                    print(f"  ✓ Fetched {len(urls)} URLs from {sitemap_url.split('/')[-1]}")
                except Exception as e:
                    print(f"  ⚠️  Could not fetch {sitemap_url}: {str(e)}")
                    continue
        
        # Remove duplicates and sort
        unique_urls = list(set(all_urls))
        unique_urls.sort()
        
        return unique_urls
        
    except Exception as e:
        raise Exception(f"Failed to parse sitemap index: {str(e)}")
