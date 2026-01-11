from fastapi import Depends, HTTPException, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User
from app.utils.jwt import verify_session_token

async def get_current_user(
    session: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> User:

    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = verify_session_token(session)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user

async def get_optional_user(
    session: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not session:
        return None

    user_id = verify_session_token(session)
    if not user_id:
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()