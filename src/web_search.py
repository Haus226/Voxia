# from duckduckgo_search import DDGS
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from typing import Dict, List, Optional
import cohere
from dotenv import load_dotenv
from googleapiclient.discovery import build
import os
from concurrent.futures import ThreadPoolExecutor


# Load environment variables
load_dotenv(".env")

# Initialize Cohere client
co = cohere.Client(os.getenv('COHERE_API_KEY'))
# ddg = DDGS()
API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")
CSE_ID = os.getenv('CSE_ID')



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

def normalize_title(title: str) -> str:
    """Normalize title for comparison by removing special characters and whitespace."""
    # Remove special characters and convert to lowercase
    title = re.sub(r'[^\w\s]', '', title.lower())
    # Remove extra whitespace
    title = ' '.join(title.split())
    return title

def scrape_webpage(url: str, max_length: int = 1000) -> Optional[Dict[str, str]]:
    """Scrape content from a webpage with rate limiting and error handling."""
    try:
        if is_ad_link(url):
            return None
            
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=5)
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
        # print(f"Error scraping {url}: {str(e)}")
        return None
    
def scrape_with_threading(urls: List[str], max_length: int = 1000) -> List[Dict[str, str]]:
    """Scrape using ThreadPoolExecutor."""
    with ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(scrape_webpage, urls, [max_length] * len(urls)))
    return [result for result in results if result is not None]

def search(query, num_results=5):
    """
    Perform a Google Custom Search and return more information.

    Args:
        query (str): Search query.
        api_key (str): Google API key.
        cse_id (str): Custom Search Engine ID (CX).
        num_results (int): Number of results to fetch (default is 5).

    Returns:
        list: A list of search results with title, URL, snippet, and image (if available).
    """
    try:
        
        # Build the service
        service = build("customsearch", "v1", developerKey=API_KEY)
        # Perform the search
        processed_results = []
        for s in range(3):
            # Maximum of 10 results per request
            # Use start to specify the starting index which navigate to next 10 results
            response = service.cse().list(q=query, cx=CSE_ID, num=10, 
                                        start=10 * s + 1).execute()
            # Extract results
            results = response.get("items", [])

            # Process results to include additional info
            for item in results:
                result_data = {
                    "title": item.get("title"),
                    "link": item.get("link"),
                    "snippet": item.get("snippet"),
                }
                processed_results.append(result_data)

        return processed_results
    except Exception as e:
        print(f"An error occurred: {e}")
        return []

def search_web(search_query: str, rerank_qeury, num_scrape=30, num_rerank=5) -> List[Dict]:
    """
    Perform web search with content scraping, ad filtering, and Cohere reranking.
    Removes duplicate titles from search results.
    """
    try:
        # Get initial results from DuckDuckGo
        # results = list(ddg.text(search_query, max_results=num_scrape, safesearch="off", region="us-en", timelimit="y"))
        results = search(search_query, num_results=num_scrape)
        # Track seen titles to avoid duplicates
        seen_titles = set()
        documents = []
        urls_to_scrape = []
        for r in results:
            url = r['link']
            normalized_title = normalize_title(r['title'])
            if normalized_title in seen_titles or is_ad_link(url):
                continue
            urls_to_scrape.append(url)
            seen_titles.add(normalized_title)

        # Scrape multiple pages asynchronously
        scraped_data = scrape_with_threading(urls_to_scrape)
        
        # Combine scraped content with search results
        for r, scraped_content in zip(results, scraped_data):
            documents.append({
                'title': r['title'],
                'link': r['link'],
                'snippet': r['snippet'],
                'detailed_content': scraped_content['content']
            })
        
        if not documents:
            return []
        
        print("\nUnique documents found:")
        for idx, d in enumerate(documents):
            print(f"{idx + 1}. {d['title']}")
            
        # Prepare documents for reranking
        texts = [f"Title: {doc['title']}\nSnippet: {doc['snippet']}\nContent: {doc['detailed_content']}" for doc in documents]
        # Rerank documents using Cohere
        results = co.rerank(
            query=rerank_qeury,
            documents=texts,
            top_n=min(num_rerank, len(documents)),  # Make sure we don't request more than we have
            model='rerank-v3.5'
        )
        
        print("\nReranked results:")
        for idx, result in enumerate(results.results):
            print(f"{idx + 1}. {documents[result.index]['title']}")
        
        reranked_documents = [documents[result.index] for result in results.results]
        return reranked_documents
        
    except Exception as e:
        print(f"Search error: {e}")
        return []
    