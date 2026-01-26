"use client";

import { useState } from "react";
import { Comment } from "@/lib/api";
import ReportModal from "./ReportModal";

interface CommentsListProps {
  comments: Comment[];
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function CommentsList({ comments }: CommentsListProps) {
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

  return (
    <>
      <div className="mt-4 space-y-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="p-3 border border-zinc-600 rounded-[8px] bg-zinc-900/70"
          >
            <div className="flex items-start justify-between">
              <p className="text-zinc-200 text-[15px] whitespace-pre-wrap break-words flex-1">
                {comment.content}
              </p>
              <button
                onClick={() => setReportingCommentId(comment.id)}
                className="ml-2 text-zinc-500 hover:text-red-500 transition-all duration-150 text-xs"
                title="Report"
              >
                Report
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="font-medium text-zinc-400">{comment.username}</span>
              <span className="text-zinc-600">{formatTimeAgo(comment.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {reportingCommentId && (
        <ReportModal
          targetType="comment"
          targetId={reportingCommentId}
          onClose={() => setReportingCommentId(null)}
        />
      )}
    </>
  );
}
