"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, Take, SortOption } from "@/lib/api";
import TakeCard from "@/components/TakeCard";
import TakeComposer from "@/components/TakeComposer";
import SortToggle from "@/components/SortToggle";

export default function Home() {
  const [takes, setTakes] = useState<Take[]>([]);
  const [sort, setSort] = useState<SortOption>("newest");
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Check auth status
  useEffect(() => {
    api.getMe()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Fetch takes
  const fetchTakes = useCallback(async (sortOption: SortOption, cursorValue?: string) => {
    try {
      const response = await api.getTakes(sortOption, cursorValue);
      return response;
    } catch (err) {
      throw err;
    }
  }, []);

  // Initial load and sort change
  useEffect(() => {
    setIsLoading(true);
    setTakes([]);
    setCursor(null);
    setHasMore(true);
    setError(null);

    fetchTakes(sort)
      .then((response) => {
        setTakes(response.takes);
        setCursor(response.next_cursor);
        setHasMore(response.next_cursor !== null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load takes");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [sort, fetchTakes]);

  // Load more (infinite scroll)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursor) return;

    setIsLoadingMore(true);
    try {
      const response = await fetchTakes(sort, cursor);
      setTakes((prev) => [...prev, ...response.takes]);
      setCursor(response.next_cursor);
      setHasMore(response.next_cursor !== null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, cursor, sort, fetchTakes]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, isLoadingMore, loadMore]);

  // Handle new take submission
  const handleSubmit = async (content: string) => {
    const newTake = await api.createTake(content);
    setTakes((prev) => [newTake, ...prev]);
  };

  // Handle like (placeholder - will implement in Phase 5)
  const handleLike = (id: string) => {
    if (!isAuthenticated) {
      alert("Please sign in to like takes");
      return;
    }
    // TODO: Implement like API call
    console.log("Like:", id);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Feed</h2>
        <SortToggle value={sort} onChange={setSort} />
      </div>

      {isAuthenticated && <TakeComposer onSubmit={handleSubmit} />}

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : takes.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No takes yet. Be the first to share your hot take!
        </div>
      ) : (
        <div className="space-y-4">
          {takes.map((take) => (
            <TakeCard key={take.id} take={take} onLike={handleLike} />
          ))}

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
            {isLoadingMore && (
              <div className="text-gray-500 dark:text-gray-400">Loading more...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
