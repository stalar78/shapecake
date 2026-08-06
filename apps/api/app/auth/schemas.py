from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=1024)


class AdminUserResponse(BaseModel):
    id: int
    email: EmailStr


class CsrfResponse(BaseModel):
    csrf_token: str
