import json
from typing import Any
import redis.asyncio as redis
from app.config import get_settings

settings = get_settings()

# Global Redis connection pool
_redis_pool = None

# Get Redis connection from pool
async def get_redis() -> redis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = redis.ConnectionPool.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return redis.Redis(connection_pool=_redis_pool)

# Close Redis connection
async def close_redis():
    global _redis_pool
    if _redis_pool:
        await _redis_pool.disconnect()
        _redis_pool = None

# Publish a message to a Redis channel
async def publish_message(channel: str, message: dict[str, Any]):
    redis_client = await get_redis()
    await redis_client.publish(channel, json.dumps(message))

# Subscribe to a Redis channel and yield messages
async def subscribe_channel(channel: str):
    redis_client = await get_redis()
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    yield data
                except json.JSONDecodeError:
                    continue
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()