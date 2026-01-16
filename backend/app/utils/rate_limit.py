from datetime import timedelta
from fastapi import HTTPException, Request
from app.utils.redis_client import get_redis
from app.config import get_settings

# Check if a certain rate limit has been exceeded
async def check_rate_limit(
    key: str,
    max_requests: int,
    window_seconds: int,
) -> None:
    settings = get_settings()
    if settings.debug:
        return  # Skip rate limiting in debug mode

    redis_client = await get_redis()

    # Increment counter
    current = await redis_client.incr(key)

    # Set expiry on first request
    if current == 1:
        await redis_client.expire(key, window_seconds)

    # Check if limit exceeded
    if current > max_requests:
        ttl = await redis_client.ttl(key)
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {ttl} seconds."
        )

async def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    return request.client.host if request.client else "unknown"