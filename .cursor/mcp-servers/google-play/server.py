#!/usr/bin/env python3
"""Google Play Console MCP server for Rasoi — subscriptions, catalog, setup guidance."""

from __future__ import annotations

import argparse
import json
import sys

from mcp.server.fastmcp import FastMCP

from play_client import (
    PlayError,
    activate_base_plan,
    auth_status,
    convert_region_prices,
    create_manifest_subscriptions,
    create_rasoi_subscriptions,
    create_subscription,
    create_trivense_subscriptions,
    full_play_setup,
    full_rasoi_setup,
    full_trivense_setup,
    get_subscription,
    list_subscriptions,
    load_manifest,
    package_name,
    push_full_store_listing,
    push_store_graphics,
    push_store_listing,
    rasoi_codebase_config,
    run_oauth_flow,
    setup_guide,
    sync_manifest_subscriptions,
    trivense_codebase_config,
    verify_app,
)

mcp = FastMCP('google-play')


def _json(data: object) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False)


@mcp.tool()
def play_auth_status() -> str:
    """Check service account / OAuth setup and Rasoi package name."""
    return _json(auth_status())


@mcp.tool()
def play_setup_guide() -> str:
    """How to create the Play app manually and wire API access for subscriptions."""
    return _json(setup_guide())


@mcp.tool()
def play_verify_app(package_name: str = '') -> str:
    """Verify an app exists in Play Console and the API can reach it (lists subscriptions)."""
    try:
        return _json(verify_app(package_name or None))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_list_subscriptions(package_name: str = '') -> str:
    """List all subscription products for the Rasoi app."""
    try:
        return _json(list_subscriptions(package_name or None))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_get_subscription(product_id: str, package_name: str = '') -> str:
    """Get one subscription by product id (e.g. rasoi_plus_monthly)."""
    try:
        return _json(get_subscription(product_id, package_name or None))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_create_subscription(
    product_id: str,
    title: str,
    description: str,
    base_plan_id: str,
    billing_period: str,
    price_inr: float,
    activate: bool = True,
    package_name: str = '',
) -> str:
    """Create a Play subscription with one auto-renewing base plan. billing_period: P1M, P1Y, etc."""
    try:
        return _json(
            create_subscription(
                product_id=product_id,
                title=title,
                description=description,
                base_plan_id=base_plan_id,
                billing_period=billing_period,
                price_inr=price_inr,
                pkg=package_name or None,
                activate=activate,
            ),
        )
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_activate_base_plan(
    product_id: str,
    base_plan_id: str,
    package_name: str = '',
) -> str:
    """Activate a draft base plan so new subscribers can purchase it."""
    try:
        return _json(activate_base_plan(product_id, base_plan_id, package_name or None))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_create_rasoi_subscriptions(activate: bool = True, package_name: str = '') -> str:
    """Create Rasoi Plus monthly (₹49) and yearly (₹499) subscriptions if missing; optionally activate."""
    try:
        return _json(create_rasoi_subscriptions(activate=activate, pkg=package_name or None))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_convert_region_prices(price_inr: float, package_name: str = '') -> str:
    """Convert an INR price to regional Play prices using today's exchange rates."""
    try:
        return _json(convert_region_prices(price_inr, package_name or None))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_get_manifest() -> str:
    """Load Rasoi Play Console manifest (listing copy, subscriptions, declarations)."""
    try:
        return _json(load_manifest())
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_push_listing(package_name: str = '', language: str = 'en-US') -> str:
    """Push store title + descriptions from manifest.json via Play edits API."""
    try:
        return _json(push_store_listing(pkg=package_name or None, language=language))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_push_graphics(package_name: str = '', language: str = 'en-US') -> str:
    """Upload app icon, feature graphic, and phone screenshots from listing.json."""
    try:
        return _json(push_store_graphics(pkg=package_name or None, language=language))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_push_full_listing(package_name: str = '', language: str = 'en-US') -> str:
    """Push store copy and graphics (icon, feature graphic, screenshots) in one flow."""
    try:
        return _json(push_full_store_listing(pkg=package_name or None, language=language))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_full_setup(package_name: str = '', activate_subscriptions: bool = True) -> str:
    """After app exists in Play Console: verify, push listing, create Rasoi Plus subscriptions."""
    try:
        return _json(full_rasoi_setup(pkg=package_name or None, activate_subscriptions=activate_subscriptions))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_create_trivense_subscriptions(activate: bool = True, package_name: str = '') -> str:
    """Create or update Trivense Premium subscriptions — India INR + premium pricing for rich markets."""
    try:
        return _json(create_trivense_subscriptions(activate=activate, pkg=package_name or None))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_sync_trivense_pricing(package_name: str = '') -> str:
    """Push tiered subscription pricing from manifest.json to Play (India INR + premium USD markets)."""
    try:
        return _json(sync_manifest_subscriptions(activate=True, pkg=package_name or None))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_full_trivense_setup(package_name: str = '', activate_subscriptions: bool = True) -> str:
    """Verify app, push listing, create Trivense subscriptions with worldwide pricing."""
    try:
        return _json(full_trivense_setup(pkg=package_name or None, activate_subscriptions=activate_subscriptions))
    except PlayError as exc:
        return _json({'error': str(exc)})


@mcp.tool()
def play_trivense_config() -> str:
    """Show Trivense package name, product ids, and related codebase paths."""
    return _json({'package_name': package_name(), 'codebase': trivense_codebase_config()})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--auth', action='store_true', help='Run Google OAuth flow (oauth mode only)')
    args = parser.parse_args()

    if args.auth:
        try:
            result = run_oauth_flow()
            print(_json(result))
        except PlayError as exc:
            print(_json({'error': str(exc)}), file=sys.stderr)
            sys.exit(1)
        return

    mcp.run()


if __name__ == '__main__':
    main()
