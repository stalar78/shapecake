from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Protocol

logger = logging.getLogger("app.notifications")


class NotificationAdapter(Protocol):
    async def inquiry_created(self, public_reference: str) -> None: ...


@dataclass(frozen=True)
class LoggingNotificationAdapter:
    async def inquiry_created(self, public_reference: str) -> None:
        logger.info("Inquiry notification accepted for reference %s", public_reference)


notification_adapter: NotificationAdapter = LoggingNotificationAdapter()


def get_notification_adapter() -> NotificationAdapter:
    return notification_adapter

