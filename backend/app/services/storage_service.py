import hashlib
import shutil
from pathlib import Path
from typing import Tuple
from app.core.config import settings

class StorageService:
    @staticmethod
    def calculate_sha256(file_path: Path) -> str:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(65536), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    @staticmethod
    def calculate_bytes_sha256(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    @classmethod
    def save_document(cls, file_bytes: bytes, family_id: str, person_id: str, original_filename: str) -> Tuple[str, str, int]:
        """
        Saves document content-addressed by SHA-256.
        Returns: (sha256, relative_or_absolute_storage_path, file_size)
        """
        sha256 = cls.calculate_bytes_sha256(file_bytes)
        file_size = len(file_bytes)

        target_dir = settings.DOCUMENTS_DIR / family_id / person_id
        target_dir.mkdir(parents=True, exist_ok=True)

        ext = Path(original_filename).suffix.lower()
        if not ext:
            ext = ".pdf"
        target_path = target_dir / f"{sha256}{ext}"

        # If file already exists, don't overwrite - it's immutable
        if not target_path.exists():
            with open(target_path, "wb") as f:
                f.write(file_bytes)

        return sha256, str(target_path), file_size

    @classmethod
    def copy_existing_file(cls, source_path: Path, family_id: str, person_id: str) -> Tuple[str, str, int]:
        sha256 = cls.calculate_sha256(source_path)
        file_size = source_path.stat().st_size

        target_dir = settings.DOCUMENTS_DIR / family_id / person_id
        target_dir.mkdir(parents=True, exist_ok=True)

        ext = source_path.suffix.lower()
        target_path = target_dir / f"{sha256}{ext}"

        if not target_path.exists():
            shutil.copy2(source_path, target_path)

        return sha256, str(target_path), file_size

    @staticmethod
    def delete_document_file(storage_path: str) -> bool:
        p = Path(storage_path)
        if p.exists() and p.is_file():
            p.unlink()
            return True
        return False
