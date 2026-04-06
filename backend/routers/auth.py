from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from db.base import get_db
from services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str


@router.post("/register", response_model=UserResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await AuthService.register(db, body.email, body.password, body.full_name)
        return UserResponse(id=str(user.id), email=user.email, full_name=user.full_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    try:
        return await AuthService.login(db, form.username, form.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me", response_model=UserResponse)
async def me(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return UserResponse(id=str(user.id), email=user.email, full_name=user.full_name)