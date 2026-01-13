import { useWebSocket } from "./useWebSocket";
import { Comment } from "./api";
import { config } from "./config";

interface CommentMessage {
  type: "new_comment";
  data: Comment;
}

interface UseCommentsWebSocketOptions {
  takeId: string;
  onNewComment?: (comment: Comment) => void;
  enabled?: boolean;
}

export function useCommentsWebSocket(options: UseCommentsWebSocketOptions) {
  const { takeId, onNewComment, enabled = true } = options;

  // Convert HTTP URL to WebSocket URL
  const wsUrl =
    config.apiBaseUrl.replace(/^http/, "ws") +
    `/ws/takes/${takeId}/comments`;

  useWebSocket(wsUrl, {
    onMessage: (message: CommentMessage) => {
      if (message.type === "new_comment" && onNewComment) {
        onNewComment(message.data);
      }
    },
    onError: (error) => {
      console.error("Comments WebSocket error:", error);
    },
  });
}
