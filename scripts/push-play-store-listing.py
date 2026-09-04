#!/usr/bin/env python3
"""Push EN + HI store listing copy to Google Play Console."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAY_DIR = ROOT / ".cursor" / "mcp-servers" / "google-play"
sys.path.insert(0, str(PLAY_DIR))

from play_client import PlayError, get_service, package_name  # noqa: E402

MANIFEST = ROOT / "store-assets" / "play" / "manifest.json"


def listing_body(entry: dict) -> dict:
    return {
        "title": (entry.get("title") or "")[:30],
        "shortDescription": (entry.get("shortDescription") or "")[:80],
        "fullDescription": (entry.get("fullDescription") or "")[:4000],
    }


def push_all_listings(pkg: str | None = None) -> dict:
    if not MANIFEST.exists():
        raise PlayError(f"Missing {MANIFEST}")

    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    store = data.get("storeListing") or {}
    translations = data.get("translations") or {}

    locales: dict[str, dict] = {"en-US": store}
    for lang, entry in translations.items():
        locales[lang] = entry

    service = get_service()
    pkg = pkg or package_name()
    edit = service.edits().insert(packageName=pkg, body={}).execute()
    edit_id = edit["id"]

    updated = {}
    for language, entry in locales.items():
        body = listing_body(entry)
        if not body["title"] or not body["shortDescription"] or not body["fullDescription"]:
            raise PlayError(f"Incomplete listing for {language}")
        # Validate lengths early
        if len(body["title"]) > 30:
            raise PlayError(f"{language} title too long: {len(body['title'])}")
        if len(body["shortDescription"]) > 80:
            raise PlayError(f"{language} shortDescription too long: {len(body['shortDescription'])}")

        result = (
            service.edits()
            .listings()
            .update(packageName=pkg, editId=edit_id, language=language, body=body)
            .execute()
        )
        updated[language] = {
            "title": result.get("title"),
            "shortDescription": result.get("shortDescription"),
            "fullDescriptionChars": len(result.get("fullDescription") or ""),
        }

    committed = service.edits().commit(packageName=pkg, editId=edit_id).execute()
    return {
        "package": pkg,
        "edit_id": committed.get("id"),
        "languages": updated,
    }


def main() -> int:
    try:
        result = push_all_listings()
    except PlayError as exc:
        print(f"✗ {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"✗ {exc}", file=sys.stderr)
        return 1

    print(json.dumps(result, indent=2, ensure_ascii=False))
    print("✓ Store listings pushed (en-US + translations)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
