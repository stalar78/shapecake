from __future__ import annotations

import os
from urllib.parse import urlparse


def guarded_test_database_url() -> str:
    database_url = os.environ.get("TEST_DATABASE_URL")
    if not database_url:
        raise RuntimeError("TEST_DATABASE_URL is required for integration tests")
    if os.environ.get("ALLOW_TEST_DATABASE_RESET") != "yes":
        raise RuntimeError("ALLOW_TEST_DATABASE_RESET=yes is required for schema-reset tests")

    parsed = urlparse(database_url)
    database_name = parsed.path.rsplit("/", 1)[-1]
    if not database_name.startswith("test_") and not database_name.endswith("_test"):
        raise RuntimeError("TEST_DATABASE_URL database name must start with test_ or end with _test")
    return database_url
