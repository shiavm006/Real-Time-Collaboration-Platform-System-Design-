from datetime import datetime, timedelta
from typing import Optional
import os
import bcrypt as _bcrypt

from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import User, Session
from dotenv import load_dotenv
import uuid

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))


class AuthService:

    @staticmethod
    def hash_password(password: str) -> str:
        return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        try:
            return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError:
            return None

    @staticmethod
    async def register(db: AsyncSession, email: str, password: str, full_name: str) -> User:
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        if existing:
            raise ValueError("Email already registered")

        user = User(
            email=email,
            hashed_password=AuthService.hash_password(password),
            full_name=full_name
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def login(db: AsyncSession, email: str, password: str) -> dict:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user or not AuthService.verify_password(password, user.hashed_password):
            raise ValueError("Invalid email or password")

        token = AuthService.create_access_token({"sub": str(user.id)})

        session = Session(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        db.add(session)
        await db.commit()

        return {"access_token": token, "token_type": "bearer", "user_id": str(user.id)}

    @staticmethod
    async def get_current_user(db: AsyncSession, token: str) -> Optional[User]:
        payload = AuthService.decode_token(token)
        if not payload:
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        return result.scalar_one_or_none()