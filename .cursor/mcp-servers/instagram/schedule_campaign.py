#!/usr/bin/env python3
"""Batch-schedule Rasoi campaign posts on Instagram."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from instagram_client import InstagramClient, InstagramError
from scheduler import (
    get_posts_to_schedule,
    mark_campaign_scheduled,
    resolve_repo_path,
)


def schedule_all(*, dry_run: bool = False, delay_seconds: float = 3.0) -> int:
    posts = get_posts_to_schedule()
    if not posts:
        print("No campaign posts left to schedule.")
        return 0

    client = InstagramClient()
    scheduled: list[dict] = []
    errors: list[dict] = []

    for row in posts:
        preview = {
            "id": row["id"],
            "segment": row["segment"],
            "headline": row["headline"],
            "scheduled_at": row["scheduled_at"],
            "caption_preview": row["caption"][:120] + "…",
        }
        if dry_run:
            print(json.dumps({"dry_run": True, **preview}, ensure_ascii=False))
            scheduled.append(preview)
            continue

        try:
            path = resolve_repo_path(row["image_path"])
            schedule_at = __import__("datetime").datetime.fromisoformat(row["scheduled_at"])
            result = client.schedule_photo(path, row["caption"], schedule_at)
            mark_campaign_scheduled(row["id"], result, row["scheduled_at"])
            scheduled.append({"ok": True, **preview, **result})
            print(f"Scheduled post {row['id']} for {row['scheduled_at']} -> {result.get('url') or result.get('media_id')}")
            time.sleep(delay_seconds)
        except (InstagramError, FileNotFoundError) as exc:
            errors.append({"id": row["id"], "error": str(exc)})
            print(f"Failed post {row['id']}: {exc}", file=sys.stderr)
            if "limit" in str(exc).lower() or "scheduled" in str(exc).lower():
                break

    summary = {"scheduled": len(scheduled), "errors": errors, "total_pending": len(posts)}
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 1 if errors else 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--delay", type=float, default=3.0)
    args = parser.parse_args()
    raise SystemExit(schedule_all(dry_run=args.dry_run, delay_seconds=args.delay))


if __name__ == "__main__":
    main()
