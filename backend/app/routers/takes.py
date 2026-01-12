from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, Take
from app.schemas.schemas import TakeCreate, TakeResponse
from app.dependencies import get_current_user
from app.utils.profanity import contains_profanity

router = APIRouter(prefix="/takes", tags=["takes"])

@router.post("", response_model=TakeResponse)
async def create_take(
    request: TakeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if contains_profanity(request.content):
        raise HTTPException(status_code=400, detail="Content contains inappropriate language")

    take = Take(
        user_id=current_user.id,
        content=request.content,
    )
    db.add(take)
    await db.flush()
    await db.refresh(take)

    return TakeResponse(
        id=take.id,
        content=take.content,
        like_count=take.like_count,
        created_at=take.created_at,
        username=current_user.username,
        user_liked=False,
    )
