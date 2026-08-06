from __future__ import annotations

import argparse
import asyncio
import getpass

from sqlalchemy import select

from app.auth.models import AdminUser
from app.auth.passwords import hash_password
from app.auth.services import normalize_email
from app.db.session import AsyncSessionLocal


def _valid_password(password: str) -> bool:
    return len(password) >= 12 and any(char.isalpha() for char in password) and any(
        char.isdigit() for char in password
    )


async def create_admin(email: str, password: str) -> None:
    normalized = normalize_email(email)
    if not _valid_password(password):
        raise SystemExit("Password must be at least 12 characters and include letters and numbers.")

    async with AsyncSessionLocal() as db:
        existing = await db.scalar(select(AdminUser).where(AdminUser.email == normalized))
        if existing is not None:
            raise SystemExit("Admin with this email already exists.")
        db.add(AdminUser(email=normalized, password_hash=hash_password(password), is_active=True))
        await db.commit()
    print(f"Created admin: {normalized}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the first local administrator.")
    parser.add_argument("--email")
    parser.add_argument("--password")
    args = parser.parse_args()

    email = args.email or input("Admin email: ").strip()
    password = args.password or getpass.getpass("Admin password: ")
    asyncio.run(create_admin(email, password))


if __name__ == "__main__":
    main()
