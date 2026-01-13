import asyncio
from typing import Set
from fastapi import WebSocket
from app.utils.redis_client import subscribe_channel

# Manages WebSocket connections and message broadcasting
class ConnectionManager:

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    # Accept and store a new WebSocket connection
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    # Send a message to all connected clients
    async def broadcast(self, message: dict):
        dead_connections = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)

        # Clean up dead connections
        self.active_connections -= dead_connections

    # Listen to Redis channel and broadcast messages to WebSocket clients
    async def listen_to_redis(self, channel: str):
        async for message in subscribe_channel(channel):
            await self.broadcast(message)

# Manages WebSocket connections for specific take comments
class TakeCommentsManager:

    def __init__(self):
        # Map of take_id -> set of WebSocket connections
        self.connections: dict[str, Set[WebSocket]] = {}
        # Map of take_id -> asyncio task listening to Redis
        self.redis_tasks: dict[str, asyncio.Task] = {}

    # Accept and store a new WebSocket connection for a specific take
    async def connect(self, take_id: str, websocket: WebSocket):
        await websocket.accept()

        if take_id not in self.connections:
            self.connections[take_id] = set()

        self.connections[take_id].add(websocket)

        # Start Redis listener if not already running
        if take_id not in self.redis_tasks or self.redis_tasks[take_id].done():
            self.redis_tasks[take_id] = asyncio.create_task(
                self._listen_to_redis(take_id)
            )

    def disconnect(self, take_id: str, websocket: WebSocket):
        if take_id in self.connections:
            self.connections[take_id].discard(websocket)

            # Clean up if no more connections
            if not self.connections[take_id]:
                del self.connections[take_id]
                if take_id in self.redis_tasks:
                    self.redis_tasks[take_id].cancel()
                    del self.redis_tasks[take_id]

    # Send a message to all clients subscribed to a specific take
    async def broadcast_to_take(self, take_id: str, message: dict):
        if take_id not in self.connections:
            return

        dead_connections = set()
        for connection in self.connections[take_id]:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)

        # Clean up dead connections
        self.connections[take_id] -= dead_connections

    # Listen to Redis channel for a specific take and broadcast messages
    async def _listen_to_redis(self, take_id: str):
        channel = f"comments:{take_id}"
        async for message in subscribe_channel(channel):
            await self.broadcast_to_take(take_id, message)

# Global instances
feed_manager = ConnectionManager()
comments_manager = TakeCommentsManager()