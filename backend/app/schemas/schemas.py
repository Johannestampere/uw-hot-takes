from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from datetime import datetime

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    user: UserResponse
    message: str

# Takes schemas
class TakeCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Content cannot be empty")
        if len(v) > 500:
            raise ValueError("Content cannot exceed 500 characters")
        return v

class TakeResponse(BaseModel):
    id: UUID
    content: str
    like_count: int
    created_at: datetime
    username: str
    user_liked: bool = False

    class Config:
        from_attributes = True