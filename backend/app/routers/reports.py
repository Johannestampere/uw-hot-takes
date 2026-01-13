from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Take, Comment, Report
from app.schemas.schemas import ReportCreate, ReportResponse
from app.dependencies import get_optional_user
from app.utils.rate_limit import check_rate_limit, get_client_ip

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("", response_model=ReportResponse)
async def create_report(
    request: Request,
    report_data: ReportCreate,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):

    # Get client IP for rate limiting
    client_ip = await get_client_ip(request)

    # Rate limit: 5 reports per IP per hour
    await check_rate_limit(
        key=f"report_limit:{client_ip}",
        max_requests=5,
        window_seconds=3600,
    )

    # Verify target exists and is not hidden
    if report_data.target_type == "take":
        result = await db.execute(
            select(Take).where(Take.id == report_data.target_id, Take.is_hidden == False)
        )
        target = result.scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail="Take not found")
    elif report_data.target_type == "comment":
        result = await db.execute(
            select(Comment).where(Comment.id == report_data.target_id, Comment.is_hidden == False)
        )
        target = result.scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail="Comment not found")

    # Create report
    report = Report(
        target_type=report_data.target_type,
        target_id=report_data.target_id,
        reason=report_data.reason,
        reporter_user_id=current_user.id if current_user else None,
    )
    db.add(report)

    return ReportResponse(message="Report submitted successfully")