"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface ReportModalProps {
  targetType: "take" | "comment";
  targetId: string;
  onClose: () => void;
}

export default function ReportModal({
  targetType,
  targetId,
  onClose,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const maxLength = 500;
  const remainingChars = maxLength - reason.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("Please provide a reason for reporting");
      return;
    }

    if (trimmedReason.length > maxLength) {
      setError(`Reason cannot exceed ${maxLength} characters`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createReport(targetType, targetId, trimmedReason);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full">
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Report Submitted
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Tnx for helping keep the community safe.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Report {targetType === "take" ? "Take" : "Comment"}
        </h3>

        <form onSubmit={handleSubmit}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please describe why you're reporting this content..."
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            rows={5}
            disabled={isSubmitting}
            autoFocus
          />

          <div className="mt-2 text-sm text-right">
            <span
              className={
                remainingChars < 0
                  ? "text-red-500"
                  : remainingChars < 50
                  ? "text-yellow-500"
                  : "text-gray-500 dark:text-gray-400"
              }
            >
              {remainingChars} characters remaining
            </span>
          </div>

          {error && (
            <div className="mt-3 text-sm text-red-500">{error}</div>
          )}

          <div className="mt-4 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim() || remainingChars < 0}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}