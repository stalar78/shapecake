from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from tests.db_safety import guarded_test_database_url

REPO_ROOT = next(
    (path for path in Path(__file__).resolve().parents if (path / "docker-compose.yml").exists()),
    None,
)
API_DOCKERFILE = next(
    (
        path / "Dockerfile"
        for path in Path(__file__).resolve().parents
        if (path / "Dockerfile").exists()
    ),
    Path("/app/.runtime-check/Dockerfile"),
)


def test_allowed_frontend_origins_accepts_comma_separated_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(
        "ALLOWED_FRONTEND_ORIGINS", "http://localhost:3000,http://localhost:5173"
    )
    settings = Settings()
    assert settings.allowed_frontend_origins == [
        "http://localhost:3000",
        "http://localhost:5173",
    ]


def test_allowed_frontend_origins_trims_whitespace(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "ALLOWED_FRONTEND_ORIGINS", " http://localhost:3000 , http://localhost:5173 "
    )
    settings = Settings()
    assert settings.allowed_frontend_origins == [
        "http://localhost:3000",
        "http://localhost:5173",
    ]


def test_allowed_frontend_origins_empty_input_is_empty_list(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ALLOWED_FRONTEND_ORIGINS", "")
    settings = Settings()
    assert settings.allowed_frontend_origins == []


def test_allowed_frontend_origins_default_value() -> None:
    settings = Settings()
    assert settings.allowed_frontend_origins == [
        "http://localhost:3000",
        "http://localhost:5173",
    ]


def test_production_security_validation_still_requires_secure_cookie() -> None:
    with pytest.raises(ValidationError, match="SESSION_COOKIE_SECURE=true"):
        Settings(app_env="production", session_hash_pepper="not-a-placeholder")


def test_api_dockerfile_keeps_pytest_out_of_production_stage() -> None:
    dockerfile_path = (REPO_ROOT / "apps/api/Dockerfile") if REPO_ROOT else API_DOCKERFILE
    dockerfile = dockerfile_path.read_text()
    production_part = dockerfile.split("FROM base AS test", maxsplit=1)[0]
    assert ".[dev]" not in production_part
    assert "pytest" not in production_part


def test_api_dockerfile_test_target_installs_dev_dependencies() -> None:
    dockerfile_path = (REPO_ROOT / "apps/api/Dockerfile") if REPO_ROOT else API_DOCKERFILE
    dockerfile = dockerfile_path.read_text()
    assert "FROM base AS test" in dockerfile
    assert 'pip install --no-cache-dir ".[dev]"' in dockerfile
    assert "COPY tests ./tests" in dockerfile


def test_compose_api_test_service_uses_guarded_test_environment() -> None:
    if REPO_ROOT is None:
        pytest.skip("root docker-compose.yml is outside the API Docker build context")
    compose = (REPO_ROOT / "docker-compose.yml").read_text()
    assert "api-test:" in compose
    assert "target: test" in compose
    assert "TEST_DATABASE_URL:" in compose
    assert "shape_cake_test" in compose
    assert "ALLOW_TEST_DATABASE_RESET:" in compose
    assert "${ALLOW_TEST_DATABASE_RESET:-}" in compose
    assert "${ALLOW_TEST_DATABASE_RESET:-yes}" not in compose
    assert "${ALLOW_TEST_DATABASE_RESET:-true}" not in compose
    assert "${ALLOW_TEST_DATABASE_RESET:-1}" not in compose


@pytest.mark.parametrize("opt_in", [None, "", "true", "1", "YES", "no"])
def test_db_safety_rejects_missing_empty_or_non_yes_reset_opt_in(
    monkeypatch: pytest.MonkeyPatch,
    opt_in: str | None,
) -> None:
    monkeypatch.setenv(
        "TEST_DATABASE_URL",
        "postgresql+asyncpg://shape_cake:change-me@localhost:5432/shape_cake_test",
    )
    if opt_in is None:
        monkeypatch.delenv("ALLOW_TEST_DATABASE_RESET", raising=False)
    else:
        monkeypatch.setenv("ALLOW_TEST_DATABASE_RESET", opt_in)

    with pytest.raises(RuntimeError, match="ALLOW_TEST_DATABASE_RESET=yes is required"):
        guarded_test_database_url()


def test_db_safety_accepts_explicit_yes_for_guarded_test_database(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_database_url = (
        "postgresql+asyncpg://shape_cake:change-me@localhost:5432/shape_cake_test"
    )
    monkeypatch.setenv("TEST_DATABASE_URL", test_database_url)
    monkeypatch.setenv("ALLOW_TEST_DATABASE_RESET", "yes")

    assert guarded_test_database_url() == test_database_url


def test_root_dockerignore_excludes_heavy_local_paths() -> None:
    if REPO_ROOT is None:
        pytest.skip("root .dockerignore is outside the API Docker build context")
    dockerignore = (REPO_ROOT / ".dockerignore").read_text()
    for pattern in [
        ".git",
        "node_modules",
        "**/node_modules",
        ".next",
        "dist",
        ".venv",
        "__pycache__",
        "*.egg-info",
        "*.rar",
    ]:
        assert pattern in dockerignore
