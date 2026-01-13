import { useEffect } from "react";
import { useWebSocket } from "./useWebSocket";
import { Take } from "./api";
import { config } from "./config";

interface FeedMessage {
  type: "new_take" | "like_update";
  data: any;
}

interface UseFeedWebSocketOptions {
  onNewTake?: (take: Take) => void;
  onLikeUpdate?: (takeId: string, likeCount: number) => void;
  enabled?: boolean;
}

export function useFeedWebSocket(options: UseFeedWebSocketOptions) {
  const { onNewTake, onLikeUpdate, enabled = true } = options;

  // Convert HTTP URL to WebSocket URL
  const wsUrl = config.apiBaseUrl.replace(/^http/, "ws") + "/ws/feed";

  useWebSocket(wsUrl, {
    onMessage: (message: FeedMessage) => {
      if (message.type === "new_take" && onNewTake) {
        onNewTake(message.data as Take);
      } else if (message.type === "like_update" && onLikeUpdate) {
        onLikeUpdate(message.data.id, message.data.like_count);
      }
    },
    onError: (error) => {
      console.error("Feed WebSocket error:", error);
    },
  });
}
