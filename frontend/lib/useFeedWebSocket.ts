import { useWebSocket } from "./useWebSocket";
import { Take } from "./api";
import { config } from "./config";

interface UseFeedWebSocketOptions {
  onNewTake?: (take: Take) => void;
  onLikeUpdate?: (takeId: string, likeCount: number) => void;
  onDeleteTake?: (takeId: string) => void;
}

export function useFeedWebSocket(options: UseFeedWebSocketOptions) {
  const { onNewTake, onLikeUpdate, onDeleteTake } = options;

  // Convert HTTP URL to WebSocket URL
  const wsUrl = config.apiBaseUrl.replace(/^http/, "ws") + "/ws/feed";

  useWebSocket(wsUrl, {
    onMessage: (message) => {
      if (message.type === "new_take" && onNewTake) {
        onNewTake(message.data as Take);
      } else if (message.type === "like_update" && onLikeUpdate) {
        onLikeUpdate(message.data.id, message.data.like_count);
      } else if (message.type === "delete_take" && onDeleteTake) {
        onDeleteTake(message.data.id);
      }
    },
    onError: (error) => {
      console.error("Feed WebSocket error:", error);
    },
  });
}
