"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Take, Comment } from "@/lib/api";
import TakeCard from "@/components/TakeCard";
import CommentsList from "@/components/CommentsList";
import CommentComposer from "@/components/CommentComposer";
import { useCommentsWebSocket } from "@/lib/useCommentsWebSocket";

export default function TakeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const takeId = params.id as string;

  const [take, setTake] = useState<Take | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommentsLoading, setIsCommentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const recentlyPostedCommentIds = useRef<Set<string>>(new Set());
  const pendingCommentContent = useRef<string | null>(null);

  // Check auth status
  useEffect(() => {
    api.getMe()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Fetch take
  useEffect(() => {
    api.getTake(takeId)
      .then((data) => {
        setTake(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load take");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [takeId]);

  // Fetch comments
  useEffect(() => {
    api.getComments(takeId)
      .then((data) => {
        setComments(data.comments);
      })
      .catch((err) => {
        console.error("Failed to load comments:", err);
      })
      .finally(() => {
        setIsCommentsLoading(false);
      });
  }, [takeId]);

  // Handle like/unlike
  const handleLike = async (id: string) => {
    if (!isAuthenticated) {
      alert("Please sign in to like takes");
      return;
    }

    if (!take) return;

    // Optimistic update
    setTake({
      ...take,
      user_liked: !take.user_liked,
      like_count: take.user_liked ? take.like_count - 1 : take.like_count + 1,
    });

    try {
      if (take.user_liked) {
        await api.unlikeTake(id);
      } else {
        await api.likeTake(id);
      }
    } catch (err) {
      // Revert on error
      setTake({
        ...take,
        user_liked: take.user_liked,
        like_count: take.like_count,
      });
      setError(err instanceof Error ? err.message : "Failed to like/unlike");
    }
  };

  // WebSocket: Listen for new comments
  useCommentsWebSocket({
    takeId,
    onNewComment: (newComment) => {
      // Skip if this is a comment we just posted (avoid duplicate)
      if (recentlyPostedCommentIds.current.has(newComment.id)) return;
      // Skip if this matches content we're currently posting (WebSocket arrived before POST response)
      if (pendingCommentContent.current && newComment.content === pendingCommentContent.current) return;
      setComments((prev) => {
        // Check if comment already exists (avoid duplicates)
        if (prev.some((c) => c.id === newComment.id)) return prev;
        return [...prev, newComment];
      });
      // Update comment count
      if (take) {
        setTake({ ...take, comment_count: take.comment_count + 1 });
      }
    },
  });

  // Handle comment submission
  const handleCommentSubmit = async (content: string) => {
    // Track content before request to catch early WebSocket messages
    pendingCommentContent.current = content;
    const newComment = await api.createComment(takeId, content);
    pendingCommentContent.current = null;
    // Track this ID to avoid duplicate from WebSocket
    recentlyPostedCommentIds.current.add(newComment.id);
    setComments((prev) => [...prev, newComment]);
    if (take) {
      setTake({ ...take, comment_count: take.comment_count + 1 });
    }
    // Clear after 5 seconds
    setTimeout(() => recentlyPostedCommentIds.current.delete(newComment.id), 5000);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-zinc-200 hover:text-zinc-300 transition-colors"
        >
          ← Back
        </button>
        <div className="animate-pulse">
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !take) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-zinc-200 hover:text-zinc-300 transition-colors"
        >
          ← Back
        </button>
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error || "Take not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        onClick={() => router.back()}
        className="mb-4 text-zinc-200 hover:text-zinc-400 transition-colors"
      >
        ← Back
      </button>

      <TakeCard take={take} onLike={handleLike} />

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Comments ({take.comment_count})
        </h3>

        {isAuthenticated && (
          <CommentComposer onSubmit={handleCommentSubmit} />
        )}

        {isCommentsLoading ? (
          <div className="mt-4 space-y-3">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg animate-pulse"
              >
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="mt-4 text-center py-8 text-gray-500 dark:text-gray-400">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <CommentsList comments={comments} />
        )}
      </div>
    </div>
  );
}
