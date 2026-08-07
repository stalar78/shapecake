from __future__ import annotations

from typing import Literal

InquiryStatus = Literal[
    "new",
    "in_progress",
    "waiting_customer",
    "confirmed",
    "completed",
    "cancelled",
    "spam",
]

INQUIRY_STATUSES: tuple[InquiryStatus, ...] = (
    "new",
    "in_progress",
    "waiting_customer",
    "confirmed",
    "completed",
    "cancelled",
    "spam",
)

ALLOWED_TRANSITIONS: dict[InquiryStatus, set[InquiryStatus]] = {
    "new": {"in_progress", "confirmed", "cancelled", "spam"},
    "in_progress": {"waiting_customer", "confirmed", "cancelled", "spam"},
    "waiting_customer": {"in_progress", "confirmed", "cancelled", "spam"},
    "confirmed": {"in_progress", "completed", "cancelled"},
    "completed": set(),
    "cancelled": set(),
    "spam": set(),
}


def assert_transition_allowed(current: InquiryStatus, target: InquiryStatus) -> None:
    if target not in ALLOWED_TRANSITIONS[current]:
        raise ValueError(f"Cannot transition inquiry from {current} to {target}")

