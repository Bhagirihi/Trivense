#!/usr/bin/env python3
"""Push release notes to a Google Play track (default: beta / Open Testing)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAY_DIR = ROOT / ".cursor" / "mcp-servers" / "google-play"
sys.path.insert(0, str(PLAY_DIR))

from play_client import PlayError, get_service, package_name  # noqa: E402

DEFAULT_EN = """What's new:

• Ad-supported full access while subscriptions are paused — all features unlocked; unpaid users may see ads on premium surfaces
• Post-register setup: language and default currency (INR and more)
• Refreshed brand, icons, and clearer onboarding
• Privacy, Terms, and Advertising Policy in Settings → Legal
• Remote payments on/off without an app update
• Startup and stability fixes

Search "Trivense" on Play Store. Thanks for testing! support@trivense.app"""

DEFAULT_HI = """नया क्या है:

• सब्सक्रिप्शन रुके होने पर सभी फ़ीचर्स अनलॉक — अनपेड यूज़र्स को कुछ प्रीमियम स्क्रीन पर ads
• साइन-अप के बाद भाषा और डिफ़ॉल्ट करेंसी (INR आदि)
• नया ब्रांड, आइकन और बेहतर ऑनबोर्डिंग
• Settings → Legal में Privacy, Terms और Advertising Policy
• एडमिन payments on/off बिना अपडेट के
• स्टार्टअप और स्थिरता सुधार

Play Store पर "Trivense" खोजें। धन्यवाद! support@trivense.app"""


MAX_RELEASE_NOTE_LEN = 500


def trim_release_notes(text: str) -> str:
    if len(text) <= MAX_RELEASE_NOTE_LEN:
        return text
    trimmed = text[: MAX_RELEASE_NOTE_LEN - 1].rstrip()
    return trimmed + "…"


def load_notes(path: Path | None) -> str:
    if path is None:
        return DEFAULT_EN
    text = path.read_text(encoding="utf-8")
    if path.suffix == ".md":
        lines = text.splitlines()
        body: list[str] = []
        started = False
        for line in lines:
            if line.startswith("#"):
                continue
            if not started and not line.strip():
                continue
            started = True
            body.append(line)
        return trim_release_notes("\n".join(body).strip())
    return trim_release_notes(text.strip())


def push_release_notes(
    *,
    track: str = "beta",
    en_text: str,
    hi_text: str,
    pkg: str | None = None,
) -> dict:
    service = get_service()
    pkg = pkg or package_name()
    notes = [
        {"language": "en-US", "text": en_text},
        {"language": "hi-IN", "text": hi_text},
    ]

    edit = service.edits().insert(packageName=pkg, body={}).execute()
    edit_id = edit["id"]

    track_body = (
        service.edits()
        .tracks()
        .get(packageName=pkg, editId=edit_id, track=track)
        .execute()
    )
    releases = track_body.get("releases") or []
    if not releases:
        raise PlayError(f"No releases on track '{track}' — submit a build first.")

    for release in releases:
        release["releaseNotes"] = notes

    service.edits().tracks().update(
        packageName=pkg, editId=edit_id, track=track, body=track_body
    ).execute()
    committed = service.edits().commit(packageName=pkg, editId=edit_id).execute()

    return {
        "package": pkg,
        "track": track,
        "release_count": len(releases),
        "edit_id": committed.get("id"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Push Play Store release notes")
    parser.add_argument("--track", default="beta", help="Play track (default: beta)")
    parser.add_argument(
        "--en",
        type=Path,
        default=ROOT / "store-assets" / "play" / "RELEASE_NOTES_OPEN_TESTING.md",
        help="en-US release notes file",
    )
    parser.add_argument("--hi", type=Path, help="hi-IN release notes file (optional)")
    args = parser.parse_args()

    en_text = trim_release_notes(load_notes(args.en if args.en.exists() else None))
    hi_text = trim_release_notes(DEFAULT_HI)
    if args.hi and args.hi.exists():
        hi_text = load_notes(args.hi)

    try:
        result = push_release_notes(track=args.track, en_text=en_text, hi_text=hi_text)
    except PlayError as exc:
        print(f"✗ {exc}", file=sys.stderr)
        return 1

    print(f"✓ Release notes pushed to {result['track']} ({result['release_count']} release(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
