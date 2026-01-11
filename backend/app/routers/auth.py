from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, UserResponse
from app.utils.password import hash_password, verify_password
from app.utils.jwt import create_session_token
from app.utils.username_generator import generate_username
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "session"

@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    # Check if email already taken
    result = await db.execute(select(User).where(User.email == request.email))

    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate unique username (retry if collision)
    for _ in range(5):
        username = generate_username()
        result = await db.execute(select(User).where(User.username == username))
        if not result.scalar_one_or_none():
            break
    else:
        raise HTTPException(status_code=500, detail="Could not generate unique username")

    # Create user
    user = User(
        email=request.email,
        username=username,
        password_hash=hash_password(request.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Set session cookie
    token = create_session_token(user.id)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,  # 7 days
    )

    return AuthResponse(
        user=UserResponse.model_validate(user),
        message="Registration successful",
    )

@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    # Find user by email
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Set session cookie
    token = create_session_token(user.id)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,  # 7 days
    )

    return AuthResponse(
        user=UserResponse.model_validate(user),
        message="Login successful",
    )

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME)
    return {"message": "Logged out"}

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    return UserResponse.model_validate(current_user)