"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, Take, SortOption } from "@/lib/api";
import TakeCard from "@/components/TakeCard";
import TakeComposer from "@/components/TakeComposer";
import SortToggle from "@/components/SortToggle";
import { useFeedWebSocket } from "@/lib/useFeedWebSocket";
import { useAuth } from "@/lib/AuthContext";

export default function Home() {
  const { user } = useAuth();
  const [takes, setTakes] = useState<Take[]>([]);
  const [sort, setSort] = useState<SortOption>("newest");
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const recentlyPostedIds = useRef<Set<string>>(new Set());
  const pendingPostContent = useRef<string | null>(null);

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
    // Track content before request to catch early WebSocket messages
    pendingPostContent.current = content;
    const newTake = await api.createTake(content);
    pendingPostContent.current = null;
    // Track this ID to avoid duplicate from WebSocket
    recentlyPostedIds.current.add(newTake.id);
    setTakes((prev) => [newTake, ...prev]);
    // Clear after 5 seconds
    setTimeout(() => recentlyPostedIds.current.delete(newTake.id), 5000);
  };

  // WebSocket: Listen for feed updates
  useFeedWebSocket({
    onNewTake: (newTake) => {
      // Skip if this is a take we just posted (avoid duplicate)
      if (recentlyPostedIds.current.has(newTake.id)) return;
      // Skip if this matches content we're currently posting (WebSocket arrived before POST response)
      if (pendingPostContent.current && newTake.content === pendingPostContent.current) return;

      // Only add to feed if on newest sort
      if (sort === "newest") {
        setTakes((prev) => {
          // Check if take already exists (avoid duplicates)
          if (prev.some((t) => t.id === newTake.id)) return prev;
          return [newTake, ...prev];
        });
      }
    },
    onLikeUpdate: (takeId, likeCount) => {
      setTakes((prev) =>
        prev.map((t) => (t.id === takeId ? { ...t, like_count: likeCount } : t))
      );
    },
  });

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle like/unlike
  const handleLike = async (id: string) => {
    if (!user) {
      setToast("Please sign in to like takes");
      return;
    }

    const take = takes.find((t) => t.id === id);
    if (!take) return;

    // Optimistic update
    setTakes((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              user_liked: !t.user_liked,
              like_count: t.user_liked ? t.like_count - 1 : t.like_count + 1,
            }
          : t
      )
    );

    try {
      if (take.user_liked) {
        await api.unlikeTake(id);
      } else {
        await api.likeTake(id);
      }
    } catch (err) {
      // Revert on error
      setTakes((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                user_liked: take.user_liked,
                like_count: take.like_count,
              }
            : t
        )
      );
      setError(err instanceof Error ? err.message : "Failed to like/unlike");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-zinc-100">Feed</h2>
        <SortToggle value={sort} onChange={setSort} />
      </div>

      {user && <TakeComposer onSubmit={handleSubmit} />}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 text-red-400 rounded-xl">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="p-4 border border-[rgba(255,215,0,0.6)] rounded-xl bg-zinc-900"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-3 w-16" />
              </div>
              <div className="skeleton h-4 w-full mb-2" />
              <div className="skeleton h-4 w-3/4 mb-4" />
              <div className="flex items-center gap-4">
                <div className="skeleton h-5 w-12" />
                <div className="skeleton h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : takes.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
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
              <div className="text-zinc-400">Loading more...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
