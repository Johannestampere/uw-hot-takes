import { useEffect, useRef, useCallback } from "react";

interface WebSocketMessage {
  type: string;
  data: any;
}

interface UseWebSocketOptions {
  onMessage: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const shouldConnectRef = useRef(true);

  const {
    onMessage,
    onError,
    reconnectInterval = 1000,
    maxReconnectAttempts = 5,
  } = options;

  const connect = useCallback(() => {
    if (!shouldConnectRef.current) return;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`WebSocket connected: ${url}`);
        reconnectAttemptsRef.current = 0;

        // Send heartbeat every 30 seconds
        const heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 30000);

        ws.addEventListener("close", () => {
          clearInterval(heartbeatInterval);
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (
          shouldConnectRef.current &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          const delay =
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`Reconnecting in ${delay}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
    }
  }, [url, onMessage, onError, reconnectInterval, maxReconnectAttempts]);

  useEffect(() => {
    shouldConnectRef.current = true;
    connect();

    return () => {
      shouldConnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return wsRef;
}
