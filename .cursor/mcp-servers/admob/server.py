#!/usr/bin/env python3
"""AdMob MCP server for Trivense — list/create ad units and pull earnings reports."""

from __future__ import annotations

import argparse
import json
import sys

from mcp.server.fastmcp import FastMCP

from admob_client import (
    AdMobError,
    apply_env_to_dotenv,
    auth_status,
    create_ad_unit,
    create_trivense_ad_units,
    find_trivense_android_app,
    generate_network_report,
    get_account,
    list_ad_units,
    list_apps,
    run_oauth_flow,
    trivense_codebase_config,
)

mcp = FastMCP('admob')


def _json(data: object) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False)


@mcp.tool()
def admob_auth_status() -> str:
    """Check OAuth setup, publisher code, and Trivense app ID env vars."""
    return _json(auth_status())


@mcp.tool()
def admob_get_account() -> str:
    """Get AdMob publisher account info (timezone, currency)."""
    try:
        return _json(get_account())
    except AdMobError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def admob_list_apps() -> str:
    """List all apps registered in your AdMob account."""
    try:
        return _json(list_apps())
    except AdMobError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def admob_list_ad_units(app_id: str = '') -> str:
    """List ad units. Optional app_id filter (e.g. ca-app-pub-…~…)."""
    try:
        return _json(list_ad_units(app_id=app_id))
    except AdMobError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def admob_find_trivense_app() -> str:
    """Find Trivense Android app (com.trivense.app) in AdMob."""
    try:
        app = find_trivense_android_app()
        if not app:
            return _json({'error': 'Trivense app not found', 'package': 'com.trivense.app'})
        return _json(app)
    except AdMobError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def admob_create_ad_unit(
    app_id: str,
    display_name: str,
    ad_format: str,
    ad_types: str = 'RICH_MEDIA,VIDEO',
) -> str:
    """Create one ad unit (BANNER, INTERSTITIAL, APP_OPEN). Requires monetization API access."""
    try:
        types = [t.strip() for t in ad_types.split(',') if t.strip()] or None
        return _json(
            create_ad_unit(
                app_id=app_id,
                display_name=display_name,
                ad_format=ad_format,
                ad_types=types,
            ),
        )
    except AdMobError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def admob_create_trivense_ad_units(apply_to_env: bool = True) -> str:
    """Create Banner, Interstitial, and App Open units for Trivense. Optionally writes IDs to .env."""
    try:
        result = create_trivense_ad_units()
        if apply_to_env and result.get('env'):
            path = apply_env_to_dotenv(result['env'])
            result['env_written_to'] = str(path)
        return _json(result)
    except AdMobError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def admob_network_report(
    date_start: str,
    date_end: str,
    metrics: str = 'IMPRESSIONS,CLICKS,ESTIMATED_EARNINGS',
    dimensions: str = 'DATE',
) -> str:
    """Generate an AdMob network earnings report. Dates: YYYY-MM-DD."""
    try:
        metric_list = [m.strip() for m in metrics.split(',') if m.strip()]
        dim_list = [d.strip() for d in dimensions.split(',') if d.strip()] or None
        return _json(
            generate_network_report(
                date_start=date_start,
                date_end=date_end,
                metrics=metric_list,
                dimensions=dim_list,
            ),
        )
    except AdMobError as exc:
        return _json({'error': str(exc)})
    except (ValueError, TypeError) as exc:
        return _json({'error': f'Invalid date or params: {exc}'})


@mcp.tool()
def admob_trivense_config() -> str:
    """Show Trivense AdMob file paths and env-configured app IDs (no secrets)."""
    return _json({'auth': auth_status(), 'codebase': trivense_codebase_config()})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--auth', action='store_true', help='Run Google OAuth flow once')
    parser.add_argument(
        '--create-trivense-units',
        action='store_true',
        help='Create Trivense ad units and write .env',
    )
    args = parser.parse_args()

    if args.auth:
        try:
            result = run_oauth_flow()
            print(_json(result))
        except AdMobError as exc:
            print(_json({'error': str(exc)}), file=sys.stderr)
            sys.exit(1)
        return

    if args.create_trivense_units:
        try:
            result = create_trivense_ad_units()
            if result.get('env'):
                path = apply_env_to_dotenv(result['env'])
                result['env_written_to'] = str(path)
            print(_json(result))
        except AdMobError as exc:
            print(_json({'error': str(exc)}), file=sys.stderr)
            sys.exit(1)
        return

    mcp.run()


if __name__ == '__main__':
    main()
