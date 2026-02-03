"use client";

import { useRef } from "react";
import { Take } from "@/lib/api";
import { useRouter } from "next/navigation";

interface TopTakeCardProps {
  take: Take;
  onLike?: (id: string) => void;
}

export default function TopTakeCard({ take, onLike }: TopTakeCardProps) {
  const router = useRouter();
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const clickCount = useRef(0);

  const handleLike = () => {
    onLike?.(take.id);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }

    clickCount.current += 1;

    if (clickCount.current === 1) {
      clickTimeout.current = setTimeout(() => {
        if (clickCount.current === 1) {
          router.push(`/takes/${take.id}`);
        }
        clickCount.current = 0;
      }, 250);
    } else if (clickCount.current === 2) {
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
      }
      clickCount.current = 0;
      handleLike();
    }
  };

  return (
    <div
      className="p-4 border border-[rgba(74,_74,_74,_0.93)] rounded-[20px] bg-zinc-900 hover:bg-zinc-800 cursor-pointer transition-all duration-150"
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wide">
          Trending
        </span>
      </div>
      <p className="text-zinc-100 text-[15px] line-clamp-2 mb-2">
        {take.content}
      </p>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span className="font-medium">{take.username}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {take.comment_count}
          </span>
          <span className={`flex items-center gap-1 ${take.user_liked ? "text-red-400" : ""}`}>
            <svg className="w-3.5 h-3.5" fill={take.user_liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {take.like_count}
          </span>
        </div>
      </div>
    </div>
  );
}