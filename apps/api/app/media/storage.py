from __future__ import annotations

import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

ALLOWED_MEDIA_TYPES = {
    "image/jpeg": ("jpg", (b"\xff\xd8\xff",)),
    "image/png": ("png", (b"\x89PNG\r\n\x1a\n",)),
    "image/webp": ("webp", (b"RIFF",)),
}


class LocalMediaStorage:
    def __init__(self, media_root: str, public_base_url: str, max_upload_bytes: int) -> None:
        self.root = Path(media_root).resolve()
        self.public_base_url = public_base_url.rstrip("/")
        self.max_upload_bytes = max_upload_bytes

    def media_url(self, storage_key: str) -> str:
        safe_key = self._safe_storage_key(storage_key)
        return f"{self.public_base_url}/{safe_key}"

    async def save_upload(self, file: UploadFile) -> tuple[str, str, str, int]:
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = await file.read(min(1024 * 1024, self.max_upload_bytes + 1))
            if not chunk:
                break
            total += len(chunk)
            if total > self.max_upload_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="Image file is too large",
                )
            chunks.append(chunk)
        content = b"".join(chunks)
        return self._save_content(
            content,
            content_type=file.content_type or "",
            original_filename=file.filename,
        )

    def save_local_file(self, source: Path, content_type: str) -> tuple[str, str, str, int]:
        content = source.read_bytes()
        if len(content) > self.max_upload_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="Image file is too large",
            )
        return self._save_content(
            content,
            content_type=content_type,
            original_filename=source.name,
        )

    def restore_local_file(self, source: Path, storage_key: str, content_type: str) -> tuple[str, int]:
        content = source.read_bytes()
        if len(content) > self.max_upload_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="Image file is too large",
            )
        mime_type = self._validate_content(content_type, content)
        destination = self._path_for_key(storage_key)
        if destination.exists():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Media file already exists")
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
        return mime_type, len(content)

    def exists(self, storage_key: str) -> bool:
        return self._path_for_key(storage_key).exists()

    def delete(self, storage_key: str) -> None:
        path = self._path_for_key(storage_key)
        if path.exists():
            path.unlink()

    def _path_for_key(self, storage_key: str) -> Path:
        safe_key = self._safe_storage_key(storage_key)
        path = (self.root / safe_key).resolve()
        if self.root not in path.parents:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid media path")
        return path

    @staticmethod
    def _safe_storage_key(storage_key: str) -> str:
        if "\\" in storage_key or ".." in storage_key or storage_key.startswith("/"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid media path")
        return storage_key

    @staticmethod
    def _safe_filename(filename: str | None) -> str:
        if not filename:
            return "upload"
        return Path(filename).name[:255]

    def _save_content(
        self,
        content: bytes,
        *,
        content_type: str,
        original_filename: str | None,
    ) -> tuple[str, str, str, int]:
        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image file is empty")

        mime_type = self._validate_content(content_type, content)
        extension = ALLOWED_MEDIA_TYPES[mime_type][0]
        storage_key = f"desserts/{secrets.token_urlsafe(24)}.{extension}"
        destination = self._path_for_key(storage_key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
        return storage_key, self._safe_filename(original_filename), mime_type, len(content)

    @staticmethod
    def _validate_content(content_type: str, content: bytes) -> str:
        mime_type = content_type
        if mime_type not in ALLOWED_MEDIA_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")
        signatures = ALLOWED_MEDIA_TYPES[mime_type][1]
        if mime_type == "image/webp":
            valid = content.startswith(b"RIFF") and content[8:12] == b"WEBP"
        else:
            valid = any(content.startswith(signature) for signature in signatures)
        if not valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image content does not match type")
        return mime_type
