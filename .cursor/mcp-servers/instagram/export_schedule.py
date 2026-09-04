#!/usr/bin/env python3
"""Export and confirm local campaign schedule (captions + publish times)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from scheduler import get_posts_to_schedule, load_campaign_posts

SERVER_ROOT = Path(__file__).resolve().parent
SCHEDULE_FILE = SERVER_ROOT / "campaign-schedule.json"


def export_schedule() -> dict:
    rows = load_campaign_posts()
    pending = get_posts_to_schedule()
    payload = {
        "apk_download_url": "https://rasoiapplication.in/download",
        "timezone": "Asia/Kolkata",
        "publish_time": "10:00 IST daily",
        "published_count": sum(1 for r in rows if r["published"]),
        "scheduled_count": sum(1 for r in rows if r.get("instagram_scheduled")),
        "pending_count": len(pending),
        "posts": [
            {
                "id": row["id"],
                "segment": row["segment"],
                "headline": row["headline"],
                "scheduled_at": row["scheduled_at"],
                "image_path": row["image_path"],
                "published": row["published"],
                "caption": row["caption"],
                "url": row.get("url"),
            }
            for row in rows
        ],
    }
    SCHEDULE_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print summary only")
    args = parser.parse_args()
    payload = export_schedule()
    summary = {
        "total": len(payload["posts"]),
        "published": payload["published_count"],
        "pending": payload["pending_count"],
        "schedule_file": str(SCHEDULE_FILE),
        "next_pending": next(
            (
                {"id": p["id"], "headline": p["headline"], "scheduled_at": p["scheduled_at"]}
                for p in payload["posts"]
                if not p["published"]
            ),
            None,
        ),
    }
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
