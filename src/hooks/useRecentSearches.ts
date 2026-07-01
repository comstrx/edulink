/**
 * useRecentSearches — Track and cache recent search terms locally.
 * Enhances search suggestions with user's actual search history.
 */
import { useState, useEffect } from "react";

const STORAGE_KEY = "edulink_recent_searches";
const MAX_RECENT_SEARCHES = 10;

export interface RecentSearch {
  query: string;
  timestamp: number;
  count: number;
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentSearch[];
        // Filter out searches older than 30 days
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const filtered = parsed.filter(s => s.timestamp > thirtyDaysAgo);
        setRecentSearches(filtered);
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  const addSearch = (query: string) => {
    if (!query.trim()) return;

    const normalizedQuery = query.trim().toLowerCase();
    
    setRecentSearches(prev => {
      // Find existing search or create new one
      const existing = prev.find(s => s.query.toLowerCase() === normalizedQuery);
      let updated: RecentSearch[];
      
      if (existing) {
        // Increment count and update timestamp
        updated = prev.map(s => 
          s === existing 
            ? { ...s, count: s.count + 1, timestamp: Date.now() }
            : s
        );
      } else {
        // Add new search
        const newSearch: RecentSearch = {
          query: query.trim(),
          timestamp: Date.now(),
          count: 1,
        };
        updated = [newSearch, ...prev];
      }

      // Sort by frequency and recency, then limit
      updated = updated
        .sort((a, b) => {
          // Primary: sort by count (frequency)
          if (b.count !== a.count) return b.count - a.count;
          // Secondary: sort by timestamp (recency)
          return b.timestamp - a.timestamp;
        })
        .slice(0, MAX_RECENT_SEARCHES);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }

      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  return {
    recentSearches,
    addSearch,
    clearRecentSearches,
  };
}