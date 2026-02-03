"use client";

import { useState } from "react";

interface TakeComposerProps {
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
}

const MAX_LENGTH = 500;

export default function TakeComposer({ onSubmit, disabled }: TakeComposerProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_LENGTH;
  const isEmpty = content.trim().length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmpty || isOverLimit || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(content.trim());
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="drop your waterloo hot take"
        disabled={disabled || isSubmitting}
        className="w-full p-4 border border-[rgba(255,215,0,0.6)] rounded-xl bg-zinc-900 text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-[#ffd700] disabled:opacity-50 transition-all duration-150"
        rows={3}
      />
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${
              isOverLimit ? "text-red-500" : "text-zinc-400"
            }`}
          >
            {charCount}/{MAX_LENGTH}
          </span>
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
        <button
          type="submit"
          disabled={isEmpty || isOverLimit || isSubmitting || disabled}
          className="px-5 py-2.5 bg-[#ffd700] text-black font-medium rounded-lg hover:bg-[#e6c200] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 clickable"
        >
          {isSubmitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}