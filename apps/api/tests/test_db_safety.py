from __future__ import annotations

import os

import pytest

from tests.db_safety import guarded_test_database_url


def test_guard_requires_test_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TEST_DATABASE_URL", raising=False)
    monkeypatch.setenv("ALLOW_TEST_DATABASE_RESET", "yes")
    with pytest.raises(RuntimeError, match="TEST_DATABASE_URL is required"):
        guarded_test_database_url()


def test_guard_requires_opt_in(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TEST_DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/app_test")
    monkeypatch.delenv("ALLOW_TEST_DATABASE_RESET", raising=False)
    with pytest.raises(RuntimeError, match="ALLOW_TEST_DATABASE_RESET=yes"):
        guarded_test_database_url()


def test_guard_rejects_non_test_database_name(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TEST_DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/shape_cake")
    monkeypatch.setenv("ALLOW_TEST_DATABASE_RESET", "yes")
    with pytest.raises(RuntimeError, match="database name"):
        guarded_test_database_url()


def test_guard_accepts_marked_test_database(monkeypatch: pytest.MonkeyPatch) -> None:
    url = "postgresql+asyncpg://u:p@localhost:5432/shape_cake_test"
    monkeypatch.setenv("TEST_DATABASE_URL", url)
    monkeypatch.setenv("ALLOW_TEST_DATABASE_RESET", "yes")
    assert guarded_test_database_url() == url
    assert os.environ["TEST_DATABASE_URL"] == url
