FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir .
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

FROM base AS test

RUN pip install --no-cache-dir ".[dev]"
COPY tests ./tests
COPY Dockerfile ./.runtime-check/Dockerfile

CMD ["pytest"]
