import { Take } from "@/lib/api";

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
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900">
      <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
        {take.content}
      </p>
      <div className="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <span className="font-medium">{take.username}</span>
          <span>{formatTimeAgo(take.created_at)}</span>
        </div>
        <button
          onClick={() => onLike?.(take.id)}
          className={`flex items-center gap-1 transition-colors ${
            take.user_liked
              ? "text-red-500"
              : "hover:text-red-500"
          }`}
        >
          <span>{take.user_liked ? "♥" : "♡"}</span>
          <span>{take.like_count}</span>
        </button>
      </div>
    </div>
  );
}
