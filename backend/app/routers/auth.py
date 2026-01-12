from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.database import get_db
from app.models import User
from app.schemas.schemas import RegisterRequest, LoginRequest, AuthResponse, UserResponse
from app.utils.password import hash_password, verify_password
from app.utils.jwt import create_session_token
from app.utils.username_generator import generate_username
from app.dependencies import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "session"

# Google OAuth endpoints (public, same for everyone)
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

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

@router.get("/google")
async def google_login():
    settings = get_settings()

    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    }
    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=url)

@router.get("/google/callback")
async def google_callback(
    code: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
):

    settings = get_settings()

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.google_redirect_uri,
            },
        )

    if token_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")

    tokens = token_response.json()
    access_token = tokens.get("access_token")

    # Get user info from Google
    async with httpx.AsyncClient() as client:
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if userinfo_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")

    google_user = userinfo_response.json()
    google_id = google_user.get("id")
    email = google_user.get("email")

    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Invalid user info from Google")

    # Find or create user
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        # Check if email already exists (user registered with password)
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            # Link Google account to existing user
            existing_user.google_id = google_id
            user = existing_user
        else:
            # Create new user
            for _ in range(5):
                username = generate_username()
                result = await db.execute(select(User).where(User.username == username))
                if not result.scalar_one_or_none():
                    break
            else:
                raise HTTPException(status_code=500, detail="Could not generate unique username")

            user = User(
                email=email,
                username=username,
                google_id=google_id,
            )
            db.add(user)

        await db.flush()
        await db.refresh(user)

    # Create session and redirect to frontend
    token = create_session_token(user.id)
    redirect = RedirectResponse(url=settings.frontend_url, status_code=302)
    redirect.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,  # 7 days
    )
    return redirect