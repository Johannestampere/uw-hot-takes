"use client";

import { useState, useRef } from "react";
import { Take } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReportModal from "./ReportModal";

interface TakeCardProps {
  take: Take;
  onLike?: (id: string) => void;
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

export default function TakeCard({ take, onLike }: TakeCardProps) {
  const router = useRouter();
  const [showReportModal, setShowReportModal] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const clickCount = useRef(0);

  const handleLike = () => {
    if (!take.user_liked) {
      setIsLikeAnimating(true);
      setTimeout(() => setIsLikeAnimating(false), 200);
    }
    onLike?.(take.id);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Ignore clicks on interactive elements (buttons, links)
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }

    clickCount.current += 1;

    if (clickCount.current === 1) {
      // First click - wait to see if it's a double click
      clickTimeout.current = setTimeout(() => {
        if (clickCount.current === 1) {
          // Single click - open comments
          router.push(`/takes/${take.id}`);
        }
        clickCount.current = 0;
      }, 250);
    } else if (clickCount.current === 2) {
      // Double click - like
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
      }
      clickCount.current = 0;
      handleLike();
    }
  };
  
  return (
    <>
      <div 
        className="p-4 border border-[rgba(74,_74,_74,_0.93)] rounded-[20px] bg-zinc-900 hover:bg-zinc-800
    hover:-translate-y-0.5
    hover:scale-[1.01] hover:border-[rgba(227, 213, 107, 0.93)] cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex items-start justify-between mb-2">
          <p className="text-zinc-100 whitespace-pre-wrap break-words flex-1 text-[18px]">
            {take.content}
          </p>

        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="font-medium text-zinc-400 text-bold">{take.username}</span>
            <span className="text-zinc-500">{formatTimeAgo(take.created_at)}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/takes/${take.id}`}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-[#ffd700] transition-all duration-150 clickable"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{take.comment_count}</span>
            </Link>
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-all duration-150 clickable ${
                take.user_liked
                  ? "text-[#ffd700]"
                  : "text-zinc-400 hover:text-[#ffd700]"
              } ${isLikeAnimating ? "like-pop" : ""}`}
            >
              <svg className="w-4 h-4" fill={take.user_liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className={take.user_liked ? "text-[#ffd700]" : ""}>{take.like_count}</span>
            </button>
          </div>
        </div>
      </div>

      {showReportModal && (
        <ReportModal
          targetType="take"
          targetId={take.id}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  );
}