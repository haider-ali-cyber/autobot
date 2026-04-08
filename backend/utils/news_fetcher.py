import feedparser
import time
from datetime import datetime, timezone
from typing import List, Dict
from ..utils.logger import logger

class NewsFetcher:
    """
    Fetches real-time crypto news via RSS feeds and tracks global market sessions.
    """
    
    FEEDS = [
        "https://cointelegraph.com/rss/tag/bitcoin",
        "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "https://cryptopanic.com/news/rss/" # Public RSS (limited)
    ]

    def __init__(self):
        self._last_fetch = 0
        self._cached_news = []
        self._cache_ttl = 600 # 10 minutes

    def get_market_sessions(self) -> List[Dict]:
        """
        Returns status of Tokyo, London, and New York market sessions.
        Times in UTC.
        """
        now = datetime.now(timezone.utc)
        hour = now.hour
        
        sessions = [
            {"name": "Tokyo", "hours": (0, 9), "icon": "🇯🇵"},
            {"name": "London", "hours": (8, 17), "icon": "🇬🇧"},
            {"name": "New York", "hours": (13, 22), "icon": "🇺🇸"}
        ]
        
        result = []
        for s in sessions:
            start, end = s["hours"]
            is_open = start <= hour < end
            
            # Simple countdown to next open/close
            if is_open:
                status = "OPEN"
                time_left = end - hour
            else:
                status = "CLOSED"
                time_left = (start - hour) % 24
                
            result.append({
                "name": s["name"],
                "status": status,
                "icon": s["icon"],
                "is_open": is_open,
                "time_left_hours": time_left
            })
            
        return result

    def fetch_news(self) -> List[Dict]:
        """
        Parses RSS feeds and returns a list of news headlines.
        """
        import requests
        current_time = time.time()
        if current_time - self._last_fetch < self._cache_ttl and self._cached_news:
            return self._cached_news

        news_items = []
        for url in self.FEEDS:
            try:
                # Use requests with timeout to avoid hanging the backend
                resp = requests.get(url, timeout=5, headers={'User-Agent': 'Mozilla/5.0'})
                if resp.status_code == 200:
                    feed = feedparser.parse(resp.content)
                    for entry in feed.entries[:5]: 
                        news_items.append({
                            "title": entry.title,
                            "link": entry.link,
                            "published": getattr(entry, 'published', 'Recently'),
                            "source": url.split('/')[2]
                        })
            except Exception as e:
                logger.warning(f"Failed to fetch news from {url}: {e}")

        if news_items:
            self._cached_news = news_items[:15]
            self._last_fetch = current_time
        
        return self._cached_news

news_fetcher = NewsFetcher()
