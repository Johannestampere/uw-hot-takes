import asyncio
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.utils.websocket_manager import feed_manager, comments_manager

router = APIRouter(tags=["websocket"])

# Websocket endpoint for feed updates. Client receives new takes and like count updates
@router.websocket("/ws/feed")
async def websocket_feed(websocket: WebSocket):
    await feed_manager.connect(websocket)

    # Start listening to Redis in background
    redis_task = asyncio.create_task(feed_manager.listen_to_redis("feed"))

    try:
        # Keep connection alive and handle incoming messages (ping/pong)
        while True:
            try:
                # Wait for any message from client (heartbeat)
                await websocket.receive_text()
            except WebSocketDisconnect:
                break
    finally:
        feed_manager.disconnect(websocket)
        redis_task.cancel()

# WebSocket endpoint for comment updates on a specific take
# Clients receive new comments when they are posted
@router.websocket("/ws/takes/{take_id}/comments")
async def websocket_comments(websocket: WebSocket, take_id: UUID):
    take_id_str = str(take_id)
    await comments_manager.connect(take_id_str, websocket)

    try:
        # Keep connection alive and handle incoming messages (ping/pong)
        while True:
            try:
                # Wait for any message from client (heartbeat)
                await websocket.receive_text()
            except WebSocketDisconnect:
                break
    finally:
        comments_manager.disconnect(take_id_str, websocket)