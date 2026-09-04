#!/usr/bin/env python3
"""Diagnose and fix Play track country targeting (production / open testing)."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAY_DIR = ROOT / ".cursor" / "mcp-servers" / "google-play"
sys.path.insert(0, str(PLAY_DIR))

from play_client import PlayError, get_service, package_name  # noqa: E402

CONSOLE_BASE = (
    "https://play.google.com/console/u/3/developers/5766759369200444867"
    "/app/4976093803059142709"
)
OPEN_TESTING_COUNTRIES = f"{CONSOLE_BASE}/tracks/open-testing"
PRODUCTION_COUNTRIES = f"{CONSOLE_BASE}/tracks/production"
OPEN_TESTING_RELEASE = f"{CONSOLE_BASE}/tracks/open-testing"

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


def track_status(pkg: str | None = None) -> dict:
    pkg = pkg or package_name()
    service = get_service()
    edit = service.edits().insert(packageName=pkg, body={}).execute()
    edit_id = edit["id"]
    out: dict = {"package": pkg, "tracks": {}}
    try:
        for track in ("production", "beta", "internal"):
            try:
                body = service.edits().tracks().get(
                    packageName=pkg, editId=edit_id, track=track
                ).execute()
            except Exception as exc:  # noqa: BLE001
                out["tracks"][track] = {"error": str(exc)}
                continue

            releases = body.get("releases") or []
            ca: dict = {}
            try:
                ca = (
                    service.edits()
                    .countryavailability()
                    .get(packageName=pkg, editId=edit_id, track=track)
                    .execute()
                )
            except Exception as exc:  # noqa: BLE001
                ca = {"error": str(exc)}

            out["tracks"][track] = {
                "releases": releases,
                "country_count": len(ca.get("countries") or []),
                "rest_of_world": ca.get("restOfWorld"),
                "sync_with_production": ca.get("syncWithProduction"),
            }
    finally:
        service.edits().delete(packageName=pkg, editId=edit_id).execute()
    return out


def restore_production_draft(
    *,
    version_code: str = "18",
    pkg: str | None = None,
) -> dict:
    pkg = pkg or package_name()
    service = get_service()
    edit = service.edits().insert(packageName=pkg, body={}).execute()
    edit_id = edit["id"]
    body = {
        "track": "production",
        "releases": [
            {
                "name": "1.0.0",
                "versionCodes": [str(version_code)],
                "status": "draft",
                "releaseNotes": [
                    {"language": "en-US", "text": DEFAULT_EN},
                    {"language": "hi-IN", "text": DEFAULT_HI},
                ],
            }
        ],
    }
    updated = (
        service.edits()
        .tracks()
        .update(packageName=pkg, editId=edit_id, track="production", body=body)
        .execute()
    )
    committed = service.edits().commit(packageName=pkg, editId=edit_id).execute()
    return {"track": updated, "commit": committed}


def open_urls(*urls: str) -> None:
    for url in urls:
        try:
            subprocess.run(["open", url], check=False)
        except OSError:
            print(url)


def main() -> int:
    parser = argparse.ArgumentParser(description="Fix Play track country targeting")
    parser.add_argument(
        "--track",
        choices=("production", "open-testing", "both"),
        default="both",
        help="Which Console countries page to open",
    )
    parser.add_argument(
        "--restore-production-draft",
        action="store_true",
        help="Re-create production draft for versionCode 18 after countries are set",
    )
    parser.add_argument("--json", action="store_true", help="Print API status as JSON")
    args = parser.parse_args()

    try:
        status = track_status()
    except PlayError as exc:
        print(f"✗ {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(status, indent=2))
    else:
        print("Play track country status\n" + "═" * 36)
        for track, info in status["tracks"].items():
            if "error" in info:
                print(f"  {track}: {info['error']}")
                continue
            rel = info.get("releases") or []
            rel_status = rel[0].get("status") if rel else "none"
            print(
                f"  {track}: release={rel_status}, "
                f"countries={info.get('country_count', 0)}, "
                f"rest_of_world={info.get('rest_of_world')}"
            )

    production_countries = status["tracks"].get("production", {}).get("country_count", 0)
    beta_countries = status["tracks"].get("beta", {}).get("country_count", 0)

    if production_countries == 0:
        print(
            "\n⚠ Production has no countries/regions — production releases cannot roll out."
        )
        print(
            "  Play API cannot set countries (Console only). "
            "Open Production → Countries/regions and add at least India + Rest of world."
        )
    if beta_countries == 0:
        print("\n⚠ Open testing (beta) has no countries — add them in Console.")

    urls: list[str] = []
    if args.track in ("production", "both"):
        urls.append(PRODUCTION_COUNTRIES)
    if args.track in ("open-testing", "both"):
        urls.append(OPEN_TESTING_COUNTRIES)
    if urls:
        print("\n→ Opening Play Console countries pages…")
        open_urls(*urls)

    if args.restore_production_draft:
        if production_countries == 0:
            print(
                "\n○ Skipping production draft restore — set production countries in Console first, "
                "then re-run with --restore-production-draft"
            )
        else:
            try:
                result = restore_production_draft()
                print("\n✓ Production draft restored (versionCode 18)")
                print(f"  commit edit: {result['commit'].get('id')}")
                open_urls(PRODUCTION_COUNTRIES.replace("/tracks/production", "/tracks/production"))
            except Exception as exc:  # noqa: BLE001
                print(f"\n✗ Failed to restore production draft: {exc}", file=sys.stderr)
                return 1

    print(
        "\nManual steps (if still blocked):\n"
        "  1. Play Console → track → Countries/regions tab\n"
        "  2. Add countries (recommend: India + United States + United Kingdom + Rest of world)\n"
        "  3. Save → return to Releases → Review release → Start rollout\n"
        f"  Open testing: {OPEN_TESTING_RELEASE}\n"
        f"  Learn more: https://support.google.com/googleplay/android-developer/answer/7550024"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
