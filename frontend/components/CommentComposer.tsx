"use client";

import { useState } from "react";

interface CommentComposerProps {
  onSubmit: (content: string) => Promise<void>;
}

export default function CommentComposer({ onSubmit }: CommentComposerProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxLength = 300;
  const remainingChars = maxLength - content.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError("Comment cannot be empty");
      return;
    }

    if (trimmedContent.length > maxLength) {
      setError(`Comment cannot exceed ${maxLength} characters`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(trimmedContent);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment..."
        className="w-full p-4 border border-[rgba(255,215,0,0.6)] rounded-xl bg-zinc-900 text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-[#ffd700] disabled:opacity-50 transition-all duration-150"
        rows={3}
        disabled={isSubmitting}
      />
      <div className="mt-2 flex items-center justify-between">
        <span
          className={`text-sm ${
            remainingChars < 0
              ? "text-red-500"
              : remainingChars < 50
              ? "text-yellow-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {remainingChars} characters remaining
        </span>
        <button
          type="submit"
          disabled={isSubmitting || !content.trim() || remainingChars < 0}
          className="px-5 py-2.5 bg-[#ffd700] text-black font-medium rounded-lg hover:bg-[#e6c200] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 clickable"
        >
          {isSubmitting ? "Posting..." : "Post Comment"}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-500">{error}</div>
      )}
    </form>
  );
}
