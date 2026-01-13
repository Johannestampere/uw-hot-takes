import { Comment } from "@/lib/api";

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
  return (
    <div className="mt-4 space-y-3">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900"
        >
          <p className="text-gray-900 dark:text-gray-100 text-sm whitespace-pre-wrap break-words">
            {comment.content}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">{comment.username}</span>
            <span>•</span>
            <span>{formatTimeAgo(comment.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
