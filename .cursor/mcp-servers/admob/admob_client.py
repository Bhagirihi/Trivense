"""Google AdMob API client for Trivense MCP."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    'https://www.googleapis.com/auth/admob.readonly',
    'https://www.googleapis.com/auth/admob.report',
    'https://www.googleapis.com/auth/admob.monetization',
]

ROOT = Path(__file__).resolve().parent
CREDENTIALS_DIR = ROOT / 'credentials'
CLIENT_SECRET_PATH = CREDENTIALS_DIR / 'client_secret.json'
TOKEN_PATH = CREDENTIALS_DIR / 'token.json'
OAUTH_REDIRECT_PORT = 8765

TRIVENSE_PACKAGE = 'com.trivense.app'
TRIVENSE_CONSOLE_APP_ID = '5149530682'

TRIVENSE_AD_UNITS = [
    {
        'displayName': 'Trivense Banner Home',
        'adFormat': 'BANNER',
        'adTypes': ['RICH_MEDIA'],
        'envKey': 'EXPO_PUBLIC_ADMOB_ANDROID_BANNER',
    },
    {
        'displayName': 'Trivense Interstitial Expense',
        'adFormat': 'INTERSTITIAL',
        'adTypes': ['RICH_MEDIA', 'VIDEO'],
        'envKey': 'EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL',
    },
    {
        'displayName': 'Trivense App Open',
        'adFormat': 'APP_OPEN',
        'adTypes': ['RICH_MEDIA', 'VIDEO'],
        'envKey': 'EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN',
    },
]


class AdMobError(Exception):
    pass


def publisher_code() -> str:
    code = os.environ.get('PUBLISHER_CODE', '').strip()
    if not code:
        raise AdMobError('Set PUBLISHER_CODE in .cursor/mcp-servers/admob/.env')
    if not code.startswith('pub-'):
        code = f'pub-{code}'
    return code


def account_name() -> str:
    return f'accounts/{publisher_code()}'


def _load_credentials() -> Credentials | None:
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


def google_account_email() -> str:
    return os.environ.get('GOOGLE_ACCOUNT_EMAIL', '').strip() or 'my.website.email2@gmail.com'


def auth_status() -> dict[str, Any]:
    has_secret = CLIENT_SECRET_PATH.exists()
    has_token = TOKEN_PATH.exists()
    creds = _load_credentials() if has_token else None
    return {
        'client_secret_configured': has_secret,
        'token_configured': has_token,
        'authenticated': creds is not None and creds.valid,
        'google_account_email': google_account_email(),
        'publisher_code': os.environ.get('PUBLISHER_CODE', '').strip() or None,
        'trivense_android_app_id': os.environ.get('TRIVENSE_ADMOB_ANDROID_APP_ID', '').strip() or None,
        'trivense_package': TRIVENSE_PACKAGE,
        'credentials_dir': str(CREDENTIALS_DIR),
    }


def run_oauth_flow() -> dict[str, Any]:
    if not CLIENT_SECRET_PATH.exists():
        raise AdMobError(
            f'Download OAuth Desktop client JSON from Google Cloud Console and save as {CLIENT_SECRET_PATH}',
        )

    CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
    email = google_account_email()
    print(f'AdMob OAuth: sign in as {email} in the browser window.', file=sys.stderr)
    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET_PATH), SCOPES)
    creds = flow.run_local_server(port=OAUTH_REDIRECT_PORT, open_browser=True, login_hint=email)
    TOKEN_PATH.write_text(creds.to_json())
    return {'ok': True, 'token_path': str(TOKEN_PATH)}


def get_service(version: str = 'v1'):
    creds = _load_credentials()
    if not creds:
        raise AdMobError(
            'Not authenticated. Run: .cursor/mcp-servers/admob/run.sh auth',
        )

    from googleapiclient.discovery import build

    return build('admob', version, credentials=creds, cache_discovery=False)


def get_account() -> dict[str, Any]:
    service = get_service()
    data = service.accounts().get(name=account_name()).execute()
    return {
        'name': data.get('name'),
        'publisherId': data.get('publisherId'),
        'reportingTimeZone': data.get('reportingTimeZone'),
        'currencyCode': data.get('currencyCode'),
    }


def list_apps() -> list[dict[str, Any]]:
    service = get_service()
    apps: list[dict[str, Any]] = []
    page_token: str | None = None
    while True:
        request = service.accounts().apps().list(parent=account_name(), pageToken=page_token)
        data = request.execute()
        apps.extend(data.get('apps', []))
        page_token = data.get('nextPageToken')
        if not page_token:
            break
    return apps


def _app_package(app: dict[str, Any]) -> str:
    linked = app.get('linkedAppInfo') or {}
    return (linked.get('appStoreId') or '').strip()


def _app_display_name(app: dict[str, Any]) -> str:
    linked = app.get('linkedAppInfo') or {}
    manual = app.get('manualAppInfo') or {}
    return (linked.get('displayName') or manual.get('displayName') or '').strip()


def find_trivense_android_app() -> dict[str, Any] | None:
    env_app_id = os.environ.get('TRIVENSE_ADMOB_ANDROID_APP_ID', '').strip()
    for app in list_apps():
        if app.get('platform') != 'ANDROID':
            continue
        if env_app_id and app.get('appId') == env_app_id:
            return app
        if _app_package(app) == TRIVENSE_PACKAGE:
            return app
        name = _app_display_name(app).lower()
        if 'trivense' in name:
            return app
    return None


def list_ad_units(app_id: str = '') -> list[dict[str, Any]]:
    service = get_service()
    units: list[dict[str, Any]] = []
    page_token: str | None = None
    while True:
        request = service.accounts().adUnits().list(parent=account_name(), pageToken=page_token)
        data = request.execute()
        units.extend(data.get('adUnits', []))
        page_token = data.get('nextPageToken')
        if not page_token:
            break
    if app_id.strip():
        needle = app_id.strip()
        units = [
            u for u in units
            if needle in (u.get('appId') or '') or needle in (u.get('name') or '')
        ]
    return units


def create_ad_unit(
    app_id: str,
    display_name: str,
    ad_format: str,
    ad_types: list[str] | None = None,
) -> dict[str, Any]:
    """Create ad unit via AdMob API v1beta (may return 403 if create access not granted)."""
    service = get_service(version='v1beta')
    body: dict[str, Any] = {
        'displayName': display_name,
        'appId': app_id,
        'adFormat': ad_format,
    }
    if ad_types:
        body['adTypes'] = ad_types

    try:
        return (
            service.accounts()
            .adUnits()
            .create(parent=account_name(), body=body)
            .execute()
        )
    except Exception as exc:
        message = str(exc)
        if '403' in message or 'PERMISSION_DENIED' in message:
            raise AdMobError(
                'AdMob API denied ad unit creation (limited access). '
                'Create units manually at '
                'https://admob.google.com/v2/apps/5149530682/adunits/list',
            ) from exc
        raise AdMobError(message) from exc


def create_trivense_ad_units(dry_run: bool = False) -> dict[str, Any]:
    app = find_trivense_android_app()
    if not app:
        raise AdMobError(
            f'Trivense Android app ({TRIVENSE_PACKAGE}) not found in AdMob. '
            'Register it first at https://admob.google.com',
        )

    app_id = app.get('appId')
    if not app_id:
        raise AdMobError('Trivense app found but missing appId')

    existing = list_ad_units(app_id=app_id)
    existing_by_name = {
        (u.get('displayName') or '').strip().lower(): u for u in existing
    }

    results: list[dict[str, Any]] = []
    env_lines: dict[str, str] = {
        'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID': app_id,
    }

    for spec in TRIVENSE_AD_UNITS:
        name = spec['displayName']
        key = name.lower()
        if key in existing_by_name:
            unit = existing_by_name[key]
            results.append({
                'status': 'exists',
                'displayName': name,
                'adUnitId': unit.get('adUnitId'),
                'adFormat': unit.get('adFormat'),
            })
            env_lines[spec['envKey']] = unit.get('adUnitId') or ''
            continue

        if dry_run:
            results.append({
                'status': 'would_create',
                'displayName': name,
                'adFormat': spec['adFormat'],
            })
            continue

        created = create_ad_unit(
            app_id=app_id,
            display_name=name,
            ad_format=spec['adFormat'],
            ad_types=spec.get('adTypes'),
        )
        ad_unit_id = created.get('adUnitId')
        results.append({
            'status': 'created',
            'displayName': name,
            'adUnitId': ad_unit_id,
            'adFormat': created.get('adFormat'),
        })
        env_lines[spec['envKey']] = ad_unit_id or ''

    return {
        'app': {
            'appId': app_id,
            'displayName': _app_display_name(app),
            'packageName': _app_package(app),
            'platform': app.get('platform'),
        },
        'units': results,
        'env': env_lines,
    }


def apply_env_to_dotenv(env_lines: dict[str, str], dotenv_path: Path | None = None) -> Path:
    """Merge AdMob IDs into project .env."""
    repo_root = ROOT.parents[2]
    path = dotenv_path or (repo_root / '.env')
    lines: list[str] = []
    if path.exists():
        lines = path.read_text().splitlines()

    updated_keys = set(env_lines.keys())
    new_lines: list[str] = []
    seen: set[str] = set()

    for line in lines:
        if '=' in line and not line.strip().startswith('#'):
            key = line.split('=', 1)[0].strip()
            if key in updated_keys:
                new_lines.append(f'{key}={env_lines[key]}')
                seen.add(key)
                continue
        new_lines.append(line)

    for key, value in env_lines.items():
        if key not in seen and value:
            new_lines.append(f'{key}={value}')

    path.write_text('\n'.join(new_lines) + '\n')
    return path


def generate_network_report(
    date_start: str,
    date_end: str,
    metrics: list[str] | None = None,
    dimensions: list[str] | None = None,
) -> list[dict[str, Any]]:
    service = get_service()
    sy, sm, sd = [int(x) for x in date_start.split('-')]
    ey, em, ed = [int(x) for x in date_end.split('-')]
    report_spec: dict[str, Any] = {
        'dateRange': {
            'startDate': {'year': sy, 'month': sm, 'day': sd},
            'endDate': {'year': ey, 'month': em, 'day': ed},
        },
        'metrics': metrics or ['IMPRESSIONS', 'CLICKS', 'ESTIMATED_EARNINGS'],
    }
    if dimensions:
        report_spec['dimensions'] = dimensions

    request = service.accounts().networkReport().generate(
        parent=account_name(),
        body={'reportSpec': report_spec},
    )
    rows: list[dict[str, Any]] = []
    for chunk in request.execute():
        if 'row' in chunk:
            rows.append(chunk['row'])
        if 'footer' in chunk:
            rows.append({'footer': chunk['footer']})
    return rows


def trivense_codebase_config() -> dict[str, Any]:
    repo_root = ROOT.parents[2]
    paths = {
        'admob_config': repo_root / 'src' / 'config' / 'admob.js',
        'env_example': repo_root / '.env.example',
        'ad_units_spec': repo_root / 'store-assets' / 'admob' / 'ad-units-to-create.json',
    }
    return {
        'env_android_app_id': os.environ.get('TRIVENSE_ADMOB_ANDROID_APP_ID', '').strip() or None,
        'console_url': f'https://admob.google.com/v2/apps/{TRIVENSE_CONSOLE_APP_ID}/adunits/list',
        'files': {k: str(v.relative_to(repo_root)) if v.exists() else None for k, v in paths.items()},
    }
