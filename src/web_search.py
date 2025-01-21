from duckduckgo_search import DDGS
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import time
from typing import Dict, List, Optional

ddg = DDGS()

def is_ad_link(url: str) -> bool:
    """Check if a URL is likely to be an advertisement link."""
    ad_indicators = [
        '/ads/', 'ad.', 'advert', 'sponsor', 
        'promoted', 'pixel', 'tracking',
        'doubleclick', 'analytics', 'campaign',
        'banner', 'clickthrough', 'affiliate',
        'promo', 'commerc'
    ]
    
    ad_domains = {
        'doubleclick.net', 'google-analytics.com', 
        'googleadservices.com', 'advertising.com',
        'adnxs.com', 'outbrain.com', 'taboola.com',
        'amazon-adsystem.com', 'clickbank.net'
    }
    
    url_lower = url.lower()
    parsed_url = urlparse(url_lower)
    domain = parsed_url.netloc
    
    return any(ad_domain in domain for ad_domain in ad_domains) or \
           any(indicator in url_lower for indicator in ad_indicators)

def scrape_webpage(url: str, max_length: int = 1000) -> Optional[Dict[str, str]]:
    """Scrape content from a webpage with rate limiting and error handling."""
    try:
        if is_ad_link(url):
            return None
            
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        time.sleep(1)  # Rate limiting
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove unwanted elements
        for element in soup.find_all(['script', 'style', 'nav', 'footer', 'iframe']):
            element.decompose()
            
        title = soup.title.string if soup.title else ''
        
        # Try to find main content
        content_tags = soup.find_all(['article', 'main', 'div[role="main"]'])
        if content_tags:
            main_content = ' '.join([tag.get_text(strip=True) for tag in content_tags])
        else:
            paragraphs = soup.find_all('p')
            main_content = ' '.join([p.get_text(strip=True) for p in paragraphs])
            
        main_content = re.sub(r'\s+', ' ', main_content).strip()
        
        if len(main_content) > max_length:
            main_content = main_content[:max_length] + '...'
            
        return {
            'title': title,
            'content': main_content,
            'url': url
        }
        
    except Exception as e:
        print(f"Error scraping {url}: {str(e)}")
        return None

def search_web(query, num_results=5):
    """Perform web search with content scraping and ad filtering."""
    try:
        results = list(ddg.text(query, max_results=num_results, safesearch="off", region="us-en", timelimit="y"))
        
        filtered_results = []
        for r in results:
            url = r['href']
            if not is_ad_link(url):
                # Try to scrape additional content
                scraped_content = scrape_webpage(url)
                if scraped_content:
                    filtered_results.append({
                        'title': r['title'],
                        'link': url,
                        'snippet': r['body'],
                        'detailed_content': scraped_content['content']
                    })
                    
            if len(filtered_results) >= 3:  # Limit to 3 detailed results
                break
                
        return filtered_results
    except Exception as e:
        print(f"Search error: {e}")
        return []