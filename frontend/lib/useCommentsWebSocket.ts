import { useWebSocket } from "./useWebSocket";
import { Comment } from "./api";
import { config } from "./config";

interface UseCommentsWebSocketOptions {
  takeId: string;
  onNewComment?: (comment: Comment) => void;
}

export function useCommentsWebSocket(options: UseCommentsWebSocketOptions) {
  const { takeId, onNewComment } = options;

  // Convert HTTP URL to WebSocket URL
  const wsUrl =
    config.apiBaseUrl.replace(/^http/, "ws") +
    `/ws/takes/${takeId}/comments`;

  useWebSocket(wsUrl, {
    onMessage: (message) => {
      if (message.type === "new_comment" && onNewComment) {
        onNewComment(message.data);
      }
    },
    onError: (error) => {
      console.error("Comments WebSocket error:", error);
    },
  });
}
