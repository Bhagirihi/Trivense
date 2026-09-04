"""Instagram client using username/password login via instagrapi."""

from __future__ import annotations

import base64
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from instagrapi import Client
from instagrapi.exceptions import ChallengeRequired, LoginRequired, TwoFactorRequired

SERVER_ROOT = Path(__file__).resolve().parent
SESSION_FILE = SERVER_ROOT / "instagram_session.json"
CHALLENGE_HELP = (
    "Instagram blocked login from this environment. Log in locally once "
    "(npm run setup:instagram-session or run.sh), then upload the session "
    "secret for GitHub Actions — see .cursor/mcp-servers/instagram/README.md"
)


class InstagramError(RuntimeError):
    pass


class InstagramClient:
    def __init__(self) -> None:
        self._client = Client()
        self._logged_in = False

    def _require_env(self, name: str) -> str:
        value = os.environ.get(name, "").strip()
        if not value:
            raise InstagramError(
                f"Missing {name}. Set it in .cursor/mcp-servers/instagram/.env"
            )
        return value

    def _is_ci(self) -> bool:
        return os.environ.get("GITHUB_ACTIONS", "").strip() == "true"

    def _restore_session_from_env(self) -> None:
        """Materialize instagram_session.json from CI secret (base64 JSON)."""
        if SESSION_FILE.is_file():
            return

        encoded = os.environ.get("INSTAGRAM_SESSION_JSON", "").strip()
        if not encoded:
            return

        try:
            SESSION_FILE.write_bytes(base64.b64decode(encoded, validate=False))
        except Exception as exc:
            raise InstagramError(
                "Invalid INSTAGRAM_SESSION_JSON secret (expected base64 session file)."
            ) from exc

    def _apply_session_identity(self) -> None:
        username = os.environ.get("INSTAGRAM_USERNAME", "").strip()
        if username:
            self._client.username = username

    def _load_cached_session(self) -> bool:
        if not SESSION_FILE.is_file():
            return False

        self._client.load_settings(SESSION_FILE)
        if not self._client.user_id:
            SESSION_FILE.unlink(missing_ok=True)
            return False

        self._apply_session_identity()
        self._logged_in = True
        return True

    def login(self) -> None:
        if self._logged_in:
            return

        self._restore_session_from_env()
        if self._load_cached_session():
            return

        if self._is_ci():
            raise InstagramError(
                "Instagram session missing or expired in GitHub Actions. "
                "Log in locally, then run export-instagram-session.sh to refresh "
                "INSTAGRAM_SESSION_JSON."
            )

        username = self._require_env("INSTAGRAM_USERNAME")
        password = self._require_env("INSTAGRAM_PASSWORD")
        verification_code = os.environ.get("INSTAGRAM_VERIFICATION_CODE", "").strip()

        if SESSION_FILE.is_file():
            self._client.load_settings(SESSION_FILE)

        try:
            self._client.login(username, password, verification_code=verification_code or None)
        except TwoFactorRequired as exc:
            raise InstagramError(
                "Instagram requires 2FA. Set INSTAGRAM_VERIFICATION_CODE in .env and retry."
            ) from exc
        except ChallengeRequired as exc:
            raise InstagramError(CHALLENGE_HELP) from exc
        except Exception as exc:
            raise InstagramError(f"Instagram login failed: {exc}") from exc

        self._client.dump_settings(SESSION_FILE)
        self._logged_in = True

    def account_info(self) -> dict[str, Any]:
        self.login()
        account = self._client.account_info()
        user = self._client.user_info(self._client.user_id)
        return {
            "username": account.username,
            "full_name": account.full_name,
            "user_id": str(account.pk),
            "is_business": account.is_business,
            "is_verified": account.is_verified,
            "media_count": user.media_count,
            "follower_count": user.follower_count,
            "following_count": user.following_count,
        }

    def publish_photo(self, image_path: Path, caption: str) -> dict[str, Any]:
        self.login()
        if not image_path.is_file():
            raise InstagramError(f"Image not found: {image_path}")

        try:
            media = self._client.photo_upload(str(image_path), caption)
        except LoginRequired as exc:
            SESSION_FILE.unlink(missing_ok=True)
            self._logged_in = False
            raise InstagramError("Session expired. Retry after re-login.") from exc
        except Exception as exc:
            raise InstagramError(f"Failed to publish photo: {exc}") from exc

        return {
            "media_id": str(media.pk),
            "code": media.code,
            "url": f"https://www.instagram.com/p/{media.code}/",
        }

    def schedule_photo(self, image_path: Path, caption: str, schedule_at: datetime) -> dict[str, Any]:
        self.login()
        if not image_path.is_file():
            raise InstagramError(f"Image not found: {image_path}")

        now = datetime.now(tz=schedule_at.tzinfo)
        if schedule_at <= now + timedelta(minutes=10):
            raise InstagramError("Scheduled time must be at least 10 minutes in the future.")

        try:
            media = self._client.photo_upload(str(image_path), caption, schedule_at=schedule_at)
        except LoginRequired as exc:
            SESSION_FILE.unlink(missing_ok=True)
            self._logged_in = False
            raise InstagramError("Session expired. Retry after re-login.") from exc
        except Exception as exc:
            raise InstagramError(f"Failed to schedule photo: {exc}") from exc

        code = media.code or ""
        url = f"https://www.instagram.com/p/{code}/" if code else None
        return {
            "media_id": str(media.pk),
            "code": code,
            "url": url,
            "scheduled_at": schedule_at.isoformat(),
        }

    def update_profile_seo(self) -> dict[str, Any]:
        from instagram_seo import APK_DOWNLOAD_URL, PROFILE_BIO, PROFILE_FULL_NAME

        self.login()
        try:
            account = self._client.account_edit(
                biography=PROFILE_BIO,
                full_name=PROFILE_FULL_NAME,
                external_url=APK_DOWNLOAD_URL,
            )
        except Exception as exc:
            raise InstagramError(f"Failed to update profile: {exc}") from exc

        return {
            "username": account.username,
            "full_name": account.full_name,
            "biography": getattr(account, "biography", PROFILE_BIO),
            "external_url": APK_DOWNLOAD_URL,
        }

    def edit_caption(self, media_id: str, caption: str) -> dict[str, Any]:
        self.login()
        try:
            self._client.media_edit(media_id, caption)
        except Exception as exc:
            raise InstagramError(f"Failed to edit caption: {exc}") from exc
        return {"media_id": media_id, "caption_updated": True}
