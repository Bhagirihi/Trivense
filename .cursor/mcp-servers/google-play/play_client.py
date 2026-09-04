"""Google Play Developer API client for Trivense MCP."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

from google.auth.transport.requests import Request
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.http import MediaFileUpload

SCOPES = ['https://www.googleapis.com/auth/androidpublisher']

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parents[2]
CREDENTIALS_DIR = ROOT / 'credentials'
CLIENT_SECRET_PATH = CREDENTIALS_DIR / 'client_secret.json'
TOKEN_PATH = CREDENTIALS_DIR / 'token.json'
OAUTH_REDIRECT_PORT = 8766

DEFAULT_PACKAGE = 'com.trivense.app'
DEFAULT_REGIONS_VERSION = '2025/03'
DEFAULT_DEVELOPER_NAME = 'Bhagihiri Applications'
DEFAULT_APP_TITLE = 'Trivense'


class PlayError(Exception):
    pass


def developer_name() -> str:
    return os.environ.get('PLAY_DEVELOPER_NAME', '').strip() or DEFAULT_DEVELOPER_NAME


def app_title() -> str:
    return os.environ.get('PLAY_APP_TITLE', '').strip() or DEFAULT_APP_TITLE


def manifest_path() -> Path:
    custom = os.environ.get('PLAY_MANIFEST_PATH', '').strip()
    if custom:
        path = Path(custom)
        if not path.is_absolute():
            path = REPO_ROOT / path
        return path
    return REPO_ROOT / 'store-assets' / 'play' / 'manifest.json'


def load_manifest() -> dict[str, Any]:
    path = manifest_path()
    if not path.exists():
        raise PlayError(f'Play manifest not found: {path}')
    return json.loads(path.read_text(encoding='utf-8'))


def listing_path() -> Path:
    return REPO_ROOT / 'store-assets' / 'play' / 'listing.json'


def load_listing_assets() -> dict[str, Any]:
    path = listing_path()
    if not path.exists():
        raise PlayError(f'Play listing assets not found: {path}')
    return json.loads(path.read_text(encoding='utf-8'))


def resolve_asset_path(rel_path: str) -> Path:
    path = Path(rel_path)
    if not path.is_absolute():
        path = REPO_ROOT / path
    if not path.exists():
        raise PlayError(f'Asset not found: {path}')
    return path


def package_name() -> str:
    return (
        os.environ.get('PLAY_PACKAGE_NAME', '').strip()
        or os.environ.get('RASOI_PACKAGE_NAME', '').strip()
        or DEFAULT_PACKAGE
    )


def regions_version() -> str:
    return os.environ.get('PLAY_REGIONS_VERSION', '').strip() or DEFAULT_REGIONS_VERSION


def google_account_email() -> str:
    return os.environ.get('GOOGLE_ACCOUNT_EMAIL', '').strip() or 'my.website.email2@gmail.com'


def auth_mode() -> str:
    mode = os.environ.get('PLAY_AUTH_MODE', 'service_account').strip().lower()
    return mode if mode in {'service_account', 'oauth'} else 'service_account'


def service_account_path() -> Path:
    filename = os.environ.get('SERVICE_ACCOUNT_FILE', 'service_account.json').strip()
    return CREDENTIALS_DIR / filename


def _load_oauth_credentials() -> Credentials | None:
    if not TOKEN_PATH.exists():
        return None
    creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
    if creds.valid:
        return creds
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_PATH.write_text(creds.to_json())
        return creds
    return None


def _load_service_account_credentials():
    path = service_account_path()
    if not path.exists():
        return None
    return service_account.Credentials.from_service_account_file(str(path), scopes=SCOPES)


def get_credentials():
    mode = auth_mode()
    if mode == 'service_account':
        creds = _load_service_account_credentials()
        if creds:
            return creds
        raise PlayError(
            f'Service account not found at {service_account_path()}. '
            'Create one in Play Console → Users and permissions, download JSON, and save there.',
        )

    creds = _load_oauth_credentials()
    if not creds:
        raise PlayError('Not authenticated. Run: .cursor/mcp-servers/google-play/run.sh auth')
    return creds


def get_service():
    from googleapiclient.discovery import build

    return build('androidpublisher', 'v3', credentials=get_credentials(), cache_discovery=False)


def auth_status() -> dict[str, Any]:
    mode = auth_mode()
    sa_path = service_account_path()
    has_sa = sa_path.exists()
    has_secret = CLIENT_SECRET_PATH.exists()
    has_token = TOKEN_PATH.exists()
    oauth_creds = _load_oauth_credentials() if has_token else None
    sa_creds = _load_service_account_credentials() if has_sa else None

    authenticated = False
    if mode == 'service_account':
        authenticated = sa_creds is not None
    else:
        authenticated = oauth_creds is not None and oauth_creds.valid

    return {
        'auth_mode': mode,
        'authenticated': authenticated,
        'google_account_email': google_account_email(),
        'developer_name': developer_name(),
        'app_title': app_title(),
        'package_name': package_name(),
        'regions_version': regions_version(),
        'service_account_configured': has_sa,
        'service_account_path': str(sa_path),
        'oauth_client_secret_configured': has_secret,
        'oauth_token_configured': has_token,
        'credentials_dir': str(CREDENTIALS_DIR),
        'api_scope': SCOPES[0],
        'note_app_creation': (
            'Google Play API cannot create a new app listing. '
            'Create the app once in Play Console, then use this MCP for subscriptions and publishing.'
        ),
    }


def run_oauth_flow() -> dict[str, Any]:
    if not CLIENT_SECRET_PATH.exists():
        raise PlayError(
            f'Download OAuth Desktop client JSON from Google Cloud Console and save as {CLIENT_SECRET_PATH}',
        )

    CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
    email = google_account_email()
    print(f'Play Console OAuth: sign in as {email} in the browser window.', file=sys.stderr)
    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET_PATH), SCOPES)
    creds = flow.run_local_server(port=OAUTH_REDIRECT_PORT, open_browser=True, login_hint=email)
    TOKEN_PATH.write_text(creds.to_json())
    return {'ok': True, 'token_path': str(TOKEN_PATH)}


def setup_guide() -> dict[str, Any]:
    manifest = load_manifest()
    return {
        'developerAccount': {
            'displayName': developer_name(),
            'registrationUrl': 'https://play.google.com/console/signup',
            'fee': 'USD $25 one-time',
            'steps': [
                f'Register developer account as "{developer_name()}"',
                'Complete identity verification and accept Play Developer Distribution Agreement',
                'Enable Google Play Android Developer API in Google Cloud Console',
                'Create service account and invite it in Play Console → Users and permissions',
            ],
        },
        'application': manifest.get('application', {}),
        'limitations': {
            'create_app_via_api': False,
            'reason': (
                'All Play Developer API endpoints require an existing packageName. '
                'Initial app creation must be done in Play Console.'
            ),
            'create_subscription_via_api': True,
            'push_listing_via_api': True,
            'docs': 'https://developers.google.com/android-publisher/getting_started',
        },
        'manual_app_creation_steps': [
            'Open https://play.google.com/console → Create app',
            f'App name: "{app_title()}" (Play Console display name)',
            f'Package name: {package_name()} (immutable — must match app.config.js)',
            'App type: App · Category: Food & Drink · Free',
            'Complete declarations (ads, IAP, Play App Signing)',
            'Upload production AAB to internal testing: eas build -p android --profile production',
        ],
        'api_setup_steps': [
            'Google Cloud Console: enable "Google Play Android Developer API".',
            'Play Console → Users and permissions → Invite service account email.',
            'Permissions: Manage store presence, Manage orders and subscriptions, View financial data.',
            'Save JSON to .cursor/mcp-servers/google-play/credentials/service_account.json',
            'Run MCP tool play_full_setup after app exists in console.',
        ],
        'storeListing': manifest.get('storeListing', {}),
        'subscriptions': manifest.get('subscriptions', {}),
        'manifestPath': str(manifest_path()),
    }


def money(currency_code: str, amount: float) -> dict[str, Any]:
    units = int(amount)
    nanos = int(round((amount - units) * 1_000_000_000))
    return {'currencyCode': currency_code, 'units': str(units), 'nanos': nanos}


def fetch_worldwide_prices(
    pkg: str,
    *,
    price_inr: float | None = None,
    price_usd: float | None = None,
) -> dict[str, Any]:
    """Use Play convertRegionPrices for worldwide localized pricing."""
    if price_inr is None and price_usd is None:
        raise PlayError('fetch_worldwide_prices requires price_inr or price_usd')

    if price_inr is not None:
        anchor = money('INR', price_inr)
    else:
        anchor = money('USD', price_usd or 0)

    service = get_service()
    return (
        service.monetization()
        .convertRegionPrices(
            packageName=pkg,
            body={'price': anchor},
        )
        .execute()
    )


def subscription_pricing_tiers() -> dict[str, Any]:
    return load_manifest().get('subscriptions', {}).get('pricing', {})


def build_regional_configs(
    pkg: str,
    *,
    price_inr: float,
    price_usd_premium: float | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
    """Build regionalConfigs with India INR pricing and premium USD anchor for rich markets."""
    tiers = subscription_pricing_tiers()
    india_regions = set(tiers.get('india', {}).get('regions', ['IN']))
    premium_regions = set(tiers.get('premium', {}).get('regions', []))

    try:
        emerging_converted = fetch_worldwide_prices(pkg, price_inr=price_inr)
        premium_converted = (
            fetch_worldwide_prices(pkg, price_usd=price_usd_premium)
            if price_usd_premium
            else None
        )
    except Exception as exc:  # noqa: BLE001 — fallback when API unavailable
        print(f'convertRegionPrices fallback ({exc}); using INR + premium USD/EUR', file=sys.stderr)
        inr = money('INR', price_inr)
        usd_premium = money('USD', price_usd_premium or round(price_inr / 83 * 3, 2))
        eur_premium = money('EUR', round((price_usd_premium or 9.99) * 0.92, 2))
        return (
            [
                {'regionCode': 'IN', 'newSubscriberAvailability': True, 'price': inr},
                {'regionCode': 'US', 'newSubscriberAvailability': True, 'price': usd_premium},
            ],
            {
                'usdPrice': usd_premium,
                'eurPrice': eur_premium,
                'newSubscriberAvailability': True,
            },
        )

    emerging_prices = emerging_converted.get('convertedRegionPrices') or {}
    premium_prices = (premium_converted or {}).get('convertedRegionPrices') or {}
    all_regions = set(emerging_prices) | set(premium_prices) | india_regions

    regional_configs: list[dict[str, Any]] = []
    for region_code in sorted(all_regions):
        if region_code in india_regions:
            price = money('INR', price_inr)
        elif region_code in premium_regions and region_code in premium_prices:
            price = premium_prices[region_code].get('price')
        elif region_code in emerging_prices:
            price = emerging_prices[region_code].get('price')
        else:
            continue

        if not price:
            continue

        regional_configs.append(
            {
                'regionCode': region_code,
                'newSubscriberAvailability': True,
                'price': price,
            },
        )

    other_regions = None
    if premium_converted:
        other_regions = (
            premium_converted.get('convertedOtherRegionsPrice')
            or premium_converted.get('otherRegionsPrice')
        )
    if not other_regions:
        other_regions = (
            emerging_converted.get('convertedOtherRegionsPrice')
            or emerging_converted.get('otherRegionsPrice')
        )

    return regional_configs, other_regions


def build_subscription_body(
    *,
    pkg: str,
    product_id: str,
    title: str,
    description: str,
    base_plan_id: str,
    billing_period: str,
    price_inr: float,
    price_usd_premium: float | None = None,
    benefits: list[str] | None = None,
) -> dict[str, Any]:
    regional_configs, other_regions = build_regional_configs(
        pkg,
        price_inr=price_inr,
        price_usd_premium=price_usd_premium,
    )

    base_plan: dict[str, Any] = {
        'basePlanId': base_plan_id,
        'autoRenewingBasePlanType': {'billingPeriodDuration': billing_period},
        'regionalConfigs': regional_configs,
    }
    if other_regions:
        base_plan['otherRegionsConfig'] = {
            **other_regions,
            'newSubscriberAvailability': True,
        }

    return {
        'packageName': pkg,
        'productId': product_id,
        'listings': [
            {
                'languageCode': 'en-US',
                'title': title,
                'description': description[:200],
                'benefits': (benefits or [])[:4],
            },
        ],
        'basePlans': [base_plan],
    }


def verify_app(pkg: str | None = None) -> dict[str, Any]:
    pkg = (pkg or package_name()).strip()
    service = get_service()
    try:
        data = service.monetization().subscriptions().list(packageName=pkg).execute()
        subs = data.get('subscriptions', [])
        return {
            'ok': True,
            'package_name': pkg,
            'subscription_count': len(subs),
            'message': 'App is reachable via Play Developer API.',
        }
    except Exception as exc:  # noqa: BLE001 — surface API errors to MCP caller
        err = str(exc)
        if '404' in err or 'not found' in err.lower():
            return {
                'ok': False,
                'package_name': pkg,
                'error': err,
                'hint': (
                    'App may not exist in Play Console yet, or the service account lacks access. '
                    'Run play_setup_guide and create the app manually first.'
                ),
            }
        raise PlayError(err) from exc


def list_subscriptions(pkg: str | None = None) -> list[dict[str, Any]]:
    pkg = (pkg or package_name()).strip()
    service = get_service()
    data = service.monetization().subscriptions().list(packageName=pkg).execute()
    return data.get('subscriptions', [])


def get_subscription(product_id: str, pkg: str | None = None) -> dict[str, Any]:
    pkg = (pkg or package_name()).strip()
    service = get_service()
    return (
        service.monetization()
        .subscriptions()
        .get(packageName=pkg, productId=product_id.strip())
        .execute()
    )


def create_subscription(
    product_id: str,
    title: str,
    description: str,
    base_plan_id: str,
    billing_period: str,
    price_inr: float,
    *,
    price_usd_premium: float | None = None,
    pkg: str | None = None,
    activate: bool = False,
    benefits: list[str] | None = None,
) -> dict[str, Any]:
    pkg = (pkg or package_name()).strip()
    body = build_subscription_body(
        pkg=pkg,
        product_id=product_id.strip(),
        title=title,
        description=description,
        base_plan_id=base_plan_id,
        billing_period=billing_period,
        price_inr=price_inr,
        price_usd_premium=price_usd_premium,
        benefits=benefits,
    )
    service = get_service()
    created = (
        service.monetization()
        .subscriptions()
        .create(
            packageName=pkg,
            productId=product_id.strip(),
            regionsVersion_version=regions_version(),
            body=body,
        )
        .execute()
    )

    result: dict[str, Any] = {'created': created, 'activated': None}
    if activate:
        result['activated'] = activate_base_plan(product_id=product_id, base_plan_id=base_plan_id, pkg=pkg)
    return result


def activate_base_plan(product_id: str, base_plan_id: str, pkg: str | None = None) -> dict[str, Any]:
    pkg = (pkg or package_name()).strip()
    service = get_service()
    return (
        service.monetization()
        .subscriptions()
        .basePlans()
        .activate(
            packageName=pkg,
            productId=product_id.strip(),
            basePlanId=base_plan_id.strip(),
            body={},
        )
        .execute()
    )


def update_subscription_pricing(
    product_id: str,
    base_plan_id: str,
    *,
    price_inr: float,
    price_usd_premium: float | None = None,
    pkg: str | None = None,
) -> dict[str, Any]:
    """Patch an existing subscription base plan with tiered regional pricing."""
    pkg = (pkg or package_name()).strip()
    regional_configs, other_regions = build_regional_configs(
        pkg,
        price_inr=price_inr,
        price_usd_premium=price_usd_premium,
    )

    existing = get_subscription(product_id, pkg=pkg)
    base_plans = existing.get('basePlans') or []
    target_plan = next((bp for bp in base_plans if bp.get('basePlanId') == base_plan_id), None)
    if not target_plan:
        raise PlayError(f'Base plan {base_plan_id!r} not found on {product_id!r}')

    target_plan['regionalConfigs'] = regional_configs
    if other_regions:
        target_plan['otherRegionsConfig'] = {
            **other_regions,
            'newSubscriberAvailability': True,
        }

    service = get_service()
    patched = (
        service.monetization()
        .subscriptions()
        .patch(
            packageName=pkg,
            productId=product_id.strip(),
            updateMask='basePlans',
            regionsVersion_version=regions_version(),
            body={
                'packageName': pkg,
                'productId': product_id.strip(),
                'basePlans': base_plans,
            },
        )
        .execute()
    )

    us_price = next((r for r in regional_configs if r.get('regionCode') == 'US'), None)
    in_price = next((r for r in regional_configs if r.get('regionCode') == 'IN'), None)
    return {
        'product_id': product_id,
        'base_plan_id': base_plan_id,
        'region_count': len(regional_configs),
        'sample_prices': {'IN': in_price, 'US': us_price},
        'subscription': patched,
    }


def sync_manifest_subscriptions(*, activate: bool = True, pkg: str | None = None) -> dict[str, Any]:
    pkg = (pkg or package_name()).strip()
    manifest = load_manifest()
    sub_cfg = manifest.get('subscriptions', {})
    products = sub_cfg.get('products', [])

    results: list[dict[str, Any]] = []
    for spec in products:
        product_id = spec['productId']
        base_plan_id = spec['basePlanId']
        price_inr = float(spec['priceInr'])
        price_usd_premium = spec.get('priceUsdPremium')
        price_usd_premium = float(price_usd_premium) if price_usd_premium is not None else None

        try:
            existing = get_subscription(product_id, pkg=pkg)
            updated = update_subscription_pricing(
                product_id=product_id,
                base_plan_id=base_plan_id,
                price_inr=price_inr,
                price_usd_premium=price_usd_premium,
                pkg=pkg,
            )
            entry: dict[str, Any] = {
                'product_id': product_id,
                'status': 'pricing_updated',
                **updated,
            }
            if activate:
                base_plans = existing.get('basePlans') or []
                for bp in base_plans:
                    if bp.get('state') != 'ACTIVE':
                        entry['activated'] = activate_base_plan(
                            product_id=product_id,
                            base_plan_id=bp.get('basePlanId', base_plan_id),
                            pkg=pkg,
                        )
            results.append(entry)
        except Exception as exc:  # noqa: BLE001
            if '404' not in str(exc):
                results.append({'product_id': product_id, 'status': 'error', 'error': str(exc)})
                continue
            created = create_subscription(
                product_id=product_id,
                title=spec['title'],
                description=spec['description'],
                base_plan_id=base_plan_id,
                billing_period=spec['billingPeriod'],
                price_inr=price_inr,
                price_usd_premium=price_usd_premium,
                pkg=pkg,
                activate=activate,
                benefits=spec.get('benefits'),
            )
            results.append({'product_id': product_id, 'status': 'created', **created})

    tiers = sub_cfg.get('pricing', {})
    return {
        'package_name': pkg,
        'entitlement_id': sub_cfg.get('entitlementId'),
        'pricing': (
            'India INR base + premium USD anchor for '
            f"{len(tiers.get('premium', {}).get('regions', []))} rich markets"
        ),
        'results': results,
    }


def create_manifest_subscriptions(*, activate: bool = True, pkg: str | None = None) -> dict[str, Any]:
    return sync_manifest_subscriptions(activate=activate, pkg=pkg)


def create_rasoi_subscriptions(*, activate: bool = True, pkg: str | None = None) -> dict[str, Any]:
    return create_manifest_subscriptions(activate=activate, pkg=pkg)


def create_trivense_subscriptions(*, activate: bool = True, pkg: str | None = None) -> dict[str, Any]:
    return create_manifest_subscriptions(activate=activate, pkg=pkg)


def push_store_listing(*, pkg: str | None = None, language: str = 'en-US') -> dict[str, Any]:
    """Push title, short + full description from manifest via edits API."""
    pkg = (pkg or package_name()).strip()
    manifest = load_manifest()
    listing = manifest.get('storeListing', {})
    service = get_service()

    edit = service.edits().insert(packageName=pkg, body={}).execute()
    edit_id = edit['id']

    body = {
        'title': listing.get('title', app_title())[:30],
        'shortDescription': listing.get('shortDescription', '')[:80],
        'fullDescription': listing.get('fullDescription', '')[:4000],
    }

    updated = (
        service.edits()
        .listings()
        .update(packageName=pkg, editId=edit_id, language=language, body=body)
        .execute()
    )

    committed = service.edits().commit(packageName=pkg, editId=edit_id).execute()

    return {
        'package_name': pkg,
        'language': language,
        'listing': updated,
        'commit': committed,
    }


def push_store_graphics(*, pkg: str | None = None, language: str = 'en-US') -> dict[str, Any]:
    """Upload app icon, feature graphic, and phone screenshots from listing.json."""
    pkg = (pkg or package_name()).strip()
    assets_cfg = load_listing_assets().get('assets', {})
    service = get_service()

    edit = service.edits().insert(packageName=pkg, body={}).execute()
    edit_id = edit['id']
    uploaded: dict[str, Any] = {}

    # Replace existing assets (uploads append; Play max 8 phone screenshots)
    for image_type in ('icon', 'featureGraphic', 'phoneScreenshots'):
        service.edits().images().deleteall(
            packageName=pkg,
            editId=edit_id,
            language=language,
            imageType=image_type,
        ).execute()

    icon_path = resolve_asset_path(assets_cfg['appIcon512'])
    uploaded['icon'] = (
        service.edits()
        .images()
        .upload(
            packageName=pkg,
            editId=edit_id,
            language=language,
            imageType='icon',
            media_body=MediaFileUpload(str(icon_path), mimetype='image/png', resumable=True),
        )
        .execute()
    )

    feature_path = resolve_asset_path(assets_cfg['featureGraphic1024x500'])
    uploaded['featureGraphic'] = (
        service.edits()
        .images()
        .upload(
            packageName=pkg,
            editId=edit_id,
            language=language,
            imageType='featureGraphic',
            media_body=MediaFileUpload(str(feature_path), mimetype='image/png', resumable=True),
        )
        .execute()
    )

    for index, rel_path in enumerate(assets_cfg.get('phoneScreenshots', []), start=1):
        screenshot_path = resolve_asset_path(rel_path)
        uploaded[f'phoneScreenshot_{index}'] = (
            service.edits()
            .images()
            .upload(
                packageName=pkg,
                editId=edit_id,
                language=language,
                imageType='phoneScreenshots',
                media_body=MediaFileUpload(str(screenshot_path), mimetype='image/png', resumable=True),
            )
            .execute()
        )

    committed = service.edits().commit(packageName=pkg, editId=edit_id).execute()

    return {
        'package_name': pkg,
        'language': language,
        'uploaded': uploaded,
        'commit': committed,
    }


def push_full_store_listing(*, pkg: str | None = None, language: str = 'en-US') -> dict[str, Any]:
    """Push listing copy and graphics in one flow."""
    return {
        'text': push_store_listing(pkg=pkg, language=language),
        'graphics': push_store_graphics(pkg=pkg, language=language),
    }


def full_play_setup(*, pkg: str | None = None, activate_subscriptions: bool = True) -> dict[str, Any]:
    """Verify app, push store listing, create subscriptions — after Play Console app exists."""
    pkg = (pkg or package_name()).strip()
    manifest = load_manifest()
    steps: dict[str, Any] = {
        'developer': developer_name(),
        'app_title': app_title(),
        'package_name': pkg,
    }

    verify = verify_app(pkg)
    steps['verify'] = verify
    if not verify.get('ok'):
        steps['status'] = 'blocked'
        steps['message'] = (
            f'App not reachable. Create "{app_title()}" in Play Console under {developer_name()} first.'
        )
        return steps

    try:
        steps['listing'] = push_full_store_listing(pkg=pkg)
    except Exception as exc:  # noqa: BLE001
        steps['listing'] = {'error': str(exc)}

    try:
        steps['subscriptions'] = create_manifest_subscriptions(activate=activate_subscriptions, pkg=pkg)
    except Exception as exc:  # noqa: BLE001
        steps['subscriptions'] = {'error': str(exc)}

    steps['status'] = 'complete'
    steps['manifest'] = str(manifest_path())
    steps['revenuecat'] = manifest.get('subscriptions', {}).get('revenueCatPackages')
    return steps


def full_rasoi_setup(*, pkg: str | None = None, activate_subscriptions: bool = True) -> dict[str, Any]:
    return full_play_setup(pkg=pkg, activate_subscriptions=activate_subscriptions)


def full_trivense_setup(*, pkg: str | None = None, activate_subscriptions: bool = True) -> dict[str, Any]:
    return full_play_setup(pkg=pkg, activate_subscriptions=activate_subscriptions)


def convert_region_prices(
    price_inr: float | None = None,
    price_usd: float | None = None,
    pkg: str | None = None,
) -> dict[str, Any]:
    pkg = (pkg or package_name()).strip()
    return fetch_worldwide_prices(
        pkg,
        price_inr=price_inr,
        price_usd=price_usd,
    )


def price_to_amount_micros(price: dict[str, Any]) -> int:
    units = int(price.get('units', 0))
    nanos = int(price.get('nanos', 0))
    return int(round((units + nanos / 1_000_000_000) * 1_000_000))


def export_territory_prices_for_revenuecat(
    *,
    price_inr: float,
    price_usd_premium: float | None = None,
    pkg: str | None = None,
) -> dict[str, dict[str, Any]]:
    """Map Play regional configs to RevenueCat territory_prices micros format."""
    regional_configs, _ = build_regional_configs(
        (pkg or package_name()).strip(),
        price_inr=price_inr,
        price_usd_premium=price_usd_premium,
    )
    territory_prices: dict[str, dict[str, Any]] = {}
    for region in regional_configs:
        price = region.get('price') or {}
        territory_prices[region['regionCode']] = {
            'amount_micros': price_to_amount_micros(price),
            'currency': price['currencyCode'],
        }
    return territory_prices


def trivense_codebase_config() -> dict[str, Any]:
    manifest = manifest_path()
    return {
        'developer_name': developer_name(),
        'app_title': app_title(),
        'package_name': package_name(),
        'manifest_path': str(manifest) if manifest.exists() else None,
        'listing_json': str(REPO_ROOT / 'store-assets' / 'play' / 'listing.json'),
        'product_ids': {
            'monthly': 'trivense_monthly',
            'yearly': 'trivense_yearly',
        },
        'entitlement': 'premium',
        'prices_inr': {'monthly': 299, 'yearly': 2499},
        'prices_usd_premium': {'monthly': 9.99, 'yearly': 79.99},
    }


def rasoi_codebase_config() -> dict[str, Any]:
    return trivense_codebase_config()
