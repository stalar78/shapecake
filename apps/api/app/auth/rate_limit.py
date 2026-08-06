from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Protocol


class LoginRateLimiter(Protocol):
    def allow(self, key: str) -> bool: ...
    def record_failure(self, key: str) -> None: ...
    def record_success(self, key: str) -> None: ...


@dataclass
class InMemoryLoginRateLimiter:
    # Single-process development limiter only. Replace with a distributed implementation before scaling API instances.
    max_attempts: int = 5
    window: timedelta = timedelta(minutes=10)
    attempts: dict[str, list[datetime]] = field(default_factory=dict)

    def allow(self, key: str) -> bool:
        now = datetime.now(UTC)
        self.attempts[key] = [item for item in self.attempts.get(key, []) if now - item < self.window]
        return len(self.attempts[key]) < self.max_attempts

    def record_failure(self, key: str) -> None:
        self.attempts.setdefault(key, []).append(datetime.now(UTC))

    def record_success(self, key: str) -> None:
        self.attempts.pop(key, None)


login_rate_limiter = InMemoryLoginRateLimiter()
