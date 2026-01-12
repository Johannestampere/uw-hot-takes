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
        placeholder="What's your hot take?"
        disabled={disabled || isSubmitting}
        className="w-full p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        rows={3}
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${
              isOverLimit ? "text-red-500" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {charCount}/{MAX_LENGTH}
          </span>
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
        <button
          type="submit"
          disabled={isEmpty || isOverLimit || isSubmitting || disabled}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
