from datetime import datetime, timedelta, timezone
from uuid import UUID
import jwt
from app.config import get_settings

ALGORITHM = "HS256"
SESSION_EXPIRE_DAYS = 7

def create_session_token(user_id: UUID) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRE_DAYS)
    payload = {
        "user_id": str(user_id),
        "exp": expire,
    }

    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)

def verify_session_token(token: str) -> UUID | None:
    settings = get_settings()

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return UUID(payload["user_id"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None