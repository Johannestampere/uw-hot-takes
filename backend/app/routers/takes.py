from datetime import datetime, timedelta, timezone
from enum import Enum
from uuid import UUID
import base64
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models import User, Take, Like, Comment
from app.schemas.schemas import TakeCreate, TakeResponse, TakesListResponse, CommentCreate, CommentResponse, CommentsListResponse
from app.dependencies import get_current_user, get_optional_user
from app.utils.profanity import contains_profanity
from app.utils.redis_client import publish_message
from app.utils.rate_limit import check_rate_limit

router = APIRouter(prefix="/takes", tags=["takes"])

class SortOption(str, Enum):
    newest = "newest"
    hottest_24h = "hottest_24h"
    hottest_7d = "hottest_7d"

def hot_score(likes: int, created_at: datetime) -> float:
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_hours = (now - created_at).total_seconds() / 3600
    gravity = 1.5
    return likes / ((age_hours + 2) ** gravity)

def encode_cursor(created_at: datetime, take_id: UUID) -> str:
    data = {"created_at": created_at.isoformat(), "id": str(take_id)}
    return base64.urlsafe_b64encode(json.dumps(data).encode()).decode()

def decode_cursor(cursor: str) -> tuple[datetime, UUID]:
    data = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
    return datetime.fromisoformat(data["created_at"]), UUID(data["id"])


@router.post("", response_model=TakeResponse)
async def create_take(
    http_request: Request,
    request: TakeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Rate limit: 5 takes per user per hour
    await check_rate_limit(
        key=f"post_take:{current_user.id}",
        max_requests=5,
        window_seconds=3600,
    )

    if contains_profanity(request.content):
        raise HTTPException(status_code=400, detail="Content contains inappropriate language")

    take = Take(
        user_id=current_user.id,
        content=request.content,
    )
    db.add(take)
    await db.flush()
    await db.refresh(take)

    response = TakeResponse(
        id=take.id,
        content=take.content,
        like_count=take.like_count,
        comment_count=0,
        created_at=take.created_at,
        username=current_user.username,
        user_liked=False,
    )

    # Broadcast new take to feed subscribers
    await publish_message("feed", {
        "type": "new_take",
        "data": {
            "id": str(response.id),
            "content": response.content,
            "like_count": response.like_count,
            "comment_count": response.comment_count,
            "created_at": response.created_at.isoformat(),
            "username": response.username,
            "user_liked": False,
        }
    })

    return response

@router.get("", response_model=TakesListResponse)
async def get_takes(
    sort: SortOption = Query(SortOption.newest),
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = Query(None),
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    # Base query - exclude hidden takes
    query = select(Take).where(Take.is_hidden == False).options(joinedload(Take.user))

    # Apply time filter for hottest sorts (use naive datetime to match DB)
    if sort == SortOption.hottest_24h:
        cutoff = datetime.utcnow() - timedelta(hours=24)
        query = query.where(Take.created_at >= cutoff)
    elif sort == SortOption.hottest_7d:
        cutoff = datetime.utcnow() - timedelta(days=7)
        query = query.where(Take.created_at >= cutoff)

    # Apply cursor pagination (for newest sort)
    if cursor and sort == SortOption.newest:
        cursor_created_at, cursor_id = decode_cursor(cursor)
        query = query.where(
            (Take.created_at < cursor_created_at) |
            ((Take.created_at == cursor_created_at) & (Take.id < cursor_id))
        )

    # Order by created_at for newest, fetch all for hottest
    if sort == SortOption.newest:
        query = query.order_by(Take.created_at.desc(), Take.id.desc())
        query = query.limit(limit + 1)  # Fetch one extra to check for next page
    else:
        # For hottest, we need to fetch more and sort by score in Python
        query = query.limit(500)

    result = await db.execute(query)
    takes = result.scalars().unique().all()

    # For hottest sorts, calculate scores and sort
    if sort in (SortOption.hottest_24h, SortOption.hottest_7d):
        takes_with_scores = [(t, hot_score(t.like_count, t.created_at)) for t in takes]
        takes_with_scores.sort(key=lambda x: x[1], reverse=True)
        takes = [t for t, _ in takes_with_scores[:limit]]
        has_more = len(takes_with_scores) > limit
    else:
        has_more = len(takes) > limit
        takes = list(takes[:limit])

    # Get user's likes if authenticated
    user_liked_ids = set()
    if current_user and takes:
        take_ids = [t.id for t in takes]
        likes_result = await db.execute(
            select(Like.take_id).where(
                and_(Like.user_id == current_user.id, Like.take_id.in_(take_ids))
            )
        )
        user_liked_ids = {row[0] for row in likes_result.fetchall()}

    # Get comment counts for all takes
    comment_counts = {}
    if takes:
        take_ids = [t.id for t in takes]
        counts_result = await db.execute(
            select(Comment.take_id, func.count(Comment.id))
            .where(and_(Comment.take_id.in_(take_ids), Comment.is_hidden == False))
            .group_by(Comment.take_id)
        )
        comment_counts = {row[0]: row[1] for row in counts_result.fetchall()}

    take_responses = [
        TakeResponse(
            id=take.id,
            content=take.content,
            like_count=take.like_count,
            comment_count=comment_counts.get(take.id, 0),
            created_at=take.created_at,
            username=take.user.username,
            user_liked=take.id in user_liked_ids,
        )
        for take in takes
    ]

    next_cursor = None
    if has_more and sort == SortOption.newest and takes:
        last_take = takes[-1]
        next_cursor = encode_cursor(last_take.created_at, last_take.id)

    return TakesListResponse(takes=take_responses, next_cursor=next_cursor)

@router.get("/top/today", response_model=list[TakeResponse])
async def get_top_takes_today(
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    # Last 24 hours
    cutoff = datetime.utcnow() - timedelta(hours=24)

    # Get all non-hidden takes from last 24 hours
    result = await db.execute(
        select(Take)
        .where(Take.is_hidden == False, Take.created_at >= cutoff)
        .options(joinedload(Take.user))
    )
    takes = result.scalars().unique().all()

    if not takes:
        return []

    # Get comment counts
    take_ids = [t.id for t in takes]
    counts_result = await db.execute(
        select(Comment.take_id, func.count(Comment.id))
        .where(and_(Comment.take_id.in_(take_ids), Comment.is_hidden == False))
        .group_by(Comment.take_id)
    )
    comment_counts = {row[0]: row[1] for row in counts_result.fetchall()}

    # Sort by engagement score (likes + comments) and get top 3
    sorted_takes = sorted(
        takes,
        key=lambda t: t.like_count + comment_counts.get(t.id, 0),
        reverse=True
    )[:3]

    # Get user's likes if authenticated
    user_liked_ids = set()
    if current_user and sorted_takes:
        top_ids = [t.id for t in sorted_takes]
        likes_result = await db.execute(
            select(Like.take_id).where(
                and_(Like.user_id == current_user.id, Like.take_id.in_(top_ids))
            )
        )
        user_liked_ids = {row[0] for row in likes_result.fetchall()}

    return [
        TakeResponse(
            id=take.id,
            content=take.content,
            like_count=take.like_count,
            comment_count=comment_counts.get(take.id, 0),
            created_at=take.created_at,
            username=take.user.username,
            user_liked=take.id in user_liked_ids,
        )
        for take in sorted_takes
    ]


@router.get("/{take_id}", response_model=TakeResponse)
async def get_take(
    take_id: UUID,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Take).where(Take.id == take_id, Take.is_hidden == False).options(joinedload(Take.user))
    )
    take = result.scalar_one_or_none()

    if not take:
        raise HTTPException(status_code=404, detail="Take not found")

    # Check if user liked this take
    user_liked = False
    if current_user:
        like_result = await db.execute(
            select(Like).where(Like.take_id == take_id, Like.user_id == current_user.id)
        )
        user_liked = like_result.scalar_one_or_none() is not None

    # Get comment count
    comment_count_result = await db.execute(
        select(func.count(Comment.id))
        .where(Comment.take_id == take_id, Comment.is_hidden == False)
    )
    comment_count = comment_count_result.scalar_one()

    return TakeResponse(
        id=take.id,
        content=take.content,
        like_count=take.like_count,
        comment_count=comment_count,
        created_at=take.created_at,
        username=take.user.username,
        user_liked=user_liked,
    )

@router.delete("/{take_id}")
async def delete_take(
    take_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Take).where(Take.id == take_id)
    )
    take = result.scalar_one_or_none()

    if not take:
        raise HTTPException(status_code=404, detail="Take not found")

    if take.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this take")

    take.is_hidden = True

    # Broadcast delete to feed subscribers
    await publish_message("feed", {
        "type": "delete_take",
        "data": {
            "id": str(take_id),
        }
    })

    return {"message": "Take deleted"}

@router.post("/{take_id}/like")
async def like_take(
    take_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Rate limit: 30 likes per user per hour
    await check_rate_limit(
        key=f"like:{current_user.id}",
        max_requests=30,
        window_seconds=3600,
    )

    # Check if take exists
    result = await db.execute(
        select(Take).where(Take.id == take_id, Take.is_hidden == False)
    )
    take = result.scalar_one_or_none()

    if not take:
        raise HTTPException(status_code=404, detail="Take not found")

    # Check if already liked
    result = await db.execute(
        select(Like).where(Like.take_id == take_id, Like.user_id == current_user.id)
    )
    existing_like = result.scalar_one_or_none()

    if existing_like:
        return {"message": "Already liked"}

    # Create like and increment count transactionally
    like = Like(take_id=take_id, user_id=current_user.id)
    db.add(like)
    take.like_count += 1

    # Broadcast like count update to feed subscribers
    await publish_message("feed", {
        "type": "like_update",
        "data": {
            "id": str(take_id),
            "like_count": take.like_count,
        }
    })

    return {"message": "Liked"}

@router.delete("/{take_id}/like")
async def unlike_take(
    take_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Rate limit: 30 unlikes per user per hour (shared with likes)
    await check_rate_limit(
        key=f"like:{current_user.id}",
        max_requests=30,
        window_seconds=3600,
    )

    # Check if take exists
    result = await db.execute(
        select(Take).where(Take.id == take_id, Take.is_hidden == False)
    )
    take = result.scalar_one_or_none()

    if not take:
        raise HTTPException(status_code=404, detail="Take not found")

    # Find and delete like
    result = await db.execute(
        select(Like).where(Like.take_id == take_id, Like.user_id == current_user.id)
    )
    like = result.scalar_one_or_none()

    if not like:
        return {"message": "Not liked"}

    # Delete like and decrement count transactionally
    await db.delete(like)
    take.like_count = max(0, take.like_count - 1)  # Prevent negative counts

    # Broadcast like count update to feed subscribers
    await publish_message("feed", {
        "type": "like_update",
        "data": {
            "id": str(take_id),
            "like_count": take.like_count,
        }
    })

    return {"message": "Unliked"}

@router.get("/{take_id}/comments", response_model=CommentsListResponse)
async def get_comments(
    take_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    # Check if take exists
    result = await db.execute(
        select(Take).where(Take.id == take_id, Take.is_hidden == False)
    )
    take = result.scalar_one_or_none()

    if not take:
        raise HTTPException(status_code=404, detail="Take not found")

    # Get comments ordered by created_at (ascending order)
    result = await db.execute(
        select(Comment)
        .where(Comment.take_id == take_id, Comment.is_hidden == False)
        .options(joinedload(Comment.user))
        .order_by(Comment.created_at.asc())
    )
    comments = result.scalars().unique().all()

    comment_responses = [
        CommentResponse(
            id=comment.id,
            take_id=comment.take_id,
            content=comment.content,
            username=comment.user.username,
            created_at=comment.created_at,
        )
        for comment in comments
    ]

    return CommentsListResponse(comments=comment_responses)

@router.post("/{take_id}/comments", response_model=CommentResponse)
async def create_comment(
    take_id: UUID,
    request: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Rate limit: 10 comments per user per hour
    await check_rate_limit(
        key=f"comment:{current_user.id}",
        max_requests=10,
        window_seconds=3600,
    )

    # Check if take exists
    result = await db.execute(
        select(Take).where(Take.id == take_id, Take.is_hidden == False)
    )
    take = result.scalar_one_or_none()

    if not take:
        raise HTTPException(status_code=404, detail="Take not found")

    # Check profanity
    if contains_profanity(request.content):
        raise HTTPException(status_code=400, detail="Content contains inappropriate language")

    # Create comment
    comment = Comment(
        take_id=take_id,
        user_id=current_user.id,
        content=request.content,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)

    response = CommentResponse(
        id=comment.id,
        take_id=comment.take_id,
        content=comment.content,
        username=current_user.username,
        created_at=comment.created_at,
    )

    # Broadcast new comment to take's comment subscribers
    await publish_message(f"comments:{take_id}", {
        "type": "new_comment",
        "data": {
            "id": str(response.id),
            "take_id": str(response.take_id),
            "content": response.content,
            "username": response.username,
            "created_at": response.created_at.isoformat(),
        }
    })

    return response